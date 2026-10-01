# 发现与决策

## 需求

- 小程序端微信登录：`wx.login()` 拿 code → 后端换 token → 后续请求带 `Bearer {token}`。
- 头像闭环：`chooseAvatar` 只给本地临时路径，必须用 `uni.uploadFile` 传到后端，拿回可访问 URL。
- 昵称闭环：小程序 `type="nickname"` 输入框拿到昵称后，调 `POST /api/user/name` 存库。
- 前端所有请求路径必须与后端实际接口一致（这是本轮暴露出的主要问题）。
- **游客模式**：打开小程序先进首页浏览，加购/下单才要求登录；微信登录走静默 `uni.login`，
  不弹授权框，需要用户主动操作的只有头像（`chooseAvatar`）和昵称（`type="nickname"`）。

## 研究发现

### 后端微服务架构（2026-09-30 拆分，本次对接确认）

后端 `e-commerce-boot` 已拆成 Maven 多模块 8 服务（1 网关 + 7 业务 + common），端口规划：

| 服务 | 端口 | 职责 |
|------|------|------|
| gateway | 8080 | API 网关，`/api/**` → `lb://user-service` |
| auth-service | 9001 | 管理员登录（占位） |
| shop-service | 9002 | 多租户沙箱（占位） |
| product-service | 9003 | 商品（占位） |
| order-service | 9004 | 订单（占位） |
| aftersale-service | 9005 | 售后（占位） |
| user-service | 9006 | 会员/小程序登录（**已承载业务**） |
| file-service | 9007 | 文件（占位） |

- 小程序用户模块从根 `src/` 迁入 `user-service/`，包名不变 `ecommerce.user`。
- **前端对接约定**（后端 `task_plan.md` 已定）：接口路径 `/api/**` 不变，前端 baseURL 指向网关 8080；
  各微服务端口对前端透明，前端**无需也不应**直连各服务端口。
- gateway 路由前缀为 `spring.cloud.gateway.server.webflux.routes`（Gateway 5.x 新前缀，替代旧的
  `spring.cloud.gateway.routes`），已通过本地 maven 仓库 `spring-cloud-gateway-server-webflux-5.0.3.jar`
  的配置元数据确认合法。

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

### 后端实现（`e-commerce-boot/user-service`，包 `ecommerce.user`）

- 目录：`ecommerce.user.controller.UserController`（`@RequestMapping("/api/user")`）、
  `WxLoginController`（`@RequestMapping("/api")`）、`UserServiceImpl`、`UserMapper`、`User`、`UserProfileVO`。
- **没有 `member` 包**，`Member*` 相关命名全是早期推演的产物。
- 鉴权：`JwtInterceptor` 拦 `/api/**`，豁免清单 `WebMvcConfig.EXCLUDE_AUTH_PATHS`
  = `/api/wxlogin`、`/api/login`、`/api/logout` + C 端只读商品路径（本轮新增，见下节）。
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

### 后端游客模式改动（本轮检查，工作区未提交）

按「打开小程序先进首页浏览，加购/下单才要登录」的需求，后端在 common 模块扩了免登录清单：

- `WebMvcConfig.java:28-34` `EXCLUDE_AUTH_PATHS` 新增 C 端只读商品路径：
  `/api/products`、`/api/products/**`、`/api/categories`、`/api/categories/**`、
  `/api/tags`、`/api/tags/**`（裸路径=列表，`/**`=详情等子路径）；同时补了 `/api/logout`。
- 清单是 Ant 风格匹配，`OpenApiConfig.isExcludedFromAuth`（`:130-134`）引用同一份
  `EXCLUDE_AUTH_PATHS`，两处不会各自漂移。
- 后台商品管理走 `/api/admin/**`（`JwtInterceptor.ADMIN_PATH`），不在豁免内。

**商品链路（后端本轮已完成）**：

| 环节 | 状态 | 位置 |
|------|------|------|
| 免登录白名单 | ✅ | `WebMvcConfig.java:28-34` |
| 商品接口实现 | ✅ | `ProductController.java`：`/api/products`、`/api/products/{id}`、`/api/categories`、`/api/tags`，返回 `Result<List<VO>>` |
| 网关路由 | ✅ | `gateway/application.yml` 新增 product-service，放在 `Path=/api/**` 通配**之前**（具体规则优先匹配） |
| 接口文档 | ✅ | `docs/openapi.yaml` 补了上述 4 个商品接口 |

**401 / 403 语义**（`JwtInterceptor.java`，前端状态码处理即按此）：

- 无 token / token 无效或过期 → **401**（`preHandle:49-60`）
- token 类型不匹配（如顾客 token 调 `/api/admin/**`）→ **403**（`:63-68`）
- 失败响应体仍是 `Result{success,data,message}`，只是 HTTP 状态码为 401/403（`:20-21` 注释）

### 前端实现（`e-commerce-uniapp`）

- `utils/token.js`：`getToken` / `setToken` / `clearToken`，key 为 `'token'`。
- `utils/server-api.js`：`BASE_URL = 'http://127.0.0.1:8080'`，
  导出 `request` / `wxLogin` / `getProfile` / `updateName` / `uploadAvatar`。
- `request()` 已补 HTTP 状态码处理（本轮）：401/403 → `clearToken()` 并抛
  `{ statusCode, message }`；其余非 2xx → 抛 `{ statusCode, message: '请求失败（{code}）' }`；
  2xx 才看 body 的 `success`。此前只判 body，状态码全部丢弃。
- `utils/product-api.js`（本轮新建）：商品/分类浏览接口 `getProducts` / `getProductDetail` /
  `getCategories`，内部复用 `server-api.js` 的 `request`。单开一个文件，跟用户模块的接口分开。
- `utils/auth.js`（本轮新建）：`ensureLogin()` —— 需要登录的操作前调用，未登录则
  `uni.login` 静默拿 code → `wxLogin` 换 token → 写 store。全程无授权弹窗。
- `pages/index/index.vue`（本轮重写为商品橱窗）：顶部 `swiper` 轮播图 + 商品列表。
  - 轮播图**后端没有接口**，用三个渐变色块占位（不依赖图片资源，`static/` 里也没图）。
  - 商品列表 `onLoad` 调 `getProducts()`（免登录）。
  - 「加入购物车」按钮 `@click` 里先 `await ensureLogin()` 再调加购接口 ——
    **加购接口（order-service）尚未实现**，目前只弹 toast 占位。
- `pages/my/my.vue`（本轮重写）：承接原 index.vue 的登录 UI（首页不再有登录入口）。
  未登录显示「微信登录」按钮（静默登录）；已登录显示头像 + 昵称 + 退出登录，
  点头像触发 `chooseAvatar` 换头像（微信要求必须用户点击）→ `uploadAvatar` 上传换 URL。
- `App.vue` 的 `globalData.userInfo` 是 `null`，全项目未使用。
- 底部导航（本轮新增）：`pages.json` 加 `tabBar`（首页/分类/购物车/我的），
  新建 `pages/category/category.vue`、`pages/cart/cart.vue` 两个占位页。
  `static/` 下没有图标文件，先出纯文字版；补图后给每项加 `iconPath` / `selectedIconPath`。
  tabBar 页面之间跳转必须用 `uni.switchTab`，`navigateTo` 会失败。
- `store/user.js`（本轮补齐）：Pinia options store —— state `{ token, userInfo }`、
  getter `isLogin`、action `setToken` / `setUserInfo` / `setAvatar` / `logout`，
  与 `index.vue` 实际用到的 6 个成员一一对应。两个坑：
  `isLogin` 基于 state 而非直接读 Storage（Pinia getter 不依赖 state 会永久缓存，登出后不刷新）；
  `userInfo` 初始 `{}` 而非 `null`（模板里读 `userInfo.avatar` 会报错）。

### 顶部导航栏机型适配（2026-10-01，`pages/index/component/TopBar.vue`）

- 自定义导航栏（`navigationStyle: custom`）需自行避让状态栏与微信胶囊按钮，尺寸一律运行时现取：
  `statusBarHeight`、`getMenuButtonBoundingClientRect()`、`windowWidth`、`env(safe-area-inset-bottom)`。
- **胶囊反推内容区高度**：`navContentHeight = (menuRect.top - statusBarHeight) * 2 + menuRect.height`
  （胶囊在内容区垂直居中，上留白×2 + 胶囊高）。华为部分机型 `menuRect.top` 异常偏小 →
  反推高度 < 搜索框 30px → 上下裁切。修复：`Math.max(44, ...)` 兜底。
- **右侧避让胶囊**：`rightSafeArea = windowWidth - menuRect.left` 让搜索框右边缘精确等于胶囊左边缘
  （间距 0）。华为胶囊偏右时贴边明显。修复：`+ 8` px 固定间距。
- **兜底分两层**：默认值兜底（`data` 里 `navContentHeight: 44`、`rightSafeArea: 0`，非微信/无胶囊时用）
  + 下限兜底（`Math.max(44, ...)` 抗异常偏小）。
- `safeAreaInsets` 未引入：顶部=statusBarHeight、底部=env() 已覆盖，左右竖屏为 0。

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
| 前端统一走网关 8080，不直连各微服务端口 | 后端已定「路径 `/api/**` 不变，前端 baseURL 指向网关」；端口差异由网关收敛 |
| `navContentHeight` 用 `Math.max(44, 反推值)` 兜底 | 华为部分机型 `menuRect.top` 异常偏小，反推高度小于搜索框会上下裁切；44 与微信标准内容区高度及 data 默认值一致 |
| `rightSafeArea` 在胶囊避让基础上 +8px | 原公式让搜索框右边缘精确贴胶囊（间距 0），华为胶囊偏右时贴边明显；4~8px 为推荐区间，取 8 保底 |

## 遇到的问题

| 问题 | 解决方案 |
|------|---------|
| 前端请求 `/api/member/profile`、`/api/member/avatar` 会 404 | 改为 `/api/user/profile`、`/api/user/avatar` |
| `avatar-upload.md` 按 `MemberController` / `/api/member/**` 记录，与后端不符 | 按实际接口与包名重写，并加更正记录 |
| `uni.setStorageSync('userInfo', ...)` 写了从不读（死代码） | 已记录，用户决定不修 |
| ~~昵称永远显示「微信用户」~~ | **已解决**：后端补 `/api/user/name`，前端补 `type="nickname"` 输入框 |
| 切华为机型搜索框贴边 | `rightSafeArea` 补 +8px 间距 |
| 切华为机型搜索框上下被裁切 | `navContentHeight` 加 `Math.max(44, ...)` 下限 |

## 资源

### 项目根目录

| 项目 | 绝对路径 |
|------|---------|
| 后端（Spring Boot） | `D:\study\my-workspace\wechat-workspace\e-commerce-boot` |
| 前端（uni-app） | `D:\study\my-workspace\wechat-workspace\e-commerce-uniapp` |

### 关键文件

后端（`D:\study\my-workspace\wechat-workspace\e-commerce-boot`）：
- 接口文档：`docs/openapi.yaml`
- 源码（已拆微服务，user 模块在 `user-service`）：`user-service/src/main/java/ecommerce/user/`
  （含 `dto/UpdateNameDTO.java`）
- 配置：`user-service/src/main/resources/application.yml`（multipart 大小限制）、
  `user-service/src/main/resources/application-dev.yml`（DB / 微信 / JWT 密钥，已被 gitignore）、
  网关路由：`gateway/src/main/resources/application.yml`

前端（`D:\study\my-workspace\wechat-workspace\e-commerce-uniapp`）：
- `utils/server-api.js`、`utils/token.js`
- `pages/index/index.vue`
- 前端侧记录：`avatar-upload.md`

### 本地服务地址

- 网关（前端 baseURL）：`http://127.0.0.1:8080`（路由 `/api/**` → user-service 9006）
- 头像静态资源：`http://127.0.0.1:8080/upload/avatar/{userId}_{时间戳}.{后缀}`
- 各微服务端口见上文「后端微服务架构」表（前端无需直连）

## 待办（用户决定暂不处理）

`pages/index/index.vue` 检查出的 8 条，按「跑不通」优先级排序后仅第 3 条之外均为可选：

1. ~~昵称永远不会显示（功能未完成，需前后端都动）~~ **已解决**（后端 0928 补接口，前端本轮接完）
2. 已登录用户无换头像入口（`chooseAvatar` 按钮只在未登录分支）—— 昵称已无此问题，头像仍缺
3. `uni.setStorageSync('userInfo', ...)` 是死代码，从无读取
4. `uploadAvatar` 的 `JSON.parse` 未兜底，非 JSON 响应会静默失败（`server-api.js:61`）
5. `uploadAvatar` 未判断 token 是否存在（`server-api.js:57`）
6. `.avatar-btn` 的 `border: none` 去不掉小程序 button 的 `::after` 边框（`index.vue:146`）
7. ~~`fetchProfile` 失败无条件 `clearToken()`，网络抖动会误清有效 token（`index.vue:101`）~~
   **已解决**（本轮）：`request()` 补状态码后，`index.vue` 的 catch 改为只在 `statusCode`
   为 401/403 时 `logout()`，网络抖动/网关 502 保留登录态。
8. `doLogin` 遗留调试日志 `console.log`（`index.vue:74`）
