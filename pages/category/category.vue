<template>
	<FloatingChat />
	<view class="page">
		<!-- 自定义顶部导航栏：搜索框 -->
		<CustomNavbar :showSearch="true" @heightChange="handleNavHeightChange" @search="goSearch" />

		<!-- 分类主体：左侧一级分类 + 右侧商品，高度由导航栏算出来（scroll-view 需确定高度） -->
		<view class="category-body" :style="{ height: bodyHeight }">
			<!-- 左侧一级分类：竖排，选中白底 + 橙色竖条 -->
			<scroll-view class="sidebar" scroll-y>
				<view
					v-for="(item, index) in categories"
					:key="item.id"
					class="sidebar-item"
					:class="{ active: index === activeIndex }"
					@click="handleSelect(index)"
				>
					<text class="sidebar-name">{{ item.name }}</text>
				</view>
			</scroll-view>

			<!-- 右侧商品：网格，随左侧选中联动 -->
			<scroll-view class="main" scroll-y>
				<!-- 顶部轮播图：写死 4 张本地图，后续接后端 Banner 接口 -->
				<view class="swiper-wrap">
					<CustomSwiper height="200rpx" />
				</view>
				<!-- 二级分类：一级下所有子分类横向切换，「全部」为不筛选 -->
				<scroll-view v-if="activeSubCategories.length" class="sub-tabs" scroll-x>
					<view class="sub-tab" :class="{ active: !activeSubId }" @click="handleSelectSub(null)">全部</view>
					<view
						v-for="sub in activeSubCategories"
						:key="sub.id"
						class="sub-tab"
						:class="{ active: activeSubId === sub.id }"
						@click="handleSelectSub(sub.id)"
					>
						{{ sub.name }}
					</view>
				</scroll-view>
				<!-- 商品网格：每行两个，卡片是 图片 + 名称 + 价格 + 购物车图标 -->
				<view class="goods-grid">
					<view class="goods-card" v-for="item in currentProducts" :key="item.id" @click="handleProductClick(item)">
						<image lazy-load class="goods-img" :src="imgUrl(item)" mode="aspectFill"></image>
						<view class="goods-info">
							<text class="goods-name">{{ item.name }}</text>
							<view class="goods-bottom">
								<text class="goods-price">¥{{ item.price }}</text>
								<text class="goods-cart iconfont icon-gouwuche1"></text>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
		</view>


		<!-- 自定义底部导航栏 -->
		<CustomTabBar />
	</view>
</template>

<script>
	import { getCategories } from '../../api/categories.js'
	import { getProductsByCategory } from '../../api/product.js'
	import { BASE_URL } from '../../utils/server-api.js'

	export default {
		data() {
			return {
				activeIndex: 0, // 当前选中一级分类下标，右侧商品跟着它联动
				activeSubId: null, // 当前选中的二级分类 id；null 表示该一级下全部商品
				navHeight: 0, // 导航栏总高度（px），由 CustomNavbar 抛上来
				// 一级父分类：来自后端 GET /api/categories（树形，children 是二级分类）
				categories: [],
				// 当前父类名下商品：按选中的一级分类懒加载（GET /api/products?categoryId=x）
				currentProducts: [],
				// 分类商品缓存：{ [categoryId]: { list, expireAt } }，切回已加载过的分类直接显示
				productCache: {},
				// 请求序号：快速切分类时只应用最后一次请求的结果
				loadSeq: 0,
			}
		},
		computed: {
			// 分类主体高度 = 整屏 - 导航栏占位高度，必须是确定值
			bodyHeight() {
				return 'calc(100vh - ' + this.navHeight + 'px)'
			},
			// 当前一级分类下的二级分类
			activeSubCategories() {
				const cat = this.categories[this.activeIndex]
				return cat ? (cat.children || []) : []
			}
		},
		mounted() {
			this.fetchCategories()
		},
		onShow() {
			// 从首页分类面板切回来时页面已加载，重新定位选中分类并加载其商品
			this.applySelectedCategory()
			this.loadProducts()
		},
		methods: {
			// 拉分类：后端返回树形列表，每个元素就是一级父分类，children 是它的二级分类
			fetchCategories() {
				getCategories().then((list) => {
					// 一级父分类：children 记下它的二级分类 id，用于过滤商品
					this.categories = (list || []).map((item) => {
						return {
							id: item.id,
							name: item.name,
							icon: this.imgUrl(item),
							children: (item.children || []).map((sub) => ({ id: sub.id, name: sub.name }))
						}
					})
					// 若从首页分类面板带过来选中分类，定位到对应下标
					this.applySelectedCategory()
					// 分类就绪后按当前父类懒加载商品
					this.loadProducts()
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
				})
			},
			// 按当前选中的一级/二级分类懒加载商品
			loadProducts() {
				const cat = this.categories[this.activeIndex]
				if (!cat) {
					this.currentProducts = []
					return
				}
				// 二级分类优先；未选二级时取一级下全部商品（后端支持一级 id）
				const filterId = this.activeSubId || cat.id
				// 命中缓存直接显示，切回已看过的分类不再等接口
				const cached = this.productCache[filterId]
				if (cached && Date.now() < cached.expireAt) {
					this.currentProducts = cached.list
					return
				}
				const seq = ++this.loadSeq
				getProductsByCategory(filterId).then((list) => {
					// 只应用最后一次切换的结果，避免旧响应覆盖新分类
					if (seq !== this.loadSeq) return
					const data = list || []
					this.currentProducts = data
					// 缓存 60 秒：库存/价格变更能较快反映，同时来回切分类是瞬时的
					this.productCache[filterId] = {
						list: data,
						expireAt: Date.now() + 60 * 1000
					}
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
				})
			},
			// 分类图/商品图共用：后端 image 是相对路径，补 BASE_URL
			imgUrl(item) {
				const img = item.image
				return img ? (img.indexOf('http') === 0 ? img : BASE_URL + img) : ''
			},
			// 定位首页分类面板传来的选中分类：switchTab 不能带 query，靠 Storage 传 id
			applySelectedCategory() {
				const selectedId = uni.getStorageSync('selectedCategoryId')
				if (!selectedId) return
				const idx = this.categories.findIndex((c) => c.id === selectedId)
				if (idx !== -1) {
					this.activeIndex = idx
					this.activeSubId = null
					// 用完即清，避免下次直接进分类页还停在旧分类
					uni.removeStorageSync('selectedCategoryId')
				}
			},
			// 接导航栏抛上来的高度
			handleNavHeightChange(height) {
				this.navHeight = height
			},
			// 点顶部搜索框：跳商品搜索页
			goSearch() {
				uni.navigateTo({ url: '/pages/search/search' })
			},
			// 点左侧一级分类：切换选中，回到「全部」并懒加载
			handleSelect(index) {
				this.activeIndex = index
				this.activeSubId = null
				this.loadProducts()
			},
			// 点二级分类：按二级 id 过滤，null 表示该一级下全部
			handleSelectSub(subId) {
				this.activeSubId = subId
				this.loadProducts()
			},
			// 点击商品：跳商品详情页（独立 page，不再弹加购弹窗）
			handleProductClick(item) {
				uni.navigateTo({
					url: '/pages/goods/detail?id=' + item.id
				})
			}
		}
	}
</script>

<style>
	.page {
		display: flex;
		flex-direction: column;
	}

	/* 分类主体高度走内联 bodyHeight，不用 flex 撑开：scroll-view 需要确定高度才能滚动 */
	.category-body {
		display: flex;
	}

	/* ===== 左侧一级分类 ===== */
	.sidebar {
		width: 176rpx;
		height: 100%;
		background: #f5f5f5;
	}

	.sidebar-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 28rpx 0;
		/* 默认透明左边框占位，选中时才上橙色，避免切换时内容左右抖动 */
		border-left: 6rpx solid transparent;
	}

	.sidebar-item.active {
		background: #ffffff;
		border-left-color: #FF6700;
	}
	.sidebar-name {
		margin-top: 10rpx;
		font-size: 24rpx;
		line-height: 2;
		color: #333333;
	}

	.sidebar-item.active .sidebar-name {
		color: #FF6700;
		font-weight: bold;
	}

	/* ===== 右侧商品 ===== */
	.main {
		flex: 1;
		height: 100%;
		background: #ffffff;
	}

	/* 右侧顶部轮播图容器：左右留边，让轮播图不贴边 */
	.swiper-wrap {
		padding: 20rpx 20rpx 0;
	}

	/* 二级分类横向切换 */
	.sub-tabs {
		white-space: nowrap;
		padding: 20rpx 16rpx 4rpx;
	}
	.sub-tab {
		display: inline-block;
		padding: 10rpx 24rpx;
		margin-right: 12rpx;
		font-size: 24rpx;
		color: #666666;
		background: #f5f5f5;
		border-radius: 999rpx;
	}
	.sub-tab.active {
		color: #ffffff;
		background: #FF6700;
		font-weight: bold;
	}

	/* 商品网格：每行两个，卡片内部 图片 + 名称 + 价格 + 购物车图标 */
	.goods-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		padding: 0 16rpx;
		/* 给固定定位的底部导航栏留空间，最后一行不被压住 */
		padding-bottom: 160rpx;
		margin-top:30rpx;
	}

	.goods-card {
		box-sizing: border-box;
		/* 固定高度 + 纵向排列：让不同名称长度的卡片等高，商品对齐 */
		display: flex;
		flex-direction: column;
		width: calc(50% - 8rpx);
		height: 440rpx;
		margin-bottom: 20rpx;
		background: #ffffff;
		border-radius: 12rpx;
		overflow: hidden;
	}

	.goods-img {
		width: 100%;
		height: 260rpx;
		/* flex 子项默认 flex-shrink:1，卡片空间不足时图片会被压矮；禁掉保证图片高度一致 */
		flex-shrink: 0;
	}

	.goods-info {
		display: flex;
		flex-direction: column;
		/* 占满图片下方剩余高度，价格行始终贴卡片底部 */
		flex: 1;
		padding: 12rpx 16rpx 16rpx;
	}

	.goods-name {
		font-size: 24rpx;
		color: #333333;
		line-height: 1.8;
		/* 名字最多两行，超出省略 */
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
		height:80rpx;
	}

	/* 价格 + 购物车图标一行：价格靠左，购物车靠右 */
	.goods-bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 4rpx;
	}

	/* 价格用品牌橙，和 tabBar 选中色一致 */
	.goods-price {
		font-size: 30rpx;
		font-weight: bold;
		color: #FF6700;
	}

	/* 购物车图标：复用全局 iconfont，橙色圆底做成加购按钮的样子 */
	.goods-cart {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56rpx;
		height: 56rpx;
		border-radius: 50%;
		background: #FF6700;
		color: #ffffff;
		font-size: 30rpx;
	}
</style>
