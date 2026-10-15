<template>
	<view class="page">
		<!-- 自定义导航栏：二级页，带返回按钮，标题随状态变化 -->
		<CustomNavbar :title="pageTitle" :show-back="true" />

		<!-- 订单列表 -->
		<view v-if="orders.length" class="order-list">
			<view class="order-card" v-for="order in orders" :key="order.id">
				<!-- 卡片头：订单号 + 状态 -->
				<view class="order-head">
					<text class="order-no">订单号 {{ order.orderNo }}</text>
					<text v-if="isClosed(order)" class="order-status-pill">{{ order.orderStatusDesc }}</text>
					<text v-else class="order-status">{{ order.orderStatusDesc }}</text>
				</view>

				<!-- 商品明细 -->
				<view class="goods-item" v-for="item in order.items" :key="item.productId">
					<image class="goods-img" :src="imgUrl(item)" mode="aspectFill"></image>
					<view class="goods-info">
						<text class="goods-name">{{ item.productName }}</text>
						<text class="goods-price">¥{{ fmt(item.salesPrice) }}</text>
					</view>
					<text class="goods-qty">×{{ item.quantity }}</text>
				</view>

				<!-- 卡片底：已取消给「删除订单/再来一单」，其它给下单时间 + 合计 -->
				<view class="order-foot">
					<template v-if="isClosed(order)">
						<view class="btn-delete" @click="deleteOrder(order)">删除订单</view>
						<view class="btn-buy-again" @click="buyAgain(order)">再来一单</view>
					</template>
					<template v-else>
						<text class="order-time">{{ formatTime(order.createdAt) }}</text>
						<view class="order-total">
							<text class="total-label">共{{ totalCount(order) }}件 合计</text>
							<text class="total-price">¥{{ fmt(order.payAmount) }}</text>
						</view>
					</template>
				</view>
			</view>
		</view>

		<!-- 空态：加载完成且没有订单 -->
		<view v-else-if="loaded" class="empty">
			<text class="empty-text">暂无相关订单</text>
		</view>
	</view>
</template>

<script>
	import {
		listOrders,
		deleteOrder as deleteOrderApi
	} from '../../api/order.js'
	import {
		addToCart
	} from '../../api/cart.js'
	import {
		useCartStore
	} from '../../store/cart.js'
	import {
		ensureLogin
	} from '../../utils/auth.js'
	import {
		BASE_URL
	} from '../../utils/server-api.js'

	export default {
		data() {
			return {
				status: '', // onLoad 传入的状态码字符串：'' 表示全部订单
				orders: [], // 订单列表（已在 onShow 里按状态过滤）
				loaded: false // 是否完成首次加载，用于区分「加载中」和「空态」
			}
		},
		computed: {
			// 页面标题：按状态码映射，未知状态兜底「全部订单」
			pageTitle() {
				const map = {
					'1': '待付款',
					'3': '待发货',
					'4': '待收货'
				}
				return map[this.status] || '全部订单'
			},
			// 过滤用的状态码数字；空串转 null 表示不过滤
			statusNum() {
				return this.status ? Number(this.status) : null
			}
		},
		onLoad(options) {
			this.status = options.status || ''
		},
		onShow() {
			// 每次进入都重拉，保证支付/取消后返回列表能刷新
			this.loadOrders()
		},
		methods: {
			// 拉订单列表，按状态过滤。接口只返回全部订单，状态筛选在前端做
			loadOrders() {
				ensureLogin()
					.then(() => listOrders())
					.then((list) => {
						list = list || []
						this.orders = this.statusNum == null
							? list
							: list.filter(o => o.orderStatus === this.statusNum)
					})
					.catch(() => {
						// 错误提示已在 request 封装里统一处理
					})
					.finally(() => {
						this.loaded = true
					})
			},
			// 商品图：后端 image 是 /image/upload/N.webp 相对路径，需补 BASE_URL；没有则回退本地占位图
			imgUrl(item) {
				const img = item.image
				if (img) {
					return img.indexOf('http') === 0 ? img : BASE_URL + img
				}
				return '/static/image/upload/' + item.productId + '.webp'
			},
			// 是否已取消（status=6，含超时关闭）
			isClosed(order) {
				return Number(order.orderStatus) === 6
			},
			// 删除订单：直接软删（is_deleted=1），成功后刷新列表
			deleteOrder(order) {
				deleteOrderApi(order.id).then(() => {
					uni.showToast({ title: '已删除', icon: 'success' })
					this.loadOrders()
				}).catch(() => {})
			},
			// 再来一单：把订单商品重新加入购物车，成功后跳购物车页
			buyAgain(order) {
				const items = order.items || []
				if (!items.length) {
					return
				}
				uni.showLoading({ title: '加入购物车中...' })
				// 逐个重新加购；OrderItemVO 没返回增值保障字段，先传空数组 / 0
				Promise.all(items.map(item => addToCart(item.productId, item.quantity, [], 0)))
					.then(() => {
						uni.hideLoading()
						useCartStore().addQuantity(items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0))
						uni.showToast({ title: '已加入购物车', icon: 'success' })
						setTimeout(() => {
							uni.switchTab({ url: '/pages/cart/cart' })
						}, 800)
					})
					.catch(() => {
						uni.hideLoading()
						// 错误提示已在 request 封装里统一处理
					})
			},
			// 订单商品总件数
			totalCount(order) {
				return (order.items || []).reduce((s, i) => s + (i.quantity || 0), 0)
			},
			// 下单时间：后端 LocalDateTime 序列化成 ISO 串，去掉毫秒、T 换成空格，截到分钟
			formatTime(t) {
				if (!t) {
					return ''
				}
				return String(t).replace('T', ' ').slice(0, 16)
			},
			// 金额统一两位小数展示
			fmt(n) {
				return this.num(n).toFixed(2)
			},
			// 安全转数字：null/undefined 归 0
			num(n) {
				return Number(n) || 0
			}
		}
	}
</script>

<style scoped>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: #f8f8f8;
		padding-bottom: env(safe-area-inset-bottom);
	}

	/* ═══ 订单卡片 ═══ */
	.order-card {
		margin: 20rpx 20rpx 0;
		padding: 0 24rpx;
		background: #ffffff;
		border-radius: 16rpx;
	}

	.order-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 80rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.order-no {
		font-size: 24rpx;
		color: #999999;
	}

	/* 状态文案用品牌橙，作为订单状态提醒 */
	.order-status {
		font-size: 26rpx;
		font-weight: bold;
		color: #FF6700;
	}

	/* ═══ 商品明细 ═══ */
	.goods-item {
		display: flex;
		align-items: center;
		padding: 24rpx 0;
	}

	.goods-item+.goods-item {
		border-top: 1rpx solid #f5f5f5;
	}

	.goods-img {
		width: 120rpx;
		height: 120rpx;
		border-radius: 12rpx;
		flex-shrink: 0;
	}

	.goods-info {
		flex: 1;
		min-width: 0;
		margin-left: 20rpx;
	}

	.goods-name {
		display: block;
		font-size: 28rpx;
		color: #333333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.goods-price {
		display: block;
		margin-top: 10rpx;
		font-size: 26rpx;
		color: #999999;
	}

	.goods-qty {
		flex-shrink: 0;
		margin-left: 20rpx;
		font-size: 26rpx;
		color: #999999;
	}

	/* ═══ 卡片底 ═══ */
	.order-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 0 24rpx;
		border-top: 1rpx solid #f0f0f0;
	}

	.order-time {
		font-size: 22rpx;
		color: #999999;
	}

	.order-total {
		display: flex;
		align-items: baseline;
	}

	.total-label {
		font-size: 24rpx;
		color: #666666;
	}

	.total-price {
		margin-left: 8rpx;
		font-size: 32rpx;
		font-weight: bold;
		color: #FF4E2A;
	}

		/* 已取消状态：灰色胶囊标签 */
	.order-status-pill {
		padding: 6rpx 24rpx;
		background: #f2f2f2;
		color: #888888;
		border-radius: 32rpx;
		font-size: 24rpx;
	}

	/* 删除订单 / 再来一单 */
	.btn-delete {
		padding: 10rpx 32rpx;
		font-size: 22rpx;
		color: #333333;
	}
	.btn-buy-again {
		padding: 4rpx 28rpx;
		border: 1rpx solid #cccccc;
		border-radius: 32rpx;
		font-size: 26rpx;
		color: #333333;
	}

/* ═══ 空态 ═══ */
	.empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 200rpx;
	}

	.empty-text {
		font-size: 28rpx;
		color: #999999;
	}
</style>
