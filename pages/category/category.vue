<template>
	<view class="page">
		<!-- 自定义顶部导航栏：搜索框 -->
		<CustomNavbar :showSearch="true" @heightChange="handleNavHeightChange" />

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
					<image class="sidebar-icon" :src="item.icon" mode="aspectFit"></image>
					<text class="sidebar-name">{{ item.name }}</text>
				</view>
			</scroll-view>

			<!-- 右侧商品：网格，随左侧选中联动 -->
			<scroll-view class="main" scroll-y>
				<!-- 顶部轮播图：写死 4 张本地图，后续接后端 Banner 接口 -->
				<view class="swiper-wrap">
					<CustomSwiper height="200rpx" />
				</view>
				<!-- 商品网格：每行两个，卡片是 图片 + 名称 + 价格 + 购物车图标 -->
				<view class="goods-grid">
					<view class="goods-card" v-for="item in currentProducts" :key="item.id" @click="handleProductClick(item)">
						<image class="goods-img" :src="imgUrl(item)" mode="aspectFill"></image>
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

		<!-- 商品加购弹窗：整页遮罩，放滚动区外，避免受 scroll-view 层叠影响 -->
		<ProductPopup :show="showProductPopup" :product="currentProduct" @close="handleProductClose"
			@add="handleAddCart" />

		<!-- 登录弹窗：未登录点加购时弹出来提示（打开即静默登录），叠在商品弹窗上面（全局组件，免注册） -->
		<LoginPopup :show="showLoginPopup" @close="handleLoginClose" />

		<!-- 自定义底部导航栏 -->
		<CustomTabBar />
	</view>
</template>

<script>
	import { getCategories } from '../../api/categories.js'
	import { getProductsByCategory } from '../../api/product.js'
	import { addToCart } from '../../api/cart.js'
	import { BASE_URL } from '../../utils/server-api.js'
	// 商品加购弹窗
	import ProductPopup from './component/ProductPopup.vue'
	import {
		useUserStore
	} from '../../store/user.js'

	export default {
		components: {
			ProductPopup
		},
		data() {
			return {
				activeIndex: 0, // 当前选中一级分类下标，右侧商品跟着它联动
				navHeight: 0, // 导航栏总高度（px），由 CustomNavbar 抛上来
				// 一级父分类：来自后端 GET /api/categories（树形，children 是二级分类）
				categories: [],
				// 当前父类名下商品：按选中的一级分类懒加载（GET /api/products?categoryId=x）
				currentProducts: [],
				// 商品加购弹窗显隐
				showProductPopup: false,
				// 当前点击的商品
				currentProduct: {},
				// 登录弹窗显隐
				showLoginPopup: false,
				store: useUserStore() // 用户登录态，判断是否要走登录弹窗
			}
		},
		computed: {
			// 分类主体高度 = 整屏 - 导航栏占位高度，必须是确定值
			bodyHeight() {
				return 'calc(100vh - ' + this.navHeight + 'px)'
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
							subIds: (item.children || []).map((sub) => sub.id)
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
			// 按当前选中的父类（一级分类）懒加载其名下商品
			loadProducts() {
				const cat = this.categories[this.activeIndex]
				if (!cat) {
					this.currentProducts = []
					return
				}
				getProductsByCategory(cat.id).then((list) => {
					this.currentProducts = list || []
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
					// 用完即清，避免下次直接进分类页还停在旧分类
					uni.removeStorageSync('selectedCategoryId')
				}
			},
			// 接导航栏抛上来的高度
			handleNavHeightChange(height) {
				this.navHeight = height
			},
			// 点左侧一级分类：切换选中，懒加载该父类名下商品
			handleSelect(index) {
				this.activeIndex = index
				this.loadProducts()
			},
			// 点击商品：记录商品并弹出加购弹窗
			handleProductClick(item) {
				this.currentProduct = item
				this.showProductPopup = true
			},
			// 关闭加购弹窗
			handleProductClose() {
				this.showProductPopup = false
			},
			// 加入购物车：未登录先弹登录弹窗（打开即静默登录），关掉后再点一次加购就成
			handleAddCart(item) {
				if (!this.store.isLogin) {
					// 商品弹窗保持打开，数量/增值保障的选择留在原地，登录后接着点即可
					this.showLoginPopup = true
					return
				}
				this.doAddCart(item)
			},
			// 关闭登录弹窗
			handleLoginClose() {
				this.showLoginPopup = false
			},
			// 真正的加购：调后端 POST /api/cart 落库，成功后关掉商品弹窗并提示
			// 增值保障明细/费用后端暂未接收（order-service 固定写空数组），等启用后再随请求带上
			doAddCart(item) {
				const product = item.product || {}
				if (!product.id) {
					return
				}
				addToCart(product.id, item.quantity).then(() => {
					this.showProductPopup = false
					uni.showToast({
						title: '已加入购物车',
						icon: 'success'
					})
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
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

	.sidebar-icon {
		width: 56rpx;
		height: 56rpx;
	}

	.sidebar-name {
		margin-top: 8rpx;
		font-size: 24rpx;
		line-height: 1;
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
