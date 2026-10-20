<template>
	<view class="page">
		<!-- 自定义导航栏：标题固定「我的订单」 -->
		<CustomNavbar title="我的订单" :show-back="true" />

		<!-- 搜索框：订单号/商品名/收货人，回车或点搜索触发 -->
		<view class="search-box">
			<input
				class="search-input"
				v-model="keyword"
				placeholder="订单号/商品名"
				confirm-type="search"
				@confirm="search"
			/>
			<view class="search-btn" @click="search">搜索</view>
		</view>

		<!-- 状态 Tab：横向滚动，切换筛订单 -->
		<scroll-view scroll-x class="tabs-scroll">
			<view class="tabs">
				<view
					class="tab-item"
					:class="{ active: activeIndex === index }"
					v-for="(tab, index) in tabs"
					:key="index"
					@click="changeTab(index)"
				>
					{{ tab.title }}
				</view>
			</view>
		</scroll-view>

		<!-- 售后 Tab：售后单列表还没做，先占位 -->
		<view v-if="isAfterSaleTab" class="empty">
			<text class="empty-text">售后功能开发中</text>
		</view>

		<!-- 订单列表：复用 OrderCard，底部按状态填不同按钮 -->
		<view v-else-if="orders.length" class="order-list">
			<OrderCard
				v-for="order in orders"
				:key="order.id"
				:order="order"
				:closed="isExpired(order)"
				:status-text="isExpired(order) ? '已关闭' : ''"
				@click="goDetail"
			>
				<template #foot>
					<view class="order-foot">
						<!-- 待付款：倒计时 + 取消 + 付款；超时只留提示 -->
						<template v-if="isPendingPay(order)">
							<template v-if="!isExpired(order)">
								<text class="time-tip">剩余 {{ countdownText(order) }}</text>
								<view class="btn-cancel" @click.stop="handleCancel(order)">取消订单</view>
								<view class="btn-pay" @click.stop="handlePay(order)">付款</view>
							</template>
							<template v-else>
								<text class="time-tip closed-tip">订单已超时关闭</text>
							</template>
						</template>
						<!-- 已取消：删除 / 再来一单 -->
						<template v-else-if="isClosed(order)">
							<view class="btn-delete" @click.stop="deleteOrder(order)">删除订单</view>
							<view class="btn-buy-again" @click.stop="buyAgain(order)">再来一单</view>
						</template>
						<!-- 已发货（待收货）：确认收货 -->
						<template v-else-if="isShipped(order)">
							<text class="order-time">{{ formatOrderTime(order.createdAt) }}</text>
							<view class="btn-confirm" @click.stop="confirmReceive(order)">确认收货</view>
						</template>
						<!-- 其它（待发货/已完成）：下单时间 + 合计 -->
						<template v-else>
							<text class="order-time">{{ formatOrderTime(order.createdAt) }}</text>
							<view class="order-total">
								<text class="total-label">共{{ totalCount(order) }}件 合计</text>
								<text class="total-price">¥{{ fmtMoney(order.payAmount) }}</text>
							</view>
						</template>
					</view>
				</template>
			</OrderCard>
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
		deleteOrder as deleteOrderApi,
		finishOrder,
		payOrder as payOrderApi,
		cancelOrder as cancelOrderApi
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
		fmtMoney,
		formatOrderTime,
		parseOrderTime
	} from '../../utils/format.js'
	import OrderCard from './order-card.vue'

	// 待付款超时时长：与后端 OrderServiceImpl.PENDING_PAY_TIMEOUT_SECONDS（1800 秒 = 30 分钟）一致
	const PAY_TIMEOUT_MS = 30 * 60 * 1000

	export default {
		components: {
			OrderCard
		},
		data() {
			return {
				// 6 个 Tab：statuses 为 null 表示不过滤（全部）；售后是独立数据，占位
				tabs: [
					{ title: '全部', statuses: null },
					{ title: '待付款', statuses: [1] },
					{ title: '待发货', statuses: [2, 3] },
					{ title: '待收货', statuses: [4] },
					{ title: '评论', statuses: [5] },
					{ title: '售后', afterSale: true }
				],
				activeIndex: 0, // 当前选中 Tab
				keyword: '', // 搜索关键词（订单号/商品名/收货人）
				allOrders: [], // 一次拉取的全部订单
				orders: [], // 当前 Tab 过滤后的订单
				loaded: false, // 是否完成首次加载
				now: Date.now() // 当前时间戳，每秒刷新驱动倒计时
			}
		},
		computed: {
			// 当前是否「售后」Tab（占位，售后单列表未做）
			isAfterSaleTab() {
				return !!this.tabs[this.activeIndex].afterSale
			}
		},
		onLoad(options) {
			// 从「我的」页跳转带 status 参数，定位到对应 Tab（如 status=3 → 待发货、status=4 → 待收货）
			const status = Number(options.status)
			if (!status) {
				return
			}
			const index = this.tabs.findIndex(tab => tab.statuses && tab.statuses.includes(status))
			if (index !== -1) {
				this.activeIndex = index
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
			fmtMoney,
			formatOrderTime,
			// 切换 Tab：重新按状态过滤
			changeTab(index) {
				this.activeIndex = index
				this.filterOrders()
			},
			// 搜索：带关键词重拉订单（后端按订单号/收货人/商品名模糊匹配）
			search() {
				this.loadOrders()
			},
			// 点订单卡片：按状态跳对应详情页（待发货 → pending-ship；其他状态详情页未建，暂不跳）
			goDetail(order) {
				const status = Number(order.orderStatus)
				if (status === 2 || status === 3) {
					uni.navigateTo({ url: '/pages/order/pending-ship?id=' + order.id })
				}
			},
			// 拉全部订单，预计算待付款订单的超时时间戳，再按当前 Tab 过滤
			loadOrders() {
				ensureLogin()
					.then(() => listOrders(this.keyword))
					.then((list) => {
						list = list || []
						this.allOrders = list.map(o => {
							if (Number(o.orderStatus) === 1) {
								o._expireTime = parseOrderTime(o.createdAt) + PAY_TIMEOUT_MS
							}
							return o
						})
						this.filterOrders()
					})
					.catch(() => {
						// 错误提示已在 request 封装里统一处理
					})
					.finally(() => {
						this.loaded = true
					})
			},
			// 按当前 Tab 的状态码过滤
			filterOrders() {
				const statuses = this.tabs[this.activeIndex].statuses
				this.orders = statuses == null ?
					this.allOrders :
					this.allOrders.filter(o => statuses.includes(Number(o.orderStatus)))
			},
			// 倒计时：每秒把 now 更新成当前时间
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
			// 是否待付款（status=1）
			isPendingPay(order) {
				return Number(order.orderStatus) === 1
			},
			// 是否已取消（status=6）
			isClosed(order) {
				return Number(order.orderStatus) === 6
			},
			// 是否已发货（status=4，用户视角待收货）
			isShipped(order) {
				return Number(order.orderStatus) === 4
			},
			// 是否超时（前端临时标记，后端定时任务每分钟扫一次才真正改状态）
			isExpired(order) {
				return order._expireTime != null && order._expireTime <= this.now
			},
			// 剩余时间文案：MM : SS
			countdownText(order) {
				const remain = order._expireTime - this.now
				if (remain <= 0) {
					return '0分0秒'
				}
				const m = Math.floor(remain / 60000)
				const s = Math.floor((remain % 60000) / 1000)
				return String(m).padStart(2, '0') + ' : ' + String(s).padStart(2, '0')
			},
			// 付款：待付款 → 待确认，成功后刷新
			handlePay(order) {
				payOrderApi(order.id).then(() => {
					uni.showToast({ title: '支付成功', icon: 'success' })
					this.loadOrders()
				}).catch(() => {})
			},
			// 取消订单：成功后刷新
			handleCancel(order) {
				cancelOrderApi(order.id).then(() => {
					uni.showToast({ title: '订单已取消', icon: 'success' })
					this.loadOrders()
				}).catch(() => {})
			},
			// 确认收货：已发货 → 已完成，成功后刷新
			confirmReceive(order) {
				finishOrder(order.id).then(() => {
					uni.showToast({ title: '已确认收货', icon: 'success' })
					this.loadOrders()
				}).catch(() => {})
			},
			// 删除订单：软删，成功后刷新
			deleteOrder(order) {
				deleteOrderApi(order.id).then(() => {
					uni.showToast({ title: '已删除', icon: 'success' })
					this.loadOrders()
				}).catch(() => {})
			},
			// 再来一单：把订单商品重新加入购物车
			buyAgain(order) {
				const items = order.items || []
				if (!items.length) {
					return
				}
				uni.showLoading({ title: '加入购物车中...' })
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
					})
			},
			// 订单商品总件数
			totalCount(order) {
				return (order.items || []).reduce((s, i) => s + (i.quantity || 0), 0)
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

	/* ═══ 搜索框 ═══ */
	.search-box {
		display: flex;
		align-items: center;
		background: #ffffff;
		padding: 16rpx 20rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.search-input {
		flex: 1;
		height: 60rpx;
		background: #f5f5f5;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 26rpx;
	}

	.search-btn {
		margin-left: 16rpx;
		padding: 0 32rpx;
		height: 60rpx;
		line-height: 60rpx;
		background: #FF6700;
		color: #ffffff;
		border-radius: 8rpx;
		font-size: 26rpx;
	}

	/* ═══ Tab 栏 ═══ */
	.tabs-scroll {
		white-space: nowrap;
		background: #ffffff;
		margin-bottom: 20rpx;
	}

	.tabs {
		display: flex;
	}

	.tab-item {
		padding: 24rpx 30rpx;
		font-size: 30rpx;
		color: #666666;
		position: relative;
	}

	.tab-item.active {
		color: #FF6700;
		font-weight: bold;
	}

	.tab-item.active::after {
		content: "";
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 40rpx;
		height: 4rpx;
		background: #FF6700;
		border-radius: 2rpx;
	}

	.order-list {
		padding: 0 20rpx;
	}

	/* ═══ 卡片底 ═══ */
	.order-foot {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 18rpx 0 20rpx;
		border-top: 1rpx solid #f0f0f0;
	}

	.order-time {
		margin-right: auto;
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

	/* 待付款倒计时 */
	.time-tip {
		margin-right: auto;
		font-size: 26rpx;
		color: #f56c6c;
	}

	.time-tip.closed-tip {
		color: #999999;
	}

	/* 各按钮 */
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

	.btn-cancel {
		padding: 14rpx 22rpx;
		margin-right: 20rpx;
		color: #333333;
		font-size: 22rpx;
	}

	.btn-pay {
		padding: 10rpx 52rpx;
		background: #FF6700;
		color: #ffffff;
		border-radius: 40rpx;
		font-size: 28rpx;
	}

	.btn-confirm {
		padding: 10rpx 36rpx;
		background: #FF6700;
		color: #ffffff;
		border-radius: 32rpx;
		font-size: 26rpx;
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
