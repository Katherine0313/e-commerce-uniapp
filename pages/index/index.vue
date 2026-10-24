<template>
	<FloatingChat />
	<view class="content">
		<!-- 自定义顶部导航栏：橙色底 + 搜索框。留在滚动区外，固定不动 -->
		<CustomNavbar :showSearch="true" @heightChange="handleNavHeightChange" @search="goSearch" />

		<!-- 滚动区：从导航栏下方开始，下拉刷新动画才不会被固定导航栏盖住；
		     高度必须是个确定值，用 flex 撑会塌陷、refresher 不工作 -->
		<scroll-view class="scroll-body" :scroll-y="true" :refresher-enabled="true" :refresher-triggered="refreshing"
			refresher-default-style="black" refresher-background="#F8F8F8" :style="{ height: scrollHeight }"
			@refresherrefresh="onRefresh">
			<!-- 内层容器只负责给固定定位的底部导航栏留出空间 -->
			<view class="scroll-inner">
				<!-- 首页轮播图 -->
				<CustomSwiper />

				<!-- 前台分类面板：手机 / 笔记本 / 平板 / 相机 / 手表 / 耳机 -->
				<CategoryPanel ref="categoryPanel" @select="handleCategorySelect" />
				<!-- 热门推荐：点商品图跳商品详情页 -->
				<HotPanel @select="handleProductSelect" />

				<!-- 猜你喜欢：全局注册，点商品图复用 handleProductSelect 跳详情 -->
				<Guess ref="guess" @select="handleProductSelect" />
			</view>
		</scroll-view>

		<!-- 自定义底部导航栏 -->
		<CustomTabBar />
	</view>
</template>

<script>
	// 前台分类面板：首页金刚区
	import CategoryPanel from './component/category-panel.vue'
	// 热门推荐
	import HotPanel from './component/hot-panel.vue'
	// 分享卡片统一文案：胶囊菜单的「转发」「分享到朋友圈」「收藏」共用
	const SHARE_TITLE = '杰米多多小店｜全新正品3C数码'
	// 分享封面：商品通用数码图，已按微信分享卡片 5:4 裁切（jpg，兼容性最好）
	const SHARE_IMAGE = '/static/image/share-3c.jpg'

	export default {
		components: {
			CategoryPanel,
			HotPanel
		},
		data() {
			return {
				refreshing: false, // 滚动区下拉刷新状态，由 scroll-view 的 refresher-triggered 绑定
				navHeight: 0, // 导航栏总高度（px），由 CustomNavbar 算好后抛上来
			}
		},
		computed: {
			// 滚动区高度 = 整屏 - 导航栏占位高度，必须是确定值（下拉刷新依赖它）
			scrollHeight() {
				return 'calc(100vh - ' + this.navHeight + 'px)'
			}
		},
		// 胶囊菜单「转发给朋友」：定义了它，胶囊里的「转发」自动可用
		onShareAppMessage() {
			return {
				title: SHARE_TITLE,
				imageUrl: SHARE_IMAGE,
				// 分享当前页（首页无参数）
				path: '/pages/index/index'
			}
		},
		// 胶囊菜单「分享到朋友圈」：定义了它，朋友圈分享卡片自动开启
		onShareTimeline() {
			return {
				title: SHARE_TITLE,
				imageUrl: SHARE_IMAGE,
				// 无额外查询参数；页面路径由微信自动取当前页
				query: ''
			}
		},
		// 胶囊菜单「收藏」：定义了它，胶囊里的「收藏」自动可用
		onAddToFavorites() {
			return {
				title: SHARE_TITLE,
				imageUrl: SHARE_IMAGE,
				// 收藏后再次打开时的页面参数（首页无需携带）
				query: ''
			}
		},
		methods: {
			// 接导航栏抛上来的高度，用于算滚动区高度
			handleNavHeightChange(height) {
				this.navHeight = height
			},
			// 点顶部搜索框：跳商品搜索页
			goSearch() {
				uni.navigateTo({ url: '/pages/search/search' })
			},
			// 下拉刷新：重拉分类和猜你喜欢，并至少转圈 600ms 再收起，避免动画一闪而过
			onRefresh() {
				this.refreshing = true
				Promise.all([
					this.$refs.categoryPanel.fetchCategories(),
					this.$refs.guess.fetchRecommend(),
					new Promise((resolve) => setTimeout(resolve, 2000))
				]).then(() => {
					this.refreshing = false
				})
			},
			// 点击分类项：跳分类页（tab 页必须用 switchTab）
			handleCategorySelect(item) {
				// switchTab 不能带 query，把选中分类 id 存 Storage，分类页加载后读它定位
				uni.setStorageSync('selectedCategoryId', item.id)
				uni.switchTab({
					url: '/pages/category/category'
				})
			},
			// 点击商品图：跳商品详情页（独立 page，不再弹加购弹窗）
			handleProductSelect(id) {
				uni.navigateTo({
					url: '/pages/goods/detail?id=' + id
				})
			}
		}
	}
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
		/* 不给高度、也不加 justify-content:center：滚动交给内部 scroll-view，它的高度由导航栏高度算出来。
		   不能加 align-items:center，否则轮播图这类全宽子元素会被压成内容宽（0 宽看不见） */
	}

	/* 滚动区高度走 scrollHeight 内联样式，不要用 flex 撑开：会高度塌陷，下拉刷新不触发 */

	/* 给固定定位的底部导航栏留出空间，内容才不会被压住 */
	.scroll-inner {
		padding-bottom: 120rpx;
	}
</style>
