# 进度日志

## 会话 7：2026-10-02（前台分类组件）

### 当前状态
- **阶段：** 11 - 前台分类组件（进行中，展示层已完成）
- **开始时间：** 2026-10-02

### 背景

首页需要「金刚区」分类入口。先做前台分类面板 `CategoryPanel` 的展示层，数据后端化与跳转联动留待后续。

### 已执行操作

1. 新建 `components/CategoryPanel.vue`：6 分类（手机/笔记本/平板/相机/手表/耳机）宫格，3 列 × 2 行。
2. 图标方案两版：先试 iconfont 字体（`static/category/iconfont.css`，改 `font-family` 避开全局同名冲突），
   用户嫌字体图标单色难看，改用 png（`static/image/category/*.png` 6 张），
   `<image mode="aspectFit">` + `border-radius: 30rpx` 圆角。
3. `pages/index/index.vue` 局部注册 `CategoryPanel`（`import` + `components`），插到轮播图下方，
   加 `handleCategorySelect` 用 `switchTab` 跳分类页。
4. 排查两个编译坑：`@import` 相对路径（`../../` → `../`）；微信开发者工具「过滤无依赖文件」
   误删 uni-app 懒加载组件（报 `Component is not found`）。
5. 确认 `main.js` 的 `_component` 已改为 `component`（会话 6 遗留解决），`CustomSwiper` 全局注册正确。
6. 讨论前台分类后续三步：数据后端化 / 分类页 / 跳转联动；用户先聚焦"占位"（骨架屏方案已给出，未落地）。

### 改动的文件

| 文件 | 改动 |
|------|------|
| `components/CategoryPanel.vue` | 新建：6 分类宫格，png 图标 + 圆角，`$emit('select')` |
| `pages/index/index.vue` | 局部注册 CategoryPanel + 模板插入 + `handleCategorySelect` |
| `main.js` | 全局注册 CustomSwiper（`app.component`，会话 6 遗留已解决） |
| `static/image/category/*.png` | 6 张分类图标 |
| `task_plan.md` / `findings.md` / `progress.md` | 记录本轮 |

### 测试结果

| 测试 | 预期 | 实际 | 状态 |
|------|------|------|------|
| 首页显示分类面板 | 6 个分类图标 + 中文名 | 待微信开发者工具验证 | 待验证 |

### 遗留事项

- 金刚区数据后端化：接 `getCategories()` + 建 分类 id→png 映射（当前写死 6 项）。
- 分类页 `category.vue` 仍是占位；跳转联动（`switchTab` 不能带 query，需 store/Storage 传选中分类）。
- 骨架屏占位方案已讨论，未落地。

---

## 会话 6：2026-10-02（轮播图组件改名编译报错）

### 当前状态
- **阶段：** 10 - 轮播图组件改名编译报错（进行中）
- **开始时间：** 2026-10-02

### 背景

把首页轮播图抽成全局组件 `CustomSwiper`（原 `Swiper.vue` 改名），在 `main.js` 全局注册、
`pages/index/index.vue` 用 `<CustomSwiper />` 后，微信开发者工具先报编译错、再报运行错。

### 已执行操作

1. 定位第一个错误 `ENOENT: components/Swiper.wxml`：项目源码已无 `Swiper` 引用，但
   `unpackage/dist/dev/.sourcemap/mp-weixin/components/` 残留旧 `Swiper.js.map`
   （记录 `components/Swiper.vue`）—— 组件改名后编译缓存未清，增量编译仍去找旧组件。
   尝试删 `unpackage/dist` 被拒（`Device or resource busy`，微信开发者工具占用），
   结论为需关工具后清理重编译。
2. 定位第二个错误 `app._component is not a function`：`main.js:37` Vue3 分支误写
   `app._component('CustomSwiper', CustomSwiper)`，Vue3 正确 API 是 `app.component()`。
3. 用户要求更新三个规划文件（本文件 / `task_plan.md` / `findings.md`）。

### 改动的文件

| 文件 | 改动 |
|------|------|
| `main.js` | 第 37 行 `app._component` 应改 `app.component`（已定位，**代码未改**，待应用） |
| `task_plan.md` / `findings.md` / `progress.md` | 记录本轮两个错误与解决方案 |

### 测试结果

| 测试 | 预期 | 实际 | 状态 |
|------|------|------|------|
| 组件改名后编译 | 不再报 `Swiper.wxml` | 需清缓存重编译 | 待验证 |
| 首页轮播图运行 | 无 `_component` 报错 | `main.js:37` 修复后待验证 | 待验证 |

### 遗留事项

- ~~`main.js:37` 的 `app._component` → `app.component` 修复尚未应用~~ **已解决**（后续已改为 `app.component`）。
- 需关闭微信开发者工具，删除 `unpackage/dist` 后重新编译。

---

## 会话 5：2026-10-01（顶部导航栏机型适配）

### 当前状态
- **阶段：** 9 - 顶部导航栏机型适配（已完成）
- **开始时间：** 2026-10-01

### 背景

用户反馈自定义顶部导航栏 `TopBar.vue` 切换机型（尤其华为）时出现两个问题：搜索框贴边、搜索框被上下裁切。先澄清 `safeAreaInsets` 与本组件的关系，再定位到胶囊按钮反推逻辑在部分机型的数据异常。

### 已执行操作

1. 澄清 `safeAreaInsets`：顶部安全区已由 `statusBarHeight` 覆盖，底部由 `TabBar.vue` 的
   `env(safe-area-inset-bottom)` 覆盖，本项目无需再引入。
2. 定位「搜索框贴边」：`rightSafeArea = windowWidth - menuRect.left` 使搜索框右边缘精确等于
   胶囊左边缘（间距 0），华为胶囊偏右时贴边更明显。
3. 修复贴边：`rightSafeArea = sysInfo.windowWidth - menuRect.left + 8`（补 8px 间距）。
4. 定位「搜索框上下裁切」：`navContentHeight = (menuRect.top - statusBarHeight) * 2 + menuRect.height`
   反推依赖 `menuRect.top`，华为部分机型返回偏小，内容区高度 < 搜索框（60rpx=30px），上下被裁切。
5. 修复裁切：`navContentHeight = Math.max(44, ...)`，设 44px 下限（与 data 默认值一致）。
6. 更新三个规划文件。

### 改动的文件

| 文件 | 改动 |
|------|------|
| `pages/index/component/TopBar.vue` | `rightSafeArea` 加 8px 间距；`navContentHeight` 加 `Math.max(44, ...)` 下限；补注释 |
| `task_plan.md` / `findings.md` / `progress.md` | 按本轮改动更新 |

### 测试结果

| 测试 | 预期 | 实际 | 状态 |
|------|------|------|------|
| 华为机型搜索框与胶囊有间距 | 不贴边 | 待验证 | 待用户验证 |
| 华为机型搜索框完整显示 | 不被裁切 | 待验证 | 待用户验证 |

### 遗留事项

- 需在微信开发者工具切华为机型实测确认。
- 「四周留白」问题用户暂缓，未定位。

---

## 会话 4：2026-09-30（前端对接微服务）

### 当前状态
- **阶段：** 8 - 前端对接微服务（已完成）
- **开始时间：** 2026-09-30

### 背景

用户告知「后端已启用微服务，不同模块有不同端口」，要求前端对接，避免前端项目无法启动。

### 已执行操作

1. 探索后端 `e-commerce-boot`：已拆成 Maven 多模块 8 服务（gateway + 7 业务），端口规划
   gateway 8080 / auth 9001 / shop 9002 / product 9003 / order 9004 / aftersale 9005 / user 9006 / file 9007；
   其中仅 user-service 承载小程序登录/用户资料业务，其余为占位空壳。
2. 确认后端 `task_plan.md` 的前端对接约定：接口路径 `/api/**` 不变，前端 baseURL 指向网关 8080。
3. 核对前端 `utils/server-api.js`：`BASE_URL = 'http://127.0.0.1:8080'` 已指向网关，
   四个接口（`/api/wxlogin`、`/api/user/profile`、`/api/user/avatar`、`/api/user/name`）路径与
   user-service 的 `WxLoginController` / `UserController` 完全一致 → **前端无需改端口，已对接好**。
4. **`utils/server-api.js` 补注释**：在 `BASE_URL` 上方固化「统一走网关、各微服务端口对前端透明」
   的约定与端口规划表，方便后续对接商品/订单等模块时照此扩展（无逻辑改动）。
5. 验证 gateway 路由前缀：解压本地 maven 仓库 `spring-cloud-gateway-server-webflux-5.0.3.jar`，
   其 `spring-configuration-metadata.json` 含 `spring.cloud.gateway.server.webflux.routes`，
   → 后端 `gateway/application.yml` 的 `server.webflux.routes` 配置合法，路由能生效。
6. 顺带确认 `utils/` 已纳入 git（`git ls-files utils/` 含 `server-api.js`、`token.js`），
   早先记录的「utils 未跟踪」遗留已消除。
7. 更新 `task_plan.md` / `findings.md` / `progress.md`。

### 改动的文件

| 文件 | 改动 |
|------|------|
| `utils/server-api.js` | `BASE_URL` 上方补注释（端口规划表 + 统一走网关约定），无逻辑改动 |
| `task_plan.md` / `findings.md` / `progress.md` | 按本轮改动更新 |

### 测试结果

| 测试 | 预期 | 实际 | 状态 |
|------|------|------|------|
| 前端 `BASE_URL` vs 网关端口 | 8080 | `http://127.0.0.1:8080` 匹配 | 通过 |
| 前端四接口路径 vs user-service Controller | 一致 | 全部匹配 | 通过 |
| gateway 路由前缀是否合法 | `spring.cloud.gateway.server.webflux.routes` | gateway 5.0.3 元数据含该属性 | 通过 |
| 端到端（前端→网关→user-service） | 可跑通 | **未执行**（依赖后端 Nacos + user-service + gateway 启动） | 待用户验证 |

### 遗留事项

- **端到端未实测**：后端需先起 Nacos（`docker-compose.yml`）+ user-service（依赖 MySQL）+ gateway，
  前端才能从 8080 走通登录链路。前端侧无需再改。
- `index.vue` 剩余问题与 `avatar-upload.md` 接口表未加 `/api/user/name` 等旧遗留不变。

---

## 会话 3：2026-09-30（昵称前端接入）

### 当前状态
- **阶段：** 7 - 昵称前端接入（已完成）
- **开始时间：** 2026-09-30

### 背景

用户告知「后端已经把微信小程序登录的存储用户昵称的工作搞定了」，要求前端跟上，并更新三个规划文件。

### 已执行操作

1. 读后端工作区 diff（`git diff` + `git status`），确认本轮后端改动：
   - 新增 `src/main/java/ecommerce/user/dto/UpdateNameDTO.java`（未跟踪新文件）；
   - `UserController` 新增 `@PostMapping("/name")` → `updateName(@RequestBody UpdateNameDTO)`；
   - `UserService` / `UserServiceImpl` 新增 `updateName(Long userId, String name)`；
   - `UserMapper` + `UserMapper.xml` 新增 `updateName`（`set name = #{name}, update_time = now()`）；
   - `docs/openapi.yaml` 新增 `/api/user/name` 路径与 `UpdateNameDTO` schema。
2. 读前端 `pages/index/index.vue`、`utils/server-api.js`、`utils/token.js` 确认现状。
3. **`utils/server-api.js` 新增 `updateName(name)`**：`POST /api/user/name`，body `{ name }`，
   复用既有 `request` 封装（自动带 `Bearer {token}` + 统一错误 toast）。
4. **`pages/index/index.vue`**：
   - 模板：未登录分支、已登录分支各加一个 `<input type="nickname">`（微信昵称填写能力）；
   - `data` 加 `nickname` 字段，同时作为两个输入框的值来源；
   - `onNicknameBlur`：trim 后空值/无改动直接返回；已登录调 `saveName()`，未登录只暂存；
   - `saveName()`：调 `updateName`，成功回写 `nickname` / `userInfo.name` / Storage；
   - `fetchProfile()`：回填 `nickname`（后端有值优先），并在「本地填过且与后端不同」时提交；
   - `handleLogout()`：补 `this.nickname = ''`；
   - 样式：加 `.nickname-input`。
5. 全项目 grep `nickname|updateName|/api/user/name` 复查，无遗漏调用点。
6. 更新 `task_plan.md` / `findings.md` / `progress.md`。

### 改动的文件

| 文件 | 改动 |
|------|------|
| `utils/server-api.js` | 新增导出 `updateName(name)`（约 8 行） |
| `pages/index/index.vue` | 模板 2 处输入框、script 4 处（import / data / 3 个方法 / fetchProfile / logout）、样式 1 条 |
| `task_plan.md` / `findings.md` / `progress.md` | 按本轮改动更新 |

### 测试结果

| 测试 | 预期 | 实际 | 状态 |
|------|------|------|------|
| 前端路径 vs 后端 `@PostMapping("/name")` | 一致 | `POST /api/user/name` 匹配 | 通过 |
| 请求体字段 vs `UpdateNameDTO` | 一致 | 均为 `name`，`request` 默认 JSON content-type，`@RequestBody` 可绑定 | 通过 |
| 返回值处理 vs `ResultString` | `data` 为 trim 后的昵称 | `request` 返回 `res.data.data`，前端回写 `userInfo.name` | 通过 |
| 长度/空值校验是否前端也做了 | 不必做 | 空值前端直接跳过不提交；超长由后端 400，`request` 统一 toast 提示 | 通过 |
| 端到端实际调用（真机/模拟器） | — | **未执行**（本轮只做静态对齐，未跑开发者工具） | 待用户验证 |

### 遗留事项

- **端到端未实测**：需在微信开发者工具里走一遍「填昵称 → 选头像 → 登录 → 昵称入库」。
- `utils/` 目录仍未纳入 git（`utils/server-api.js`、`utils/token.js` 未跟踪），待用户确认是否提交。
- 后端 `.gitignore` 缺 `upload/`，头像文件会被 git 跟踪（后端侧问题）。
- `index.vue` 剩余问题：已登录无换头像入口、`setStorageSync('userInfo')` 死代码等（见 `findings.md`）。
- `avatar-upload.md` 的接口表**未**同步加 `/api/user/name`（用户本轮只要求更新三个规划文件）。

---

## 会话：2026-09-29

### 当前状态
- **阶段：** 6 - 收尾（阶段 1–5 已完成）
- **开始时间：** 2026-09-29

### 已执行操作

1. 定位前端登录/头像相关文件，读 `utils/token.js`、`utils/server-api.js`、`pages/index/index.vue`、`App.vue`。
2. 全项目 grep `getProfile`，确认定义在 `utils/server-api.js:45`，被 `pages/index/index.vue:29` 导入。
3. 读后端接口文档 `e-commerce-boot/docs/openapi.yaml`。
4. 对照后端源码验证：`UserController.java`（`@RequestMapping("/api/user")`、`@GetMapping("/profile")`、
   `@PostMapping("/avatar")`）、`WxLoginController.java`、`UserServiceImpl.java`、`WebMvcConfig.java`、
   `UserMapper.java` + `UserMapper.xml`、`application.yml`。
5. 确认后端**没有 `member` 包**（`ls src/main/java/ecommerce/` → `user` / `common` / `configuration` /
   `exception` / `interceptor` / `properties` / `utils`）。
6. **修正 `utils/server-api.js` 两处路径**：`/api/member/profile` → `/api/user/profile`；
   `/api/member/avatar` → `/api/user/avatar`。
7. 全项目复查，确认代码中已无 `/api/member`（仅 `avatar-upload.md` 残留两处）。
8. **重写 `avatar-upload.md`**：新增接口对照表，更正类名/包名（`Member*` → `User*`），
   把「待实施方案」改写为「实现要点」，补充文档更正记录与剩余待办。
9. 检查 `pages/index/index.vue`，列出 8 条问题。
10. 用户回复「能跑通就行了」，8 条全部不修。
11. 生成 `task_plan.md` / `findings.md` / `progress.md`。

### 改动的文件

| 文件 | 改动 |
|------|------|
| `utils/server-api.js` | 接口路径 2 处：`/api/member/*` → `/api/user/*` |
| `avatar-upload.md` | 按实际接口/包名/实现重写（此前为过时推演） |
| `task_plan.md` / `findings.md` / `progress.md` | 新建 |

`pages/index/index.vue` 本轮**未改动**（会话开始时 git 已标记为 modified，是此前的工作）。

### 测试结果

| 测试 | 预期 | 实际 | 状态 |
|------|------|------|------|
| 前端请求路径 vs 后端 `@RequestMapping` 比对 | 完全一致 | `/api/user/profile`、`/api/user/avatar` 均匹配 | 通过 |
| 后端返回字段 vs 前端取值比对 | 字段名一致 | `id` / `name` / `avatar` 均存在 | 通过 |
| 上传失败路径的提示链路 | 用户能看到提示 | 401/403/413 后端均返回 `Result` JSON，`uploadFile` 走 success → `data.success=false` → `reject` → toast | 通过 |
| 端到端实际调用（真机/模拟器） | — | **已执行**，见下方「会话 2」 | 通过 |
| 头像上传落盘 | 生成 `{userId}_{时间戳}.{后缀}` 文件 | 实际得到 `4_1790670510773.jpg`，与 `UserServiceImpl:132` 命名规则一致 | 通过 |

### 错误

| 错误 | 解决方案 |
|------|---------|
| 前端路径 `/api/member/*` 会 404 | 读 `openapi.yaml` 后改为 `/api/user/*` |
| 照抄 `avatar-upload.md` 的过时结论（该文件按 `MemberController` 推演） | 按后端源码与文档重写该文件，并加更正记录 |
| 执行 `init-session.sh --help` 时误将 `--help` 当作任务名初始化了三个文件 | 无实际影响，已直接覆写为真实内容 |

### 遗留事项

- `utils/` 目录仍未纳入 git（`utils/server-api.js`、`utils/token.js` 未跟踪），待用户确认是否提交。
- 后端 `.gitignore` 缺 `upload/`，头像文件会被 git 跟踪。
- `index.vue` 的 8 条问题（见 `findings.md`）用户决定不修。

---

## 会话 2：2026-09-29（403 排查 + 端到端跑通）

### 现象

微信开发者工具控制台报：

```
GET http://127.0.0.1:8080/api/user/profile 403
```

### 排查

1. 读 `JwtInterceptor.java`，确认 403 只在 `:65-68` 的**身份类型比对**失败时抛出；
   缺头 / 签名错 / 过期走的是 `:50` / `:59`，抛的是 **401**。
   → 403 说明 token 签名和过期校验**都通过了**，只是 `type` 声明不对。
2. 查后端 git 历史，`JwtUtil` 的 `TYPE_*` 常量改过三次：
   `"wxuser"`（`4a1022c`，0921）→ `"member"`（`c1ae944`，0926）→ `"user"`（`ee90659`，0927 起）。
3. 排除「后端跑的是旧版本」：旧版没有 `/api/user/profile` 映射，那会是 404；能返回 403
   说明 handler 存在、拦截器已放行到类型检查，路径是对的。

### 结论

本地 Storage 里的 token 是 0926 前后旧后端签发的（`type: "member"`），
而当前后端要求 `"user"`。JWT_SECRET 未变、7 天未到期，所以签名照旧合法但类型卡死。

### 解决

清微信开发者工具 Storage 里的 `token` 项，重新登录。用户确认已跑通。

（`index.vue:101-107` 的 catch 里本就有 `clearToken()`，重启小程序通常能自愈。）

### 端到端验证结果

- 登录链路：**跑通**
- 头像上传：**跑通**，后端实际生成 `4_1790670510773.jpg`，命名规则与 `UserServiceImpl:132` 一致
- 图片展示：见下方遗留事项

### 遗留事项（新增）

- **`<image>` 加载 HTTP 图片的警告**：`http://127.0.0.1:8080/upload/avatar/...` 不被小程序支持。
  本地开发**不用管**（127.0.0.1 不可能配 HTTPS 证书），开发者工具勾选
  「不校验合法域名、web-view、TLS 版本以及 HTTPS 证书」即可正常显示。
  上线时才需要处理，而 `UserController.fullUrl` 是按请求的 `Host` 头拼 URL 的，
  后端换 HTTPS 域名后返回的地址自动就是 https，**前后端都不用改代码**。

