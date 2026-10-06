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

### 轮播图组件（2026-10-02，`components/CustomSwiper.vue`）

- 把首页轮播图抽成全局组件 `CustomSwiper`，`main.js` 全局注册后各页面直接写 `<CustomSwiper />`
  （`pages/index/index.vue:7` 已用）。
- 组件 props：`list`（图片路径数组，默认 4 张 `/static/image/swiper/1~4.webp`）、`height`、
  `autoplay`、`interval`、`duration`、`circular`、`indicatorDots`、`indicatorColor`、
  `indicatorActiveColor`；事件 `change`（抛出当前下标）、`click`（抛出点击下标）。
- **Vue3 全局注册踩坑**：正确 API 是 `app.component(name, comp)`，**不是** `app._component`。
  `_component` 是编译产物 `app.js` 里出现过的内部命名，误抄会导致运行期
  `app._component is not a function`（`main.js:37`）。
- **组件改名后编译缓存不会自动清**：`Swiper.vue` → `CustomSwiper.vue` 后，
  `unpackage/dist/dev/.sourcemap/mp-weixin/components/` 残留旧 `Swiper.js.map`，增量编译仍去找
  `Swiper.wxml` → `ENOENT`。需关微信开发者工具（否则 `Device or resource busy`）删 `unpackage/dist` 重编译。

### 前台分类组件（2026-10-02，`components/CategoryPanel.vue`）

- 首页「金刚区」分类面板：6 个分类（手机/笔记本/平板/相机/手表/耳机），3 列 × 2 行宫格。
- **图标方案演进**：先试 iconfont 字体（`static/category/iconfont.css`），后因字体图标单色、无
  "原有颜色"（颜色全靠 CSS `color`），且与全局 `static/icon/iconfont.css` 同名 `font-family` 冲突，
  最终改用 png（`static/image/category/*.png` 6 张），`<image mode="aspectFit">` + `border-radius: 30rpx` 圆角。
- **注册方式**：`pages/index/index.vue` 局部注册（`import` + `components`），未进 `main.js` 全局注册
  —— 组件只在首页用，且当时 `main.js` 状态不稳。全局/局部/easycom 的选择标准是「复用范围」。
- **交互**：点击某项 `$emit('select', item)` 把整项抛给页面，`handleCategorySelect` 用 `switchTab` 跳分类页。
- 数据源已后端化（2026-10-06）：`mounted` 调 `getCategories()`，只取 `parentId == null` 的一级分类，
  名称/图片用后端 `CategoryVO` 的 `name`/`image`；`image` 是 `/image/category/xxx.png` 相对路径，补 `BASE_URL`。
  分类接口单独拆到 `api/categories.js`（原混在 `api/product.js`；分类与商品是两个资源，按资源拆开）。
- 相关坑：`@import` 相对路径从 `components/` 到根是 `../` 不是 `../../`；微信开发者工具
  「过滤无依赖文件」会误删 uni-app 懒加载组件（报 `Component is not found`）。

### 商品预览弹窗（2026-10-03，`pages/index/component/HotPanel.vue` + `ProductPopup.vue`）

- 首页「热门推荐」面板 `HotPanel`：4 色块，每块左右各一个商品位（写死商品 id 的占位数据），
  点图只 `$emit('select', id)`，不拉数据 —— 纯展示组件，详情与弹窗都留给页面。
- 弹窗组件 `ProductPopup`：无状态展示组件（props `show`/`product` 进、`$emit('close')` 出），
  商品图 / 名 / 价 / 描述 / 关闭按钮；数据与显隐状态都归 `pages/index/index.vue` 的 data。
- **弹窗放页面层不放 HotPanel 内的理由**：详情接口 + show 开关归页面；弹窗是整页遮罩，
  复用方不止热门推荐（分类页/搜索页以后也能用）；挂进 flex 列布局的列表组件里语义和层叠都不对。
- **商品图片链路（本轮踩坑）**：后端 `products.image` 存 `/image/upload/N.webp` 相对路径，
  由网关路由到 product-service，`common/WebMvcConfig` 把 `/image/**` 映射到 `file:upload/image/`。
  小程序里 `<image>` 的 src 以 `/` 开头会被解析成**包内路径**，不是服务器地址 → 空白。
  前端需补 `BASE_URL`（`http://127.0.0.1:8080`）；`/static/image/upload/N.webp` 是前端本地占位图，另一回事。
- **弹窗组件实现演进**：先自写（v-if + fixed 遮罩 + flex 居中），后按用户要求改用 `uni-popup`。
  uni-ui 的 `uni-popup` 走 pages.json 已配的 easycom 规则（`^uni-(.*)`）免注册，
  遮罩 / 居中 / 点遮罩关闭（`is-mask-click`）/ H5 滚动穿透都内置。
- **uni-popup 是命令式 API**：`ref.open()` / `ref.close()`，而页面是 data 驱动，需 `watch: show`
  桥接，并用内部 `opened` 标记对齐状态，避免 `change` 事件和 watch 来回触发死循环。
- **z-index 冲突**：uni-popup 自带 `position: fixed; z-index: 99`，自定义 TabBar 是 999，会被压住。
  通过 `<uni-popup class="product-popup">`（class 经 uni-app `u-c` 透传到根节点）+ 非 scoped 样式
  `.product-popup.uni-popup { z-index: 1000; }`（双类名提高优先级，不依赖加载顺序）解决。

### AI 导购 Agent（后端 ai-agent-service + 前端悬浮导购）

**后端（2026-10-03 已建骨架并实测）**：

- 新增微服务 `ai-agent-service`（端口 9008），定位「完整 Agent 而非 LLM 聊天壳」，保留
  Graph 工作流（意图路由）/ RAG / MCP / Function Calling 四大能力。
- 技术选型：Spring AI 2.0.1（官方，非 Alibaba）+ 硅基流动 DeepSeek（OpenAI 兼容）+
  SimpleVectorStore 起步 + OpenFeign 调 product-service + MCP（spring-ai-starter-mcp-server-webmvc）。
- 已实测通过：启动 + Nacos 注册、对话、Tool Calling、SSE 流式、MCP；
  真实推荐待 product-service 启动（当前返回 DeepSeek 幻觉商品）、下单待 order-service。

**前端对接契约（免登录，游客可用）**：

- 网关已加路由 `Path=/api/agent,/api/agent/**` → `lb://ai-agent-service`（放在 `/api/**` 通配之前）；
  common `WebMvcConfig.EXCLUDE_AUTH_PATHS` 已放行 `/api/agent`、`/api/agent/**`。
- `POST /api/agent/chat`：body `{message}`，返回 `Result<ChatReplyVO>`（`ChatReplyVO{reply}`）。
- `POST /api/agent/chat/stream`：`produces=text/event-stream`，body `{message}`，返回 `Flux<String>` 打字机。
- 意图路由（`IntentRouter` 规则关键词）：RECOMMEND（推荐/查询，走 `ProductTool` 查 product-service）/
  ORDER（下单，走 `OrderTool` HITL）/ QA（售后/规格，走 RAG）/ CHAT（闲聊）。

**前端要做**：

- 悬浮式导购：悬浮球 + 点击展开聊天抽屉/半屏面板，消息列表 + 输入框 + 发送。
- 流式渲染打字机（SSE）；若小程序端 SSE 支持受限，先降级用非流式 `/chat`。
- 游客可直接对话（免登录）；涉及下单等操作再走现有 `utils/auth.js` 的 `ensureLogin`。

⚠️ **小程序端 SSE 坑（待真机验证）**：

- 微信 `wx.request` 默认不支持流式响应；需 `enableChunked: true` + `onChunkReceived` 回调
  （基础库 2.20.1+），**开发者工具不支持，需真机**。uni-app `uni.request` 透传该能力。
- 若真机仍不可用，回退方案：非流式 `/api/agent/chat`，整段回复一次性渲染。

### 首页「猜你喜欢」模块（Python 推荐服务，2026-10-04）

> 小程序首页新增「猜你喜欢」区块，依据**订单表下单记录**（`orders` + `order_items` 的
> `user_id → product_id` 关系）推荐商品。推荐算法**用 Python 写**（独立服务），Java 只做桥接；
> Spring AI 是给聊天机器人（ai-agent-service）用的，与本模块无关。

**后端方案（已定案，详见后端 findings「推荐服务（Python）方案」）**：

- Python 推荐项目：`D:\study\my-workspace\wechat-workspace\recommender-python`（独立 Python 项目，
  后端 findings 记为 `recommend-service/`，FastAPI 端口 9009）。
- 算法：Item-Item 商品共现（「买了又买」）+ 销量热门兜底；协同过滤暂不做（用户×商品矩阵太稀疏，仅 3 个用户有下单记录）。
- 数据源：先读原 Node 的 SQLite `orders/order_items`（有效下单 22 条、在售商品 30 个、3 个用户），order-service 落地后切 MySQL（`datasource` 抽象层）。
- 冷启动兜底：未登录 / 未下单 → 按销量降序推荐全量在售商品（销量 = `sum(quantity)`，无销量商品按 id 排后补位）。

**接口契约（前端对接依据）**：

| 接口 | 方法 | 入参 | 返回 |
|------|------|------|------|
| `/api/products/recommend` | GET | `?limit=10`（可选） | `Result<List<ProductVO>>`，字段与商品列表一致（`id`/`name`/`image`/`price`/`description` 等） |

- 免登录（复用 `/api/products/**` 白名单，网关路由零改动）；该接口已端到端跑通（Python → Java 桥接 → 网关）。
- 登录态：后端按 `UserContext.getUserId()` 调 Python `/recommend?user_id`；未登录 → 请求 Python
  不带 `user_id` → 走热门兜底。前端**无需**自己判断登录态，统一带 token 请求即可。
- 底层 Python 接口 `GET /recommend?user_id=1&limit=10` → `{"product_ids":[...],"scores":[...]}`，
  前端不直接接触，只经 Java 桥接接口拿 `ProductVO` 列表。

**前端要做**（已完成，2026-10-05）：

- 接口封装：`api/product.js` 新增 `getRecommend(limit)` → `GET /api/products/recommend`。
- 首页新增「猜你喜欢」区块组件（复用 `ProductVO` 卡片：图/名/价），点商品图复用
  `handleProductSelect` 弹 `ProductPopup` 预览。
- `pages/index/index.vue` 在热门推荐（`HotPanel`）之后插入该区块。
- 商品图相对路径 `/image/upload/N.webp` 仍要补 `BASE_URL`（与 `ProductPopup.cover` 同一处理）。

**实现现状（2026-10-05）**：

- 组件 `components/Guess.vue` 已重建（原文件模板是坏的：多根节点、`<scroll scroll-y>` 拼写错误），
  现为「标题 + 两列商品卡片网格（图/名/价）」，`mounted` 调 `getRecommend(10)` 拉后端商品。
- 商品名称/价格/图片全部来自后端 `ProductVO`（id/name/image/price）；图片经 `imgUrl(item)` 补 `BASE_URL`，
  无图时回退本地 `/static/image/upload/{id}.webp`。
- 标题样式：左右渐变装饰线 + 两侧小圆点，纯 CSS 实现，未引入图片资源（项目无现成 icon）。

**与「热门推荐（HotPanel）」的区别**：

- `HotPanel` 是写死商品 id 的「栏目/精选」占位面板（阶段 12），与个性化无关；
- 「猜你喜欢」是**按用户下单记录**的个性化推荐，数据来自 Python 推荐服务 + Java 桥接接口。

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
| Vue3 全局注册组件用 `app.component()` | `app._component` 不是合法 API，运行期直接 `is not a function` |
| 分类图标用 png 而非 iconfont 字体 | 字体图标单色、无原色，png 彩色更好看；也避开两套 iconfont 同名 `font-family` 冲突 |
| `CategoryPanel` 局部注册 | 只在首页用，不污染全局 |

| 商品预览弹窗用 `uni-popup` 而非自写遮罩 | 项目已装 uni-ui 且 easycom 已配；遮罩 / 居中 / 点遮罩关闭 / 滚动穿透都内置，自写要重复造且要处理 z-index 与 TabBar 层级 |
| 商品图相对路径统一补 `BASE_URL` | 后端存 `/image/upload/N.webp`，小程序把 `/` 当包内路径；`/static/**` 只是本地占位，跟后端图不是同一份 |
| 弹窗显隐用 `watch` 桥接命令式 `open/close` | uni-popup 是 ref 调用的命令式 API，页面是 data 驱动 show；加内部 `opened` 标记防 change 与 watch 互相触发 |

| AI 导购 Agent 前端统一走网关 `/api/agent/**` | 后端 ai-agent-service 在 9008，前端只连 8080；白名单已放行，游客可直连 |
| 悬浮导购先做「对话 + 商品推荐」，下单走 HITL 留后 | 后端 `OrderTool.placeOrder` 依赖 order-service 未就绪；前端先引导，下单仍走原加购/下单链路 + `ensureLogin` |
| 流式优先、非流式兜底 | 后端两个接口都提供；小程序端 SSE 依赖 `enableChunked` 需真机，不确定时用 `/chat` 一次回整段 |

| 猜你喜欢推荐算法用 Python 写，不用 Spring AI | 推荐是独立的 Python FastAPI 服务；Spring AI 只用于聊天机器人 ai-agent-service，两者职责不同 |
| 猜你喜欢接口免登录、未登录走热门兜底 | 复用 `/api/products/**` 白名单，游客也能看首页；个性化只在已登录时生效 |

## 遇到的问题

| 问题 | 解决方案 |
|------|---------|
| 前端请求 `/api/member/profile`、`/api/member/avatar` 会 404 | 改为 `/api/user/profile`、`/api/user/avatar` |
| `avatar-upload.md` 按 `MemberController` / `/api/member/**` 记录，与后端不符 | 按实际接口与包名重写，并加更正记录 |
| `uni.setStorageSync('userInfo', ...)` 写了从不读（死代码） | 已记录，用户决定不修 |
| ~~昵称永远显示「微信用户」~~ | **已解决**：后端补 `/api/user/name`，前端补 `type="nickname"` 输入框 |
| 切华为机型搜索框贴边 | `rightSafeArea` 补 +8px 间距 |
| 切华为机型搜索框上下被裁切 | `navContentHeight` 加 `Math.max(44, ...)` 下限 |
| 组件改名后 `ENOENT: components/Swiper.wxml` | 编译缓存残留，关开发者工具删 `unpackage/dist` 重编译 |
| `app._component is not a function` | `main.js` Vue3 分支误写，改为 `app.component()` |
| `@import` 相对路径 `../../` 找不到 css | 组件在 `components/` 下，到根 `static` 是 `../` |
| 微信开发者工具 `Component is not found` | 「过滤无依赖文件」误删懒加载组件，关闭该功能 |
| iconfont 字体图标"没有原有颜色" | 字体图标是单色字符，颜色靠 CSS `color`；改用 png |

| 商品预览弹窗看不到图片 | 后端 `products.image` 存 `/image/upload/N.webp` 相对路径，前端直接当 src，小程序把 `/` 解析成包内路径 → 空白；补 `BASE_URL` 前缀解决 |

| 小程序端 SSE 流式接入方式待确认 | 微信 `wx.request` 需 `enableChunked` + `onChunkReceived`（基础库 2.20.1+，开发者工具不支持、需真机）；不确定则降级非流式 `/api/agent/chat` |

| 猜你喜欢图片底部圆角"被剪掉" | 卡片 `overflow:hidden` + `border-radius` 只裁卡片外边界（图片顶角），图片底边在卡片内部不贴底边，需给 `.goods-img` 单独设 `border-radius: 0 0 16rpx 16rpx` |
| 猜你喜欢标题 `text-align: center` 不生效 | `.guess-header` 是 flex 容器，`text-align` 只管行内文本，flex 子项居中要用 `justify-content: center` |

## 资源

### 项目根目录

| 项目 | 绝对路径 |
|------|---------|
| 后端（Spring Boot） | `D:\study\my-workspace\wechat-workspace\e-commerce-boot` |
| 前端（uni-app） | `D:\study\my-workspace\wechat-workspace\e-commerce-uniapp` |
| 推荐服务（Python） | `D:\study\my-workspace\wechat-workspace\recommender-python` |

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
