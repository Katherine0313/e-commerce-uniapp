<template>
	<FloatingChat />
	<view class="page">
		<!-- 页面内容：随页面原生滚动，底部固定栏用 fixed 盖在最上层 -->
		<view class="content">
			<!-- 主图：单图（商品数据只有一张 image，无多图轮播） -->
			<image v-if="cover" class="cover" :src="cover" mode="aspectFill"></image>

			<!-- 商品信息卡：价格 / 名称 / 副标题 -->
			<view class="info-card">
				<view class="price-row">
					<text class="price">¥{{ product.price }}</text>
					<text v-if="product.marketPrice" class="market-price">¥{{ product.marketPrice }}</text>
				</view>
				<text class="name">{{ product.name }}</text>
				<text v-if="product.subTitle" class="sub-title">{{ product.subTitle }}</text>
			</view>

			<!-- 服务保障：和后台 Mall.vue 的 assurance-row 一致，小程序没有 ant 图标，用 uni-ui 的 uni-icons 对应 -->
			<view class="assurance-row">
				<view class="assurance-item">
					<uni-icons type="auth" size="15" color="#FF6700"></uni-icons>
					<text class="assurance-text">正品保证</text>
				</view>
				<view class="assurance-item">
					<uni-icons type="refreshempty" size="15" color="#FF6700"></uni-icons>
					<text class="assurance-text">极速退款</text>
				</view>
				<view class="assurance-item">
					<uni-icons type="calendar" size="15" color="#FF6700"></uni-icons>
					<text class="assurance-text">七天无理由</text>
				</view>
				<view class="assurance-item">
					<uni-icons type="location" size="15" color="#FF6700"></uni-icons>
					<text class="assurance-text">全国联保</text>
				</view>
			</view>

			<!-- 数量选择 -->
			<view class="quantity-row">
				<text class="row-label">数量</text>
				<QuantityStepper :value="quantity" :max="product.stock" @change="setQuantity" />
			</view>

			<!-- 增值保障：和后台 Mall.vue 的 insurance-section 一致，点卡片切换选中（橙边框 + 浅橙底） -->
			<view class="insurance-section">
				<text class="section-title">增值保障</text>
				<view class="insurance-cards">
					<view class="insurance-card" :class="{ active: selectedInsurance2 }"
						@click="selectedInsurance2 = !selectedInsurance2">
						<text class="insurance-name">一年意外保</text>
						<text class="insurance-price">¥{{ insurance2 }}</text>
					</view>
					<view class="insurance-card" :class="{ active: selectedInsurance1 }"
						@click="selectedInsurance1 = !selectedInsurance1">
						<text class="insurance-name">全面保修</text>
						<text class="insurance-price">¥{{ insurance1 }}</text>
					</view>
					<view class="insurance-card" :class="{ active: selectedBattery }" v-if="showBattery"
						@click="selectedBattery = !selectedBattery">
						<text class="insurance-name">电池无忧</text>
						<text class="insurance-price">¥20</text>
					</view>
				</view>
			</view>

			<!-- 图文详情：body 富文本，rich-text 渲染；img 相对路径已在 bodyHtml 里补全 -->
			<view class="body-section">
				<view class="body-title">
					<view class="body-title-line"></view>
					<text class="body-title-text">图文详情</text>
					<view class="body-title-line"></view>
				</view>
				<rich-text v-if="bodyHtml" class="body-detail" :nodes="bodyHtml"></rich-text>
			</view>
		</view>

		<!-- 底部固定栏：收藏 / 购物车 / 加入购物车 / 立即购买 -->
		<view class="footer-bar">
			<view class="footer-icon" @click="toggleFavorite">
				<uni-icons :type="favorited ? 'star-filled' : 'star'" size="22"
					:color="favorited ? '#FF6700' : '#999999'"></uni-icons>
				<text class="footer-icon-text" :class="{ favorited: favorited }">收藏</text>
			</view>
			<view class="footer-icon" @click="goCart">
				<view class="footer-cart-wrap">
					<text class="iconfont icon-gouwuche1 footer-cart"></text>
					<text v-if="cartCount > 0" class="footer-cart-badge">{{ cartCount > 99 ? '99+' : cartCount }}</text>
				</view>
				<text class="footer-icon-text">购物车</text>
			</view>
			<view class="footer-btn add-btn" :class="{ loading: adding }" @click="handleAdd">加入购物车</view>
			<view class="footer-btn buy-btn" @click="handleBuy">立即购买</view>
		</view>

		<!-- 登录弹窗：未登录点加购/购买时弹出（打开即静默登录），登录成功自动续做刚才的动作 -->
		<LoginPopup :show="showLoginPopup" @close="handleLoginClose" @success="handleLoginSuccess" />
	</view>
</template>

<script>
	import { BASE_URL } from '../../utils/server-api.js'
	import { getProductDetail } from '../../api/product.js'
	import { addToCart } from '../../api/cart.js'
	import { checkFavorite, addFavorite, removeFavorite } from '../../api/favorite.js'
	import { ensureLogin } from '../../utils/auth.js'
	import { useUserStore } from '../../store/user.js'
	import { useCartStore } from '../../store/cart.js'

	export default {
		name: 'GoodsDetail',
		data() {
			return {
				product: {}, // 商品详情，onLoad 按 id 拉取
				quantity: 1, // 购买数量，最少 1 件
				selectedInsurance1: false, // 全面保修
				selectedInsurance2: false, // 一年意外保
				selectedBattery: false, // 电池无忧
				adding: false, // 正在请求加购接口，按钮置灰防重复点
				favorited: false, // 是否已收藏（后端账号级数据）
				favoriteLoading: false, // 收藏请求中，防重复点击
				showLoginPopup: false, // 登录弹窗显隐
				store: useUserStore() // 登录态，加购/购买前先判断
			}
		},
		onLoad(options) {
			const id = options.id
			if (!id) {
				return
			}
			this.loadDetail(id)
			// 已登录才查收藏态；未登录点收藏时会静默登录
			this.loadFavorite(id)
		},
		computed: {
			// 购物车角标件数：读全局 cart store，加购后自动同步到详情页底部购物车 icon
			cartCount() {
				return useCartStore().count
			},
			// 主图：后端 image 是相对路径，补上网关域名才能取到图
			cover() {
				const img = this.product.image
				return img ? (img.indexOf('http') === 0 ? img : BASE_URL + img) : ''
			},
			// 图文详情富文本：body 里 img 的 src 是相对路径 /image/body/xxx，rich-text 不会自动补域名，
			// 这里统一补成完整 URL，并把空 style 换成 width:100%，否则图片按原始尺寸撑破容器
			bodyHtml() {
				const body = this.product.body
				if (!body) {
					return ''
				}
				return body
					.replace(/style=""/g, 'style="width:100%;display:block;"')
					.replace(/\/image\//g, BASE_URL + '/image/')
			},
			// 保障服务价格：售价的 1%（和后台 Mall.vue 计费口径一致）
			insurance1() {
				const price = Number(this.product.price) || 0
				return price ? (price * 0.01).toFixed(2) : ''
			},
			// 保障服务价格：售价的 2%
			insurance2() {
				const price = Number(this.product.price) || 0
				return price ? (price * 0.02).toFixed(2) : ''
			},
			// 选中的增值保障明细（数组，随加购/下单一起交给后端）
			insuranceDetail() {
				const list = []
				if (this.selectedInsurance1) list.push({ code: 'warranty', name: '全面保修', fee: Number(this.insurance1) })
				if (this.selectedInsurance2) list.push({ code: 'accident', name: '一年意外保', fee: Number(this.insurance2) })
				if (this.showBattery && this.selectedBattery) list.push({ code: 'battery', name: '电池无忧', fee: 20 })
				return list
			},
			// 单件保障费合计
			insuranceFee() {
				let fee = 0
				if (this.selectedInsurance1) fee += Number(this.insurance1)
				if (this.selectedInsurance2) fee += Number(this.insurance2)
				if (this.showBattery && this.selectedBattery) fee += 20
				return fee.toFixed(2)
			},
			// 电池无忧只对有电池的类别显示：耳机/音箱（401/402/403）不显示
			showBattery() {
				return ![401, 402, 403].includes(Number(this.product.categoryId))
			}
		},
		methods: {
			// 拉商品详情
			loadDetail(id) {
				getProductDetail(id).then((res) => {
					this.product = res || {}
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
				})
			},
			// 数量变化（+/- 或输入框提交）：直接更新本地数量，加购/下单时再提交
			setQuantity(n) {
				this.quantity = n
			},
			// 查收藏态：未登录不查，点收藏时再静默登录
			loadFavorite(id) {
				if (!this.store.isLogin) {
					return
				}
				checkFavorite(id).then((flag) => {
					this.favorited = !!flag
				}).catch(() => {})
			},
			// 点收藏：未登录先静默登录，再按当前状态调收藏/取消收藏
			toggleFavorite() {
				if (this.favoriteLoading) {
					return
				}
				const id = this.product.id
				if (!id) {
					return
				}
				this.favoriteLoading = true
				ensureLogin()
					.then(() => this.favorited ? removeFavorite(id) : addFavorite(id))
					.then(() => {
						this.favorited = !this.favorited
						uni.showToast({
							title: this.favorited ? '已收藏' : '已取消收藏',
							icon: 'none'
						})
					})
					.catch(() => {
						// 错误提示已在 request 封装里统一处理
					})
					.finally(() => {
						this.favoriteLoading = false
					})
			},
			// 点购物车：切到购物车 tab（switchTab 只能切 tab 页，会关掉当前详情页）
			goCart() {
				uni.switchTab({
					url: '/pages/cart/cart'
				})
			},
			// 点加入购物车：未登录先弹登录弹窗；已登录调后端落库，成功 toast + 角标累加
			handleAdd() {
				if (this.adding) {
					return
				}
				if (!this.store.isLogin) {
					this.showLoginPopup = true
					return
				}
				if (!this.product.id) {
					return
				}
				this.adding = true
				addToCart(this.product.id, this.quantity, this.insuranceDetail, Number(this.insuranceFee)).then(() => {
					this.adding = false
					// 同步底部购物车角标件数（详情页没有购物车 tab 落点，不再做飞入动画）
					const cartStore = useCartStore()
					console.log('[加购] 加购前 count:', cartStore.count, '本次加:', this.quantity, '类型:', typeof this.quantity)
					cartStore.addQuantity(this.quantity)
					console.log('[加购] 加购后 count:', cartStore.count)
					uni.showToast({
						title: '已加入购物车',
						icon: 'success'
					})
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
					this.adding = false
				})
			},
			// 点立即购买：未登录先弹登录；已登录组装单个商品跳下单确认页
			handleBuy() {
				if (!this.store.isLogin) {
					this.showLoginPopup = true
					return
				}
				if (!this.product.id) {
					return
				}
				// 组装单个商品的待结算项，字段对齐购物车 CartVO（下单确认页统一读 store.checkoutItems）
				const unitPrice = Number(this.product.price) || 0
				const fee = Number(this.insuranceFee) || 0
				useCartStore().setCheckoutItems([{
					productId: this.product.id,
					name: this.product.name,
					image: this.product.image,
					price: unitPrice,
					quantity: this.quantity,
					insuranceDetail: this.insuranceDetail,
					insuranceFee: fee,
					subTotal: (unitPrice + fee) * this.quantity
				}])
				uni.navigateTo({
					url: '/pages/order/confirm'
				})
			},
			// 登录成功：收掉登录弹窗，把刚才被打断的加购接着做完
			handleLoginSuccess() {
				if (!this.showLoginPopup) {
					return
				}
				this.showLoginPopup = false
				this.handleAdd()
			},
			// 关闭登录弹窗（用户手动关或点遮罩）
			handleLoginClose() {
				this.showLoginPopup = false
			}
		}
	}
</script>

<style scoped>
	.page {
		background: #F8F8F8;
	}

	/* 内容区：自然高度随页面滚动，底部 padding 留出 fixed 栏的高度 */
	.content {
		padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
	}

	/* 主图：全宽正方形，aspectFill 裁切居中 */
	.cover {
		width: 100%;
		height: 750rpx;
	}

	/* ===== 商品信息卡 ===== */
	.info-card {
		display: flex;
		flex-direction: column;
		padding: 20rpx 30rpx;
		background: #ffffff;
	}

	.price-row {
		display: flex;
		align-items: baseline;
	}

	.price {
		font-size: 44rpx;
		font-weight: bold;
		color: #FF6700;
	}

	.market-price {
		margin-left: 16rpx;
		font-size: 26rpx;
		color: #999999;
		text-decoration: line-through;
	}

	.name {
		margin-top: 12rpx;
		font-size: 32rpx;
		font-weight: bold;
		color: #333333;
		line-height: 1.4;
	}

	.sub-title {
		margin-top: 8rpx;
		font-size: 26rpx;
		color: #999999;
	}

	/* ===== 服务保障 ===== */
	.assurance-row {
		display: flex;
		margin-top: 16rpx;
		padding: 20rpx 30rpx;
		background: #ffffff;
	}

	.assurance-item {
		display: flex;
		align-items: center;
		width: 50%;
		padding: 8rpx 0;
	}

	.assurance-text {
		margin-left: 8rpx;
		font-size: 24rpx;
		color: #666666;
	}

	/* ===== 数量 / 增值保障 通用行 ===== */
	.quantity-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 16rpx;
		padding: 20rpx 30rpx;
		background: #ffffff;
	}

	.row-label {
		font-size: 26rpx;
		color: #333333;
	}

	.section-title {
		font-size: 26rpx;
		font-weight: 600;
		color: #333333;
	}

	.insurance-section {
		display: flex;
		flex-direction: column;
		margin-top: 16rpx;
		padding: 20rpx 30rpx;
		background: #ffffff;
	}

	.insurance-cards {
		display: flex;
		margin-top: 16rpx;
	}

	.insurance-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		margin-right: 16rpx;
		padding: 14rpx 8rpx;
		background: #ffffff;
		border: 3rpx solid #e8e8e8;
		border-radius: 24rpx;
	}

	.insurance-card:last-child {
		margin-right: 0;
	}

	.insurance-card.active {
		border-color: #FF6700;
		background: #FFF7F0;
	}

	.insurance-name {
		font-size: 24rpx;
		color: #555555;
	}

	.insurance-price {
		margin-top: 8rpx;
		font-size: 26rpx;
		font-weight: 700;
		color: #FF6700;
	}

	/* ===== 图文详情 ===== */
	.body-section {
		display: flex;
		flex-direction: column;
		margin-top: 16rpx;
		padding: 20rpx 0rpx;
		background: #ffffff;
	}

	.body-detail {
		width: 100%;
		margin-top: 16rpx;
	}

	/* 图文详情标题：居中 + 左右装饰线，和增值保障的普通小标题区分开 */
	.body-title {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 8rpx;
	}

	.body-title-line {
		flex: 1;
		height: 1rpx;
		background: #e0e0e0;
	}

	.body-title-text {
		margin: 0 24rpx;
		font-size: 30rpx;
		font-weight: bold;
		color: #333333;
	}

	/* ===== 底部固定栏 ===== */
	.footer-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 999;
		display: flex;
		align-items: center;
		height: 100rpx;
		padding-bottom: env(safe-area-inset-bottom);
		background: #ffffff;
		box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
	}

	/* 收藏 / 购物车 图标项：竖排 图标 + 文字 */
	.footer-icon {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100rpx;
	}

	.footer-cart-wrap {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.footer-cart-badge {
		position: absolute;
		top: -8rpx;
		right: -16rpx;
		min-width: 28rpx;
		height: 28rpx;
		padding: 0 6rpx;
		border-radius: 14rpx;
		background: #ff4d4f;
		color: #ffffff;
		font-size: 18rpx;
		line-height: 28rpx;
		text-align: center;
		box-sizing: border-box;
	}
	.footer-cart {
		font-size: 40rpx;
		color: #333333;
	}

	.footer-icon-text {
		margin-top: 4rpx;
		font-size: 20rpx;
		color: #999999;
		line-height: 1;
	}

	.footer-icon-text.favorited {
		color: #FF6700;
	}

	/* 加入购物车 / 立即购买：占满剩余宽度 */
	.footer-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 76rpx;
		font-size: 28rpx;
		font-weight: 600;
	}

	.add-btn {
		margin: 0 12rpx 0 8rpx;
		border-radius: 40rpx;
		background: #FFF3E8;
		color: #FF6700;
	}

	/* 加购请求中置灰 */
	.add-btn.loading {
		opacity: 0.6;
	}

	.buy-btn {
		margin-right: 20rpx;
		border-radius: 40rpx;
		background: linear-gradient(135deg, #FF4E2A, #FF7A00);
		color: #ffffff;
	}
</style>
