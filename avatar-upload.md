# 头像上传闭环

## 项目地址

- 前端：`D:\study\my-workspace\wechat-workspace\e-commerce-uniapp`
- 后端：`D:\study\my-workspace\wechat-workspace\e-commerce-boot`

## 背景（待办来源）

uni-app 电商项目（`e-commerce-uniapp` 前端 + `e-commerce-boot` 后端）中，微信登录流程已跑通，
但「获取用户信息」按钮选的头像没有闭环：

- 前端 `pages/index/index.vue` 的 `onChooseAvatar` 只把头像存到本地临时地址 `avatarUrl`；
- `doLogin` 只提交 `code`，头像没上传；
- 登录后 `userInfo.avatar` 仍是 `null`。

> 文档更正记录：本文件早期版本按 `MemberController` / `MemberProfileVO` / `/api/member/**` 记录，
> 与后端实际实现（`ecommerce.user` 包，`UserController`，`/api/user/**`）不符，已按 `docs/openapi.yaml`
> 和源码更正。前端 `server-api.js` 曾照抄错误路径写成 `/api/member/profile`、`/api/member/avatar`，会导致 404，同批已修正。

## 根因

`chooseAvatar` 返回的 `avatarUrl` 是小程序**本地临时文件路径**，后端拿这个路径访问不到文件。
必须用 `uni.uploadFile` 把文件二进制上传到后端存储，后端返回一个可访问的 URL，再写进 `user.avatar`。

## 接口（权威定义见 `e-commerce-boot/docs/openapi.yaml`）

| 接口 | 方法 | 入参 | 返回 |
| --- | --- | --- | --- |
| `/api/wxlogin` | POST | `{ code }` | `Result<WxLoginVO>`：`token` / `id` / `name` / `avatar` |
| `/api/user/profile` | GET | 无（用户 id 从 token 取） | `Result<UserProfileVO>`：`id` / `name` / `avatar` / `phone` / `sex` / `idNumber` / `createTime` |
| `/api/user/avatar` | POST | `multipart/form-data`，字段名 `file` | `Result<String>`：完整头像 URL |

- 两个 `avatar` 字段返回的都是**完整访问 URL**（后端 `UserController.fullUrl` 按当前请求的
  `scheme://Host` + 相对路径拼好），前端直接展示，不需要再拼域名。
- 鉴权：`JwtInterceptor` 拦 `/api/**`，豁免清单是 `WebMvcConfig.EXCLUDE_AUTH_PATHS`
  = `/api/wxlogin`、`/api/login`。失败返回真实 HTTP 状态码（400/401/403/413/500），响应体仍是 `Result`。
- token 由 `JwtUtil.generateUserToken(userId)` 签发，有效期 7 天（`jwt.expire: 604800`）。

## 后端实现要点（已完成）

- 包结构 `ecommerce.user`：`UserController` / `WxLoginController` / `UserServiceImpl` / `UserMapper` / `User` 实体。
- `UserMapper` 提供 `findByOpenid` / `insertUser` / `findById` / `updateAvatar`；
  `updateAvatar` 的 SQL 在 `resources/mappers/user/UserMapper.xml`，同时刷新 `update_time`。
- 当前用户 id 从 `UserContext.getUserId()` 取（由拦截器解析 token 后写入），**不由前端传 id**，防越权改他人头像。
- 文件落盘目录 `upload/avatar/`，文件名 `{userId}_{时间戳}.{后缀}`，防冲突。
- 类型白名单 `image/png`→`png`、`image/jpeg`→`jpg`、`image/gif`→`gif`、`image/webp`→`webp`。
  不用 `contentType.startsWith("image/")`：那会放行 `image/svg+xml`，SVG 可内嵌脚本，
  配合 `/upload/**` 的静态直出就是 XSS。
- 大小限制来自 `application.yml` 的 `spring.servlet.multipart`：单文件 2MB、整请求 3MB，
  超限由 `GlobalExceptionHandler` 转成 413 + 可读提示。
- 库里只存相对路径 `/upload/avatar/xxx`，域名拼接在 Controller 层。
- 静态映射：`WebMvcConfig` 把 `/upload/**` 映射到 `file:upload/`，前端才能通过 URL 访问图片。
- 上传成功后删除旧头像文件（`deleteOldAvatarFile`，只处理 `/upload/avatar/` 开头的本地路径，外部 URL 不碰）。

## 前端实现要点（已完成）

- `utils/server-api.js`：`request`（统一带 `Bearer {token}`、统一错误提示）、`wxLogin`、`getProfile`、`uploadAvatar`。
- `utils/token.js`：`getToken` / `setToken` / `clearToken`，token 存本地缓存。
- `pages/index/index.vue`：
  - `onChooseAvatar` → `handleLogin` → `wxLogin(code)` → `setToken` → `fetchProfile()`；
  - `fetchProfile()` 拉资料成功则进入登录态，若此前选过头像就接着 `saveAvatar()` 上传；
  - 拉取失败视为 token 失效，`clearToken()` 回退到未登录态；
  - `handleLogout` 清 token 和本地 `userInfo`。

## 剩余待办

- **后端 `.gitignore` 还没有 `upload/`**，上传的头像文件会被 git 跟踪。需要加一行忽略。
- 生产环境建议把本地磁盘换成 OSS；届时 `uploadAvatar` 返回相对路径的约定和
  `deleteOldAvatarFile`「只删本地文件」的判断要一并调整。

## 涉及文件

后端（`e-commerce-boot`）：
- `src/main/java/ecommerce/user/controller/UserController.java`
- `src/main/java/ecommerce/user/controller/WxLoginController.java`
- `src/main/java/ecommerce/user/service/impl/UserServiceImpl.java`
- `src/main/java/ecommerce/user/mapper/UserMapper.java` + `src/main/resources/mappers/user/UserMapper.xml`
- `src/main/java/ecommerce/configuration/WebMvcConfig.java`（拦截器豁免清单、静态资源映射）
- `src/main/resources/application.yml`（multipart 大小限制）
- `docs/openapi.yaml`（接口文档，改动接口时同步更新）

前端（`e-commerce-uniapp`）：
- `utils/server-api.js`
- `utils/token.js`
- `pages/index/index.vue`

## 注意事项

- 上传接口要走 JWT 鉴权（**不要**像 `/api/wxlogin` 那样排除），用户 id 必须从 token 取。
- 只允许图片类型，限制大小，防止任意文件上传。
- 本地存储要 `.gitignore` 上传目录；生产建议换 OSS。
