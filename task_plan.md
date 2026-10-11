# 任务计划：微信登录 + 用户资料闭环 → 前台购物链路

将此文件作为任务的持久化路线图。在开始复杂工作前创建，并在阶段变化时及时更新。

## 目标

前端 `e-commerce-uniapp` 的微信登录与用户资料链路，与后端 `e-commerce-boot` 的 `/api/wxlogin`、
`/api/user/profile`、`/api/user/avatar`、`/api/user/name` 四个接口完全对齐，
登录后能拉取、展示并修改含头像和昵称的用户资料。

**主线延伸（阶段 7 起）**：登录闭环已完成后，工作重心转到前台购物链路 ——
浏览（分类 / 热门 / 猜你喜欢）→ 看详情 → 加购（登录 + `POST /api/cart`）→ 购物车 → 下单。
其中「浏览 → 加购」已贯通（阶段 17），购物车与下单待做。

## 下一步

小程序 C 端已免登录（启动静默登录，无登录/退出按钮）。接下来：购物车页从占位改为真实列表
（后端 `GET /api/cart` 已就绪），以及等后端提供「轮播图 Banner 接口」「热门推荐接口」后接进首页下拉刷新。

## 当前阶段

阶段 18：小程序 C 端免登录（完成）

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

### 阶段 10：轮播图组件改名编译报错
- [x] 定位 `ENOENT: components/Swiper.wxml` —— 组件 `Swiper.vue` 改名 `CustomSwiper.vue` 后编译缓存残留（`.sourcemap` 里还留 `Swiper.js.map`）
- [x] 定位 `app._component is not a function` —— `main.js` Vue3 分支误写 `_component`（正确 API 为 `app.component`）
- [x] 修复 `main.js`：`app._component('CustomSwiper', ...)` → `app.component(...)`（已改）
- [x] 清缓存重编译验证
- **状态：** complete

### 阶段 11：前台分类组件
- [x] 新建 `components/CategoryPanel.vue`（6 分类宫格，3 列 × 2 行）
- [x] 图标方案从 iconfont 字体改为 png（`static/image/category/*.png` 6 张）
- [x] `pages/index/index.vue` 局部注册 + 插入轮播图下方，点击 `switchTab` 到分类页
- [x] 图标加 `border-radius` 圆角裁剪
- [x] 金刚区数据后端化：`CategoryPanel` 改为 `mounted` 调 `getCategories()`，只取 `parentId == null` 的一级分类，名称/图片用后端 `name`/`image`（补 `BASE_URL`），删除写死的 6 项
- [x] 分类页 + 首页跳转联动（带选中分类，Storage 传 `selectedCategoryId`）
- **状态：** complete

### 阶段 12：商品预览弹窗（热门推荐 + uni-popup）
- [x] 新建 `pages/index/component/HotPanel.vue`：热门推荐面板，4 色块 × 左右各一个商品位，点图 `$emit('select', id)`
- [x] 新建 `pages/index/component/ProductPopup.vue`：商品预览弹窗（图 + 名 + 价 + 描述 + 关闭），props `show`/`product` 进、`$emit('close')` 出
- [x] `pages/index/index.vue`：接 HotPanel 的 select → `getProductDetail` 拉详情 → `showProductPopup = true`，弹窗状态与商品数据留在页面 data
- [x] 修复弹窗图片不显示：后端 image 字段是 `/image/upload/N.webp` 相对路径，小程序把开头的 `/` 当包内路径，前端补 `BASE_URL` 前缀
- [x] 弹窗外壳改用 `uni-popup`（uni-ui，easycom 免注册）：`watch: show` ↔ `ref.open()/close()` 桥接；z-index 99 → 1000 压过自定义 TabBar
- **状态：** complete

### 阶段 13：悬浮式 AI 导购 Agent（前端）
- [ ] 新建悬浮组件（悬浮球 + 聊天抽屉/半屏面板），全局或各 tabBar 页引入
- [ ] 接 `POST /api/agent/chat`（非流式，body `{message}` → `Result<ChatReplyVO{reply}>`）
- [ ] 接 `POST /api/agent/chat/stream`（SSE 流式 `Flux<String>` 打字机渲染；小程序端支持受限时降级非流式）
- [ ] 消息列表 + 输入框 + 发送/清空；游客可用（后端白名单已放行 `/api/agent`）
- [ ] 下单等敏感操作仍走 `ensureLogin`（`utils/auth.js`），Agent 只做导购引导
- **状态：** pending（后端 Agent 骨架已跑通，前端未动；本轮仅更新三个 md）

### 阶段 14：首页「猜你喜欢」模块（Python 推荐服务对接）
- [x] 接口封装：`api/product.js` 新增 `getRecommend(limit)`，对应 `GET /api/products/recommend`（免登录，未登录走热门兜底）
- [x] 新建首页「猜你喜欢」区块组件 `components/Guess.vue`：两列商品卡片（图/名/价），`mounted` 调 `getRecommend` 拉后端商品，点图 `$emit('select', id)`
- [x] `pages/index/index.vue` 在热门推荐（`HotPanel`）之后插入 `<Guess @select="handleProductSelect" />`（全局注册，复用弹预览逻辑）
- [x] 已登录带 token 走个性化（后端按 `UserContext.getUserId()` 调 Python），未登录自动热门兜底（前端统一带 token 请求，无需自己判断登录态）
- **状态：** complete（前端已接 `getRecommend`，商品名称/价格/图片全部来自后端）

### 阶段 15：首页下拉刷新
- [x] 定位「看不到动画」根因：本地接口秒回，`refreshing` 瞬间 true→false，转圈没渲染就复位
- [x] 修复：`onRefresh` 的 `Promise.all` 内联 `setTimeout` 延时，保证动画至少展示一段时间
- [x] 整合代码：去掉 `minDelay` 中间变量，延时 Promise 直接内联
- [x] 确认用 `scroll-view` 的 `refresher-enabled` 而非原生 `onPullDownRefresh`（自定义 fixed 导航栏会盖住原生转圈）
- [ ] 接「轮播图 Banner 接口」进刷新（等后端 `GET /api/banners`）
- [ ] 接「热门推荐接口」进刷新（等后端 `GET /api/products/hot`）
- **状态：** in_progress（动画已修，接后端数据待 Python 推荐服务 + 后端接口）

### 阶段 16：分类页右侧商品网格
- [x] 分类页 `category.vue` 左侧分类后端化：`mounted` 调 `getCategories()`，按 `parentId` 拆一/二级，一级分类记下 `subIds`（二级分类 id）
- [x] 右侧「二级分类宫格」改为「商品网格」：`mounted` 调 `getProducts()` 拉全量商品，按「一级分类 id + 其二级分类 id 集合」前端过滤
- [x] 商品卡片：每行两个，图片 + 名称 + 价格 + 购物车图标（iconfont `icon-gouwuche1`）
- [x] 卡片固定高度 + 名称固定两行，解决不同名称长度下卡片等高对齐
- [x] 清理冗余：删未使用的 `subs` 字段、`currentCategory` 计算属性、`main-title` 标题
- **状态：** complete

### 阶段 17：商品加购链路
- [x] 对齐后台 `Mall.vue`，`ProductPopup` 补「服务保障」四项（uni-icons 替代 ant 图标）
- [x] 同上补「增值保障」三张卡片（一年意外保 2% / 全面保修 1% / 电池无忧 ¥20，选中橙边框）
- [x] 新建全局登录弹窗 `components/LoginPopup.vue` + `main.js` 两分支注册
- [x] 弹窗打开即静默登录（`ensureLogin`），并总是补一次 `getProfile()` 自动带出头像
- [x] 新建 `api/cart.js` 封装 `POST /api/cart`
- [x] 加购逻辑收进 `ProductPopup`（未登录 `$emit('needLogin')`，已登录直接落库 + `adding` 防连点）
- [x] 加购成功播「飞入购物车」动画（两层 transform 合成抛物线）
- [x] `category.vue` 改 `@needLogin`，删已下沉到组件的加购方法
- [x] `index.vue` 清理登录死代码 + 删多余的用户信息展示
- [x] 更新三个规划文件
- **状态：** complete（增值保障暂未落库，见下方「关键问题」）

## 关键问题

1. **昵称要不要做？** ~~后端无更新昵称的接口，前端也没有 `nickname` 输入入口。~~
   **已解决**：后端已补 `POST /api/user/name`，前端已接 `type="nickname"` 输入框。
2. **已登录用户怎么换头像？** ~~目前 `chooseAvatar` 按钮只在未登录分支渲染，登录后没有入口。~~
   **实际已有入口**：`pages/my/my.vue` 的已登录分支就带 `chooseAvatar` 换头像；原结论指的是
   已被清理掉的 `index.vue` 旧代码。登录弹窗里的 `chooseAvatar` 只服务未登录场景。
3. ~~**`utils/` 未纳入 git**，是否提交？~~ **已解决**：`git ls-files utils/` 确认两个文件已跟踪。
4. **增值保障选了不落库。** 弹窗里的三张保障卡片能选、能算价，但 `AddCartDTO` 只收
   `productId` / `quantity`，`CartServiceImpl.addItem` 固定写 `insuranceDetail("[]")` /
   `insuranceFee(0)`，选中的保障到后端就丢了。前端 `insuranceDetail` / `insuranceFee` 两个
   computed 已保留，**等后端补 DTO 字段 + service 取值**后直接加进请求体即可。

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
| 分类图标用 png 而非 iconfont 字体 | 字体图标单色、无"原有颜色"，png 彩色更好看；也避开两套 iconfont 同名 `font-family` 冲突 |
| `CategoryPanel` 用局部注册而非全局 | 只在首页用，不污染全局；且当时 `main.js` 状态不稳，局部注册更省事 |

| 弹窗放 `index.vue` 页面层，不放 HotPanel 内 | 数据（详情接口 + show 开关）归页面；弹窗是无状态展示组件，页面拉数据 props 传、事件回传；HotPanel 只抛 id 保持纯展示 |
| 商品预览弹窗改用 `uni-popup` | 项目已装 uni-ui 且 easycom 已配，遮罩 / 居中 / 点遮罩关闭 / 滚动穿透都内置；用户要求换成 uni-popup |
| 商品图 URL 统一补 `BASE_URL`，不拼 `/static` | 后端 `products.image` 存 `/image/upload/N.webp` 相对路径（网关映射到 upload/image/），小程序把 `/` 当包内路径；`/static/**` 只是前端本地占位图，与后端图不是同一份 |

| AI 导购 Agent 前端统一走网关 `/api/agent/**` | 后端 ai-agent-service 在 9008，前端只连 8080；白名单已放行 `/api/agent`，游客可直连 |
| 悬浮导购先做「对话 + 商品推荐」，下单留 HITL | 后端 `OrderTool.placeOrder` 依赖 order-service 未就绪；前端先引导，下单仍走原加购/下单链路 + `ensureLogin` |
| 流式接口优先、非流式兜底 | 后端 `/chat` 与 `/chat/stream` 都有；小程序端 SSE 依赖 `enableChunked` 需真机，不确定时用 `/chat` 整段渲染 |

| 猜你喜欢推荐算法用 Python 写，不用 Spring AI | 推荐是独立的 Python FastAPI 服务（Item-Item 共现 + 热门兜底）；Spring AI 只用于聊天机器人 ai-agent-service，两者职责不同 |
| 猜你喜欢接口免登录、未登录走热门兜底 | 复用 `/api/products/**` 白名单，游客也能看首页；个性化只在已登录时生效，前端无需自己判断登录态 |
| 分类接口单独放 `api/categories.js`，不与商品混在 `product.js` | 分类/商品是两个不同资源，按资源拆开；后端 `categories` 虽挂在 `ProductController` 下，前端按语义独立成文件 |
| 分类页商品按「一级分类 + 二级分类 id 集合」前端过滤 | 后端 `/api/products` 无分类过滤参数、返回全量；商品挂在二级分类上（`products.category_id` → 二级分类 id），一级分类下无直接商品 |
| 首页跳分类页用 Storage 传 `selectedCategoryId` | `switchTab` 跳 tab 页不能带 query；存 id → 分类页定位后删除 |
| 分类页定位选中分类放 `onShow` 且找不到不删 Storage | tabBar 页缓存，`mounted` 只跑一次；首次进入 `onShow` 先于数据返回，找到再删避免选不中/残留 |

| 加购的登录判断放 `ProductPopup` 组件内，不放页面 | 加购请求本来就在组件里发，「未登录 → 抛事件让页面弹窗」是同一条链路里的判断；放页面等于让页面同时管弹窗显隐 + 请求 + 登录态三件事 |
| 未登录点加购时商品弹窗不关 | 用户选的数量/增值保障留在原地，静默登录（无感）回来再点一次即可；关掉重开会触发 `watch.show` 里的重置，选择白丢 |
| 全局登录弹窗「打开即静默登录」，不做「微信登录」按钮 | `POST /api/wxlogin` 在免登录白名单、`uni.login` 不弹授权框，登录可全程无感；加购只需要 token，没有需要用户额外授权的信息 |
| 登录后总是补一次 `getProfile()` | `ensureLogin()` 已有 token 时直接 return，而重开小程序后 `store.userInfo` 是空的；不补这一次就永远没头像 |
| 头像不做成「弹窗打开自动获取微信头像」 | 平台限制：`chooseAvatar` 只在真实用户点击时触发，`getUserProfile` / `getUserInfo` 已废弃（只返回灰色匿名头像）。能自动的只有「拉后端已存的头像」，要换必须用户点一下 |
| 加购飞入动画用两层 `transform` 合成，不用 JS 逐帧算坐标 | 抛物线拆成「外层匀速横向 + 内层负 y1 贝塞尔纵向 + 缩放」两个 CSS transition，交给合成层跑，比定时器逐帧改坐标省事且不掉帧 |
| 飞入层放 `uni-popup` 外层，且 `z-index: 1200` | 弹窗收起自带 `transform` 动画，飞入层在弹窗内会被带着一起动；另需盖过弹窗遮罩（1000）和自定义 tabBar（999） |
| 首帧与位移分两次 `setTimeout`，不用 `$nextTick` | 小程序里 `$nextTick` 不保证首次样式已渲染到视图层；两次样式若落在同一次渲染就没有补间，动画会直接闪到终点 |

## 遇到的错误

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 前端请求路径 `/api/member/profile` 导致 404 | 1 | 改读 `docs/openapi.yaml`，按 `/api/user/profile` 修正 |
| 照抄 `avatar-upload.md` 的过时结论 | 1 | 该文件按 `MemberController` 记的，已按实际接口重写 |
| `utils/server-api.js` 被截断，`uploadAvatar` 整个丢失 | 1 | 未自行改回，报告后由用户恢复 |
| `GET /api/user/profile` 返回 **403**（非 401） | 1 | token 签名/过期都通过，只是 `type` 声明不符：本地存的是旧版后端签发的 `"member"` token，当前要求 `"user"`。清 Storage 重登解决 |
| 组件改名后报 `ENOENT: components/Swiper.wxml` | 1 | 编译缓存残留：`.sourcemap` 里还留旧 `Swiper.js.map`，增量编译仍去找旧组件。关微信开发者工具删 `unpackage/dist` 重编译 |
| 运行报 `app._component is not a function` | 1 | `main.js` Vue3 分支误写 `_component`，Vue3 全局注册应 `app.component()`，修正该行即可 |
| `@import url("../../static/category/iconfont.css")` 编译报找不到 | 1 | 组件在 `components/` 下，到根 `static` 只上一级 `../`，多写一级跑到 `my-workspace/` 去了 |
| 微信开发者工具报 `Component is not found` | 1 | 「过滤无依赖文件」误删 uni-app 懒加载组件（`() => "路径"`），关闭该功能即可 |
| iconfont 字体图标"没有原有颜色 / 难看" | 1 | 字体图标本质是单色字符，颜色全靠 CSS `color`，无内建颜色；改用 png |

| 商品预览弹窗看不到图片 | 1 | 后端 `products.image` 存 `/image/upload/N.webp`，前端直接当 `image` 的 src，小程序把开头的 `/` 解析成包内路径 → 空白。补 `BASE_URL` 前缀（`http://127.0.0.1:8080/image/upload/N.webp`）解决 |

| 加购飞入动画不播，商品图直接闪到购物车 | 1 | 初版用 `$nextTick` 改位移，小程序里首帧样式未必已渲染到视图层，两次样式落在同一次渲染就没有补间。改成 `setTimeout(..., 30)` 确保首帧立住 |
| 编辑 `index.vue` 时把样式块尾部写重，出现两条一样的 `.scroll-inner` | 1 | 删 `.avatar-btn` 等样式时替换串选得过宽，把尾部规则一起吞了。读文件复查发现后用后续 Edit 修掉 —— 改动后需回读确认，不能只信 Edit 没报错 |

## 备注
- 随着工作推进，将阶段状态从 `pending` 更新为 `in_progress`，再更新为 `complete`。
- 做重大决策前，重新读取目标和下一步。
- 及时记录错误，避免重复失败的方法。
- **本项目约定：能跑通就行，不主动堆健壮性/边界处理类改动。**
