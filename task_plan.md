# 任务计划：微信登录 + 头像 / 昵称闭环

将此文件作为任务的持久化路线图。在开始复杂工作前创建，并在阶段变化时及时更新。

## 目标

前端 `e-commerce-uniapp` 的微信登录与用户资料链路，与后端 `e-commerce-boot` 的 `/api/wxlogin`、
`/api/user/profile`、`/api/user/avatar`、`/api/user/name` 四个接口完全对齐，
登录后能拉取、展示并修改含头像和昵称的用户资料。

## 下一步

顶部导航栏适配已完成，待微信开发者工具切华为机型实测确认；端到端跑通仍依赖后端把
Nacos + user-service + gateway 三个服务启动（前端无需再改代码）。

## 当前阶段

阶段 9：顶部导航栏机型适配（已完成）

## 各阶段

### 阶段 1：现状排查
- [x] 定位前端登录/头像相关文件
- [x] 确认 `utils/server-api.js`、`utils/token.js` 的完整实现
- [x] 确认 `pages/index/index.vue` 的调用链
- [x] 确认后端包结构与实际接口
- **状态：** complete

### 阶段 2：接口对齐
- [x] 读后端接口文档 `e-commerce-boot/docs/openapi.yaml`
- [x] 对照后端源码 `UserController` / `WxLoginController` 验证文档
- [x] 发现前端路径与后端不符（`/api/member/*` vs `/api/user/*`）
- **状态：** complete

### 阶段 3：前端修正
- [x] `getProfile` 路径改为 `/api/user/profile`
- [x] `uploadAvatar` 路径改为 `/api/user/avatar`
- [x] 全项目复查，确认无残留 `/api/member`
- **状态：** complete

### 阶段 4：文档更正
- [x] 重写 `avatar-upload.md`，按实际接口/类名/包名更正
- [x] 补充文档更正记录，说明早先按 `/api/member/**` 记错的原因
- **状态：** complete

### 阶段 5：代码检查
- [x] 检查 `pages/index/index.vue` 完整逻辑
- [x] 比对后端返回结构与前端取值
- [x] 列出 8 条问题（功能缺口 2 条 + 代码问题 6 条）
- [x] 用户决定「能跑通就行了」，全部不修
- **状态：** complete

### 阶段 6：收尾
- [x] 生成 `task_plan.md` / `findings.md` / `progress.md`
- [x] 将 `utils/` 纳入 git 跟踪（已确认：`git ls-files utils/` 已含两个文件）
- **状态：** complete

### 阶段 7：昵称前端接入
- [x] 探查后端本次改动，确认新接口 `POST /api/user/name`
- [x] `utils/server-api.js` 新增 `updateName(name)`
- [x] `pages/index/index.vue` 加 `type="nickname"` 输入框（未登录/已登录两个分支）
- [x] 回写展示 + 退出登录时清理
- [x] 更新三个规划文件
- **状态：** complete

### 阶段 8：前端对接微服务
- [x] 探索后端微服务拆分：8 服务（gateway 8080 + 7 业务 9001~9007），仅 user-service 承载业务
- [x] 确认前端对接方式：统一走网关 8080，路径 `/api/**` 不变，不直连各服务端口
- [x] 确认 `utils/server-api.js` 的 `BASE_URL` 已指向网关，四个接口路径与 user-service 一致
- [x] 在 `BASE_URL` 上方补注释，固化「统一走网关」约定与端口规划表
- [x] 验证 gateway 路由前缀 `spring.cloud.gateway.server.webflux.routes` 合法（gateway 5.0.3 配置元数据确认）
- [x] 更新三个规划文件
- **状态：** complete

### 阶段 9：顶部导航栏机型适配
- [x] 澄清 `safeAreaInsets` 与本组件关系（顶部=statusBarHeight、底部=env()，无需引入）
- [x] 修复搜索框贴边：`rightSafeArea = windowWidth - menuRect.left + 8`
- [x] 修复搜索框上下裁切：`navContentHeight = Math.max(44, ...)`
- [x] 更新三个规划文件
- **状态：** complete

## 关键问题

1. **昵称要不要做？** ~~后端无更新昵称的接口，前端也没有 `nickname` 输入入口。~~
   **已解决**：后端已补 `POST /api/user/name`，前端已接 `type="nickname"` 输入框。
2. **已登录用户怎么换头像？** 目前 `chooseAvatar` 按钮只在未登录分支渲染，登录后没有入口。
   （昵称已不存在此问题：两个分支都放了输入框）
3. ~~**`utils/` 未纳入 git**，是否提交？~~ **已解决**：`git ls-files utils/` 确认两个文件已跟踪。

## 已做决策

| 决策 | 理由 |
|------|------|
| 以 `docs/openapi.yaml` + 后端源码为接口权威依据 | `avatar-upload.md` 早先按 `MemberController` 推演，与实际不符，导致了 404 |
| 前端路径 `/api/member/*` 改为 `/api/user/*` | 后端无 `member` 包，原路径会 404，属于"跑不通"，必须修 |
| 重写 `avatar-upload.md` 而非删除 | 文件仍有参考价值（记录了白名单、大小限制等实现细节），但内容必须准确 |
| 检查出的 8 条问题一律不修 | 用户明确表示「能跑通就行了」 |
| 所有规划文件放在项目根目录 | `init-session.sh` 的默认行为，本项目尚无 `.planning/` 目录 |
| 昵称输入框在未登录/已登录两个分支各放一个 | 与既有的「登录前选头像、登录后上传」模式对称；只放未登录分支的话，登录后想改昵称只能先退出 |
| 未登录时填的昵称只暂存在 `nickname`，登录后再提交 | 提交接口要带 token，登录前调用必然 401 |
| 昵称与后端一致时不重复提交 | 避免每次 `onLoad` 恢复登录态都白跑一次写库 |
| 前端统一走网关 8080，不直连各微服务端口 | 后端已定「路径 `/api/**` 不变，前端 baseURL 指向网关」；各模块端口由网关收敛，前端无需感知 |

## 遇到的错误

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 前端请求路径 `/api/member/profile` 导致 404 | 1 | 改读 `docs/openapi.yaml`，按 `/api/user/profile` 修正 |
| 照抄 `avatar-upload.md` 的过时结论 | 1 | 该文件按 `MemberController` 记的，已按实际接口重写 |
| `utils/server-api.js` 被截断，`uploadAvatar` 整个丢失 | 1 | 未自行改回，报告后由用户恢复 |
| `GET /api/user/profile` 返回 **403**（非 401） | 1 | token 签名/过期都通过，只是 `type` 声明不符：本地存的是旧版后端签发的 `"member"` token，当前要求 `"user"`。清 Storage 重登解决 |

## 备注
- 随着工作推进，将阶段状态从 `pending` 更新为 `in_progress`，再更新为 `complete`。
- 做重大决策前，重新读取目标和下一步。
- 及时记录错误，避免重复失败的方法。
- **本项目约定：能跑通就行，不主动堆健壮性/边界处理类改动。**
