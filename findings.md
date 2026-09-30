# 发现与决策

## 需求

- 小程序端微信登录：`wx.login()` 拿 code → 后端换 token → 后续请求带 `Bearer {token}`。
- 头像闭环：`chooseAvatar` 只给本地临时路径，必须用 `uni.uploadFile` 传到后端，拿回可访问 URL。
- 昵称闭环：小程序 `type="nickname"` 输入框拿到昵称后，调 `POST /api/user/name` 存库。
- 前端所有请求路径必须与后端实际接口一致（这是本轮暴露出的主要问题）。

## 研究发现

### 后端接口（权威来源：`e-commerce-boot/docs/openapi.yaml`）

| 接口 | 方法 | 入参 | 返回 |
|------|------|------|------|
| `/api/wxlogin` | POST | `{ code }` | `Result<WxLoginVO>`：`token` / `id` / `name` / `avatar` |
| `/api/user/profile` | GET | 无（id 从 token 取） | `Result<UserProfileVO>`：`id` / `name` / `avatar` / `phone` / `sex` / `idNumber` / `createTime` |
| `/api/user/avatar` | POST | `multipart/form-data` 字段 `file` | `Result<String>`：完整头像 URL |
| `/api/user/name` | POST | `application/json`：`{ name }` | `Result<String>`：去除首尾空格后的昵称 |

- 统一响应体 `Result<T> { success, data, message, code }`。
- **失败时返回真实 HTTP 状态码**（400/401/403/413/500），不是恒 200，响应体仍是 `Result`。
- 两个 `avatar` 字段都是**完整 URL**（`UserController.fullUrl` 按当前请求 `scheme://Host` 拼），前端不要再拼域名。

### 后端实现（`e-commerce-boot`，包 `ecommerce.user`）

- 目录：`ecommerce.user.controller.UserController`（`@RequestMapping("/api/user")`）、
  `WxLoginController`（`@RequestMapping("/api")`）、`UserServiceImpl`、`UserMapper`、`User`、`UserProfileVO`。
- **没有 `member` 包**，`Member*` 相关命名全是早期推演的产物。
- 鉴权：`JwtInterceptor` 拦 `/api/**`，豁免清单 `WebMvcConfig.EXCLUDE_AUTH_PATHS`
  = `/api/wxlogin`、`/api/login`。
- token：`JwtUtil.generateUserToken(userId)`，有效期 7 天（`jwt.expire: 604800`）。
- 当前用户 id：`UserContext.getUserId()`，由拦截器解析 token 后写入，**不由前端传参**。
- 上传落盘：`upload/avatar/`，文件名 `{userId}_{时间戳}.{后缀}`。
- 类型白名单：`image/png`→png、`image/jpeg`→jpg、`image/gif`→gif、`image/webp`→webp。
  不用 `startsWith("image/")` 是因为会放行 `image/svg+xml`，配合 `/upload/**` 静态直出即 XSS。
- 大小限制：`application.yml` 的 `spring.servlet.multipart` 单文件 2MB、整请求 3MB，超限走
  `GlobalExceptionHandler` 转 413。
- 静态映射：`WebMvcConfig` 把 `/upload/**` → `file:upload/`。
- 上传成功后会删旧头像文件（只处理 `/upload/avatar/` 开头的本地相对路径）。
- `UserMapper`：`findByOpenid` / `insertUser` / `findById` / `updateAvatar`；
  XML 里表名用反引号包 `` `user` ``（`user` 是 MySQL 关键字）。
- **后端 `.gitignore` 里没有 `upload/`**，头像文件会被 git 跟踪。
- ~~**后端没有任何更新昵称的代码**~~ **已过时**：0928 后端补了昵称链路，见下节。

### 后端昵称链路（本轮新增，工作区未提交）

- `ecommerce.user.dto.UpdateNameDTO`（新文件）：单个 `name` 字段，`@Schema` 标注 1~32 字符。
- `UserController.updateName`：`@PostMapping("/name")` → `@RequestBody UpdateNameDTO`，
  用户 id 取自 `UserContext.getUserId()`（**不由前端传**），返回 `Result<String>`。
- `UserServiceImpl.updateName` 四步校验：
  `null` / `isBlank` → 400「昵称不能为空」；`trim()` 后 `length() > 32` → 400「昵称不能超过 32 个字符」；
  `findById` 为 null → 401「用户不存在」；通过后写库并**返回 trim 后的昵称**。
- 上下限与库表对齐：`name varchar(32)`，所以长度上限是 32 个字符而不是字节。
- `UserMapper.updateName` + `UserMapper.xml`：`update \`user\` set name = #{name}, update_time = now() where id = #{id}`。
- `openapi.yaml`：新增 `/api/user/name`（401/403/400/500 均列出），
  `ResultString.data` 的描述改成「头像完整访问 URL 或去除首尾空格后的昵称」。

### 前端实现（`e-commerce-uniapp`）

- `utils/token.js`：`getToken` / `setToken` / `clearToken`，key 为 `'token'`。
- `utils/server-api.js`：`BASE_URL = 'http://127.0.0.1:8080'`，
  导出 `request` / `wxLogin` / `getProfile` / `updateName` / `uploadAvatar`。
- `pages/index/index.vue` 调用链：
  `onChooseAvatar` → `handleLogin` → `uni.login` → `doLogin(code)` → `wxLogin` → `setToken`
  → `fetchProfile()` →（若选过头像）`saveAvatar()`、（若填过昵称）`saveName()`。
- 昵称入口：`<input type="nickname">`，未登录分支和已登录分支各一个，共用 `nickname` 一个数据字段。
  `@blur` / `@confirm` → `onNicknameBlur`：trim 后为空或与当前值相同就跳过；
  已登录直接 `saveName()`，未登录只暂存，等登录后由 `fetchProfile` 里的比对触发提交。
- `onLoad` 里 `if (getToken()) fetchProfile()` 恢复登录态。
- `App.vue` 的 `globalData.userInfo` 是 `null`，全项目未使用。

## 技术决策

| 决策 | 理由 |
|------|------|
| 以 `openapi.yaml` + 后端源码为接口权威依据 | 文档与实际代码一致，而 `avatar-upload.md` 是过时推演 |
| `/api/member/*` → `/api/user/*` | 后端无 `member` 包，不改就是 404 |
| 重写而非删除 `avatar-upload.md` | 其中白名单、大小限制、删旧文件等实现细节仍有参考价值 |
| 检查出的 8 条问题不修 | 用户明确「能跑通就行了」 |
| 昵称用 `type="nickname"` 原生输入框，不用 `getUserProfile` | `getUserProfile` 自 2022-10 起昵称返回「微信用户」占位，官方指定用 `type="nickname"` |
| 两个分支各放一个昵称输入框（而非抽成一个） | 两个分支本就互斥，抽出去要额外的 `v-if` 判断位置，不如就地各放一行直观 |
| 昵称提交走 `request` 而非 `uploadFile` | 纯 JSON 字段，不需要 multipart |

## 遇到的问题

| 问题 | 解决方案 |
|------|---------|
| 前端请求 `/api/member/profile`、`/api/member/avatar` 会 404 | 改为 `/api/user/profile`、`/api/user/avatar` |
| `avatar-upload.md` 按 `MemberController` / `/api/member/**` 记录，与后端不符 | 按实际接口与包名重写，并加更正记录 |
| `uni.setStorageSync('userInfo', ...)` 写了从不读（死代码） | 已记录，用户决定不修 |
| ~~昵称永远显示「微信用户」~~ | **已解决**：后端补 `/api/user/name`，前端补 `type="nickname"` 输入框 |

## 资源

### 项目根目录

| 项目 | 绝对路径 |
|------|---------|
| 后端（Spring Boot） | `D:\study\my-workspace\wechat-workspace\e-commerce-boot` |
| 前端（uni-app） | `D:\study\my-workspace\wechat-workspace\e-commerce-uniapp` |

### 关键文件

后端（`D:\study\my-workspace\wechat-workspace\e-commerce-boot`）：
- 接口文档：`docs/openapi.yaml`
- 源码：`src/main/java/ecommerce/user/`（含新文件 `dto/UpdateNameDTO.java`）
- 配置：`src/main/resources/application.yml`（multipart 大小限制）、
  `src/main/resources/application-dev.yml`（DB / 微信 / JWT 密钥，已被 gitignore）

前端（`D:\study\my-workspace\wechat-workspace\e-commerce-uniapp`）：
- `utils/server-api.js`、`utils/token.js`
- `pages/index/index.vue`
- 前端侧记录：`avatar-upload.md`

### 本地服务地址

- 后端：`http://127.0.0.1:8080`
- 头像静态资源：`http://127.0.0.1:8080/upload/avatar/{userId}_{时间戳}.{后缀}`

## 待办（用户决定暂不处理）

`pages/index/index.vue` 检查出的 8 条，按「跑不通」优先级排序后仅第 3 条之外均为可选：

1. ~~昵称永远不会显示（功能未完成，需前后端都动）~~ **已解决**（后端 0928 补接口，前端本轮接完）
2. 已登录用户无换头像入口（`chooseAvatar` 按钮只在未登录分支）—— 昵称已无此问题，头像仍缺
3. `uni.setStorageSync('userInfo', ...)` 是死代码，从无读取
4. `uploadAvatar` 的 `JSON.parse` 未兜底，非 JSON 响应会静默失败（`server-api.js:61`）
5. `uploadAvatar` 未判断 token 是否存在（`server-api.js:57`）
6. `.avatar-btn` 的 `border: none` 去不掉小程序 button 的 `::after` 边框（`index.vue:146`）
7. `fetchProfile` 失败无条件 `clearToken()`，网络抖动会误清有效 token（`index.vue:101`）
8. `doLogin` 遗留调试日志 `console.log`（`index.vue:74`）
