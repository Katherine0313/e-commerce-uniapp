<template>
	<view class="page">
		<!-- 自定义导航栏：二级页，带返回按钮 -->
		<CustomNavbar title="待付款" :show-back="true" />

		<!-- 待付款订单列表 -->
		<view v-if="orders.length" class="order-list">
			<view class="order-card" v-for="order in orders" :key="order.id">
				<!-- 订单号 + 复制 + 状态 -->
				<view class="order-head">
					<view class="order-no-wrap">
						<text class="order-no">{{ order.orderNo }}</text>
						<uni-icons type="copy" size="26" color="#999" @click="copyOrderNo(order.orderNo)"></uni-icons>
					</view>
					<text class="order-status" :class="{ closed: isExpired(order) }">
						{{ isExpired(order) ? '已关闭' : order.orderStatusDesc }}
					</text>
				</view>

				<!-- 商品明细：一个订单可能多件，逐件展示 -->
				<view class="goods-row" v-for="item in order.items" :key="item.productId">
					<image class="goods-img" :src="imgUrl(item)" mode="aspectFill"></image>
					<view class="goods-info">
						<text class="goods-name">{{ item.productName }}</text>
						<text class="goods-price">¥{{ fmt(item.salesPrice) }} ×{{ item.quantity }}</text>
					</view>
				</view>

				<!-- 实付金额 -->
				<view class="pay-row">
					<text class="pay-label">实付款：</text>
					<text class="pay-amount">¥{{ fmt(order.payAmount) }}</text>
				</view>

				<!-- 底部按钮区：待付款给倒计时 + 取消 + 付款；超时关闭只留提示 -->
				<view class="btn-row">
					<template v-if="!isExpired(order)">
						<text class="time-tip">剩余 {{ countdownText(order) }}</text>
						<view class="btn cancel" @click="handleCancel(order)">取消订单</view>
						<view class="btn pay" @click="handlePay(order)">付款</view>
					</template>
					<template v-else>
						<text class="time-tip closed-tip">订单已超时关闭</text>
					</template>
				</view>
			</view>
		</view>

		<!-- 空态 -->
		<view v-else-if="loaded" class="empty">
			<text class="empty-text">暂无待付款订单</text>
		</view>
	</view>
</template>

<script>
	import {
		listOrders,
		payOrder,
		cancelOrder
	} from '../../api/order.js'
	import {
		ensureLogin
	} from '../../utils/auth.js'
	import {
		BASE_URL
	} from '../../utils/server-api.js'

	// 待付款超时时长：与后端 OrderServiceImpl.PENDING_PAY_TIMEOUT_SECONDS（1800 秒 = 30 分钟）一致
	const PAY_TIMEOUT_MS = 30 * 60 * 1000

	export default {
		data() {
			return {
				orders: [], // 待付款订单（status=1）
				loaded: false, // 是否完成首次加载
				now: Date.now() // 当前时间戳，每秒刷新驱动所有倒计时
			}
		},
		onShow() {
			this.loadOrders()
			this.startTimer()
		},
		onHide() {
			this.stopTimer()
		},
		onUnload() {
			this.stopTimer()
		},
		methods: {
			// 拉订单，只留待付款（status=1），并预计算每单的超时时间戳
			loadOrders() {
				ensureLogin()
					.then(() => listOrders())
					.then((list) => {
						list = list || []
						this.orders = list
							.filter(o => Number(o.orderStatus) === 1)
							.map(o => {
								o._expireTime = this.parseTime(o.createdAt) + PAY_TIMEOUT_MS
								return o
							})
					})
					.catch(() => {
						// 错误提示已在 request 封装里统一处理
					})
					.finally(() => {
						this.loaded = true
					})
			},
			// 倒计时：每秒把 now 更新成当前时间，模板据此重算剩余时间
			startTimer() {
				this.stopTimer()
				this.now = Date.now()
				this._timer = setInterval(() => {
					this.now = Date.now()
				}, 1000)
			},
			stopTimer() {
				if (this._timer) {
					clearInterval(this._timer)
					this._timer = null
				}
			},
			// 是否已超时（前端临时标记，后端定时任务每分钟扫一次才真正改状态）
			isExpired(order) {
				return order._expireTime <= this.now
			},
			// 剩余时间文案：MM : SS，分秒都补零到两位数
			countdownText(order) {
				const remain = order._expireTime - this.now
				if (remain <= 0) {
					return '0分0秒'
				}
				const m = Math.floor(remain / 60000)
				const s = Math.floor((remain % 60000) / 1000)
				return String(m).padStart(2, '0') + ' : ' + String(s).padStart(2, '0')
			},
			// 复制订单号
			copyOrderNo(no) {
				uni.setClipboardData({
					data: no,
					success: () => uni.showToast({
						title: '已复制',
						icon: 'none'
					})
				})
			},
			// 取消订单：直接调接口（不弹确认），成功后刷新
			handleCancel(order) {
				cancelOrder(order.id).then(() => {
					uni.showToast({
						title: '订单已取消',
						icon: 'success'
					})
					this.loadOrders()
				}).catch(() => {})
			},
			// 付款：调支付接口（暂未接微信收银台，后端记账），成功后从待付款列表消失
			handlePay(order) {
				payOrder(order.id).then(() => {
					uni.showToast({
						title: '支付成功',
						icon: 'success'
					})
					this.loadOrders()
				}).catch(() => {})
			},
			// 商品图：后端 image 是 /image/upload/N.webp 相对路径，需补 BASE_URL；没有则回退本地占位图
			imgUrl(item) {
				const img = item.image
				if (img) {
					return img.indexOf('http') === 0 ? img : BASE_URL + img
				}
				return '/static/image/upload/' + item.productId + '.webp'
			},
			// 后端 LocalDateTime 是 "2026-10-15T17:15:59"，iOS 的 new Date 不支持带 T 的无时区串，
			// 先替换分隔符再解析，兼容两端
			parseTime(str) {
				if (!str) {
					return 0
				}
				// 数字时间戳（毫秒）
				if (typeof str === 'number') {
					return str
				}
				// Jackson 3 序列化 LocalDateTime 可能是数组 [年,月,日,时,分,秒]
				if (Array.isArray(str)) {
					const y = str[0]
					const mo = str[1] || 1
					const d = str[2] || 1
					const h = str[3] || 0
					const mi = str[4] || 0
					const se = str[5] || 0
					const t = new Date(y, mo - 1, d, h, mi, se).getTime()
					return isNaN(t) ? 0 : t
				}
				// 字符串：先直接解析（兼容带时区 ISO），失败再转 / 分隔（iOS 对 - 分隔无时区串支持差）
				const s = String(str)
				let t = new Date(s).getTime()
				if (isNaN(t)) {
					t = new Date(s.replace('T', ' ').replace(/-/g, '/')).getTime()
				}
				return isNaN(t) ? 0 : t
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
	.order-list {
		padding: 0 20rpx;
	}

	.order-card {
		margin-top: 10rpx;
		padding: 24rpx 24rpx;
		background: #ffffff;
		border-radius: 16rpx;
	}

	.order-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14rpx;
	}

	.order-no-wrap {
		display: flex;
		align-items: center;
	}

	.order-no {
		margin-right: 10rpx;
		font-size: 28rpx;
		color: #333333;
	}

	/* 状态：待付款用品牌橙；超时关闭转灰 */
	.order-status {
		font-size: 28rpx;
		font-weight: bold;
		color: #FF6700;
	}

	.order-status.closed {
		color: #999999;
	}

	/* ═══ 商品行 ═══ */
	.goods-row {
		display: flex;
		align-items: center;
		margin-bottom: 14rpx;
	}

	.goods-img {
		width: 100rpx;
		height: 100rpx;
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
		font-size: 30rpx;
		color: #333333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.goods-price {
		display: block;
		margin-top: 12rpx;
		font-size: 26rpx;
		color: #666666;
	}

	/* ═══ 实付金额 ═══ */
	.pay-row {
		display: flex;
		align-items: baseline;
		justify-content: flex-end;
		padding-top: 16rpx;
		border-top: 1rpx solid #f0f0f0;
	}

	.pay-label {
		font-size: 26rpx;
		color: #666666;
	}

	.pay-amount {
		font-size: 34rpx;
		font-weight: bold;
		color: #FF4E2A;
	}

	/* ═══ 底部按钮区 ═══ */
	.btn-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin-top: 18rpx;
	}

	.time-tip {
		margin-right: auto;
		font-size: 26rpx;
		color: #f56c6c;
	}

	.time-tip.closed-tip {
		color: #999999;
	}

	.btn {


	}

	.btn.cancel {
		padding: 14rpx 22rpx;
		margin-right: 20rpx;
		color: #333333;
		font-size: 22rpx;
	}

	.btn.pay {
		padding: 10rpx 52rpx;
		background: #FF6700;
		color: #ffffff;
		border-radius: 40rpx;
		font-size: 28rpx;
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
