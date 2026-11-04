<template>
	<FloatingChat />
	<view class="page">
		<!-- 自定义导航栏：二级页，带返回按钮 -->
		<CustomNavbar title="提交订单" :show-back="true" />

		<!-- 收货地址卡：点开选地址 -->
		<view class="address-card" @click="showAddress = true">
			<block v-if="address">
				<view class="address-main">
					<view class="address-main-l">
						<view>
							<text class="addr-name">{{ address.consignee }}</text>
							<text class="addr-phone">{{ address.phone }}</text>
						</view>
						<view class="address-detail">
							<text v-if="address.isDefault === 1" class="addr-default">默认</text>
							<text class="addr-text">{{ formatRegion(address.region) }}
								{{ address.detailAddress }}</text>
						</view>
					</view>
				</view>
				<view class="addr-arrow"></view>
			</block>
			<view v-else class="address-empty">请选择收货地址</view>
		</view>

		<!-- 商品列表 -->
		<view class="card">
			<view class="goods-item" v-for="(item, idx) in items" :key="idx">
				<image lazy-load class="goods-img" :src="imgUrl(item)" mode="aspectFill"></image>
				<view class="goods-info">
					<text class="goods-name">{{ item.name }}</text>
					<view class="goods-price-row">
						<text class="goods-price">¥{{ fmt(item.price) }}</text>
						<text v-if="item.originalPrice" class="goods-origin">¥{{ fmt(item.originalPrice) }}</text>
						<text v-if="item.promotionTag" class="goods-tag">{{ item.promotionTag }}</text>
						<text class="goods-qty">×{{ item.quantity }}</text>
					</view>
					<text v-if="num(item.insuranceFee) > 0" class="goods-insurance">增值保障
						¥{{ fmt(item.insuranceFee) }}</text>
				</view>
				<text class="goods-sub">¥{{ fmt(item.subTotal) }}</text>
			</view>
		</view>

		<!-- 配送 / 留言 -->
		<view class="card">
			<view class="detail-row">
				<text class="detail-label">配送方式</text>
				<text class="detail-val">商家配送</text>
			</view>
			<view class="detail-row">
				<text class="detail-label">快递费用</text>
				<text class="detail-val free">免运费</text>
			</view>
			<view class="detail-row">
				<text class="detail-label">买家留言</text>
				<input class="detail-input" v-model="remark" placeholder="选填" placeholder-class="ph" />
			</view>
		</view>

		<!-- 金额汇总：商品总价 → 促销优惠 → 优惠券 → 应付金额 -->
		<view class="card">
			<view class="detail-row">
				<text class="detail-label">商品总价</text>
				<text class="detail-val">¥{{ fmt(originalTotal) }}</text>
			</view>
			<view v-if="promotionDiscount > 0" class="detail-row">
				<text class="detail-label">促销优惠</text>
				<text class="detail-val discount">-¥{{ fmt(promotionDiscount) }}</text>
			</view>
			<view class="detail-row" @click="openCoupon">
				<text class="detail-label">优惠券</text>
				<view class="coupon-entry">
					<text v-if="couponDiscount > 0" class="detail-val discount">-¥{{ fmt(couponDiscount) }}</text>
					<text v-else-if="availableCoupons.length" class="coupon-tip">{{ usableCouponCount }} 张可用</text>
					<text v-else class="coupon-tip">暂无可用</text>
					<uni-icons type="right" size="14" color="#999999"></uni-icons>
				</view>
			</view>
			<view class="detail-row">
				<text class="detail-label">应付金额</text>
				<text class="detail-val total">¥{{ fmt(payableAmount) }}</text>
			</view>
		</view>

		<!-- 优惠券选择弹层 -->
		<view v-if="couponVisible" class="coupon-mask" @click="couponVisible = false">
			<view class="coupon-sheet" @click.stop>
				<view class="coupon-sheet-head">
					<text class="coupon-sheet-title">选择优惠券</text>
					<text class="coupon-sheet-close" @click="couponVisible = false">×</text>
				</view>
				<scroll-view scroll-y class="coupon-sheet-body">
					<view class="coupon-option" :class="{ active: !selectedCouponId }" @click="selectCoupon(null)">
						<text class="coupon-option-name">不使用优惠券</text>
						<uni-icons v-if="!selectedCouponId" type="checkmarkempty" size="20" color="#FF6700"></uni-icons>
					</view>
					<view v-for="c in availableCoupons" :key="c.userCouponId" class="coupon-option"
					      :class="{ active: selectedCouponId === c.userCouponId, disabled: !c.usable }"
					      @click="c.usable && selectCoupon(c)">
						<view class="coupon-option-info">
							<text class="coupon-option-name">{{ c.name }}</text>
							<text class="coupon-option-reason">
								{{ c.usable ? '可减 ¥' + fmt(c.discountAmount) : c.reason }}
							</text>
						</view>
						<uni-icons v-if="selectedCouponId === c.userCouponId" type="checkmarkempty" size="20"
						           color="#FF6700"></uni-icons>
					</view>
					<view v-if="!availableCoupons.length" class="coupon-empty">
						<text>暂无可用优惠券</text>
					</view>
				</scroll-view>
			</view>
		</view>


		<!-- 支付方式：提交订单时预选，提交后进待付款，付款时按此方式结算 -->
		<view class="card">
			<view class="pay-item" v-for="(item, idx) in payList" :key="item.code" @click="activePay = idx">
				<uni-icons :type="item.icon" size="40rpx" :color="item.color"></uni-icons>
				<text class="pay-name">{{ item.name }}</text>
				<view class="pay-radio" :class="{ checked: activePay === idx }">
					<uni-icons v-if="activePay === idx" type="checkmarkempty" size="24rpx" color="#ffffff">
					</uni-icons>
				</view>
			</view>
		</view>
		<!-- 收货地址弹窗（全局组件）：选地址 / 新增编辑 -->
		<AddressPopup :show="showAddress" @select="onAddressSelect" @close="closeAddress" @saved="onAddressSaved" />

		<!-- 底部结算栏 -->
		<view class="bottom-bar">
			<view class="total">
				<text class="total-label">合计：</text>
				<text class="total-price">¥{{ fmt(payableAmount) }}</text>
			</view>
			<view class="pay-btn" :class="{ disabled: paying }" @click="handlePay">
				{{ paying ? '提交中...' : '提交订单' }}
			</view>
		</view>
		<!-- 模拟微信支付弹窗（组件封装）：6 位密码框 + 数字键盘，输满 6 位自动支付 -->
		<PayPopup :visible="showPayPopup" :amount="pendingOrder ? pendingOrder.payAmount : 0"
			:loading="paying" @close="closePay" @confirm="confirmPay" />

	</view>
</template>

<script>
	import {
		createOrder,
		payOrder,
		quoteOrder,
		genIdempotencyKey
	} from '../../api/order.js'
	import {
		clearCart
	} from '../../api/cart.js'
	import {
		getAvailableCoupons
	} from '../../api/coupon.js'
	import {
		listAddress
	} from '../../api/address.js'
	import {
		ensureLogin
	} from '../../utils/auth.js'
	import {
		BASE_URL
	} from '../../utils/server-api.js'
	import {
		useCartStore
	} from '../../store/cart.js'
	import {
		requestUnpaidSubscribe
	} from './subscribe.js'
	import PayPopup from './pay-popup.vue'

	export default {
		components: {
			PayPopup
		},
		data() {
			return {
				items: [], // 待结算商品快照（购物车「去结算」时存入 store）
				address: null, // 当前选中的收货地址
				remark: '', // 买家留言
				showAddress: false, // 地址弹窗显隐
				paying: false, // 提交中，防重复点击
				idempotencyKey: '', // 幂等键：进入页面生成一次，本页内重试复用
				activePay: 0, // 当前选中的支付方式下标
				// 支付方式列表：提交订单时预选，付款时按此方式（目前仅微信）结算
				payList: [{
					code: 'WeChat',
					name: '微信支付',
					icon: 'weixin',
					color: '#07C160'
				}],
				showPayPopup: false, // 模拟支付弹窗显隐
				pendingOrder: null, // 下单成功后待支付的订单（弹窗里展示金额，用它调 payOrder）
				quote: null, // 后端实时报价（促销 + 券），仅用于展示；下单时后端会重新计算
				availableCoupons: [], // 当前订单可用券
				selectedCouponId: null, // 选中的用户券 id
				selectedCoupon: null, // 选中的券对象
				couponVisible: false // 选券弹层
			}
		},
		computed: {
			// 合计金额 = 各商品小计之和（购物车价已含直减，不含满减），报价未返回时兜底用
			totalAmount() {
				return this.items.reduce((sum, i) => sum + this.num(i.subTotal), 0)
			},
			// 增值保障总额：保险不参与促销
			insuranceTotal() {
				return this.items.reduce((sum, i) => sum + this.num(i.insuranceFee) * this.num(i.quantity), 0)
			},
			// 活动前金额 = 报价原价 + 保险
			originalTotal() {
				return this.quote ? this.num(this.quote.originalAmount) + this.insuranceTotal : this.totalAmount
			},
			// 促销优惠（直减 + 满减，不含保险）
			promotionDiscount() {
				return this.quote ? this.num(this.quote.promotionDiscount) : 0
			},
			// 优惠券优惠（不含保险）
			couponDiscount() {
				return this.quote ? this.num(this.quote.couponDiscount) : 0
			},
			// 可用券数量
			usableCouponCount() {
				return this.availableCoupons.filter(c => c.usable).length
			},
			// 应付金额 = 报价应付 + 保险
			payableAmount() {
				return this.quote ? this.num(this.quote.payAmount) + this.insuranceTotal : this.totalAmount
			}
		},
		onLoad() {
			// 从 store 读购物车去结算传入的选中商品
			this.items = useCartStore().checkoutItems || []
			// 幂等键一次下单意图一个：进入页面生成，本页内失败重试复用同一个 key
			this.idempotencyKey = genIdempotencyKey()
			if (!this.items.length) {
				uni.showToast({
					title: '没有待结算商品',
					icon: 'none'
				})
			}
			this.loadAddress()
			this.initCouponQuote()
		},
		methods: {
			// 拉地址列表，取默认地址展示；无默认取第一条
			loadAddress() {
				ensureLogin().then(() => listAddress()).then((list) => {
					list = list || []
					this.address = list.find(a => a.isDefault === 1) || list[0] || null
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
				})
			},
			// 初始化：拉可用券，自动选最优，再按选中券报价；失败退回不用券报价
			initCouponQuote() {
				if (!this.items.length) return
				ensureLogin()
					.then(() => getAvailableCoupons(this.quoteItems()))
					.then((list) => {
						this.availableCoupons = list || []
						const best = (list || []).find(c => c.usable)
						if (best) {
							this.selectedCouponId = best.userCouponId
							this.selectedCoupon = best
						}
					})
					.catch(() => {})
					.then(() => this.loadQuote())
			},
			// 拉实时报价：促销 + 券，展示商品总价/优惠/应付
			loadQuote() {
				if (!this.items.length) return
				const couponId = this.selectedCouponId
				ensureLogin()
					.then(() => quoteOrder(this.quoteItems(), couponId))
					.then((quote) => {
						this.quote = quote || null
					})
					.catch(() => {
						// 券刚好失效/被占用：清掉选择后按不用券重新报价
						if (couponId) {
							this.selectedCouponId = null
							this.selectedCoupon = null
							this.loadQuote()
						}
					})
			},
			// 报价/下单统一入参
			quoteItems() {
				return this.items.map(i => ({
					productId: i.productId,
					quantity: i.quantity
				}))
			},
			openCoupon() {
				this.couponVisible = true
			},
			selectCoupon(coupon) {
				this.selectedCouponId = coupon ? coupon.userCouponId : null
				this.selectedCoupon = coupon || null
				this.couponVisible = false
				this.loadQuote()
			},
			// 选中地址
			onAddressSelect(address) {
				this.address = address
				this.showAddress = false
			},
			// 关闭地址弹窗
			closeAddress() {
				this.showAddress = false
			},
			// 地址增删改后刷新，重新取默认
			onAddressSaved() {
				this.loadAddress()
			},
			// 提交订单：先唤起一次性订阅授权，再下单，最后弹模拟支付
			async handlePay() {
				if (this.paying) {
					return
				}
				if (!this.items.length) {
					return
				}
				if (!this.address) {
					uni.showToast({
						title: '请先选择收货地址',
						icon: 'none'
					})
					return
				}
				this.paying = true

				// 微信规则：requestSubscribeMessage 必须由用户点击触发，
				// 所以放在本方法最前面、任何网络请求之前；用户拒绝也继续下单，只是无法收到提醒
				const subscribeUnpaid = await requestUnpaidSubscribe()

				const orderData = {
					consignee: this.address.consignee,
					phone: this.address.phone,
					region: this.address.region,
					detailAddress: this.address.detailAddress,
					remark: this.remark.trim(),
					idempotencyKey: this.idempotencyKey,
					couponId: this.selectedCouponId,
					// 把授权结果随下单一起保存到 orders.is_subscribe_unpaid
					subscribeUnpaid: subscribeUnpaid,
					// 购物车 insuranceDetail 是数组，下单接口要字符串，这里序列化一下
					items: this.items.map(i => ({
						productId: i.productId,
						quantity: i.quantity,
						insuranceDetail: JSON.stringify(i.insuranceDetail || []),
						insuranceFee: i.insuranceFee || 0
					}))
				}
				createOrder(orderData)
					.then((order) => {
						// 下单成功即清购物车：商品已进订单，无论是否支付都不该留在购物车
						clearCart(this.items.map(i => i.productId)).catch(() => {})
						// 弹出模拟支付弹窗，等用户在弹窗里输满 6 位密码再调 payOrder
						this.pendingOrder = order
						this.showPayPopup = true
					})
					.catch(() => {
						// 下单失败：提示已在 request 封装里统一处理；幂等键不换，用户可直接重试
					})
					.finally(() => {
						this.paying = false
					})
			},
			// 满 6 位自动调用：调支付接口，成功后关闭弹窗返回
			confirmPay() {
				if (this.paying || !this.pendingOrder) {
					return
				}
				this.paying = true
				payOrder(this.pendingOrder.id, this.payList[this.activePay].code)
					.then(() => {
						this.showPayPopup = false
						// 支付成功跳支付成功页，带金额和订单号；redirectTo 替换当前页，避免返回又回到支付流程
						const amount = this.num(this.pendingOrder.payAmount).toFixed(2)
						const orderNo = this.pendingOrder.orderNo || ''
						uni.redirectTo({
							url: '/pages/order/pay-success?amount=' + amount + '&orderNo=' + orderNo
						})
					})
					.catch(() => {
						// 支付失败：弹窗保持打开，组件已清空密码，用户可重输；订单留在待付款
					})
					.finally(() => {
						this.paying = false
					})
			},
			// 关闭支付弹窗（点遮罩或 ×）：不付款，但订单已经创建（待付款）。
			// 跳待付款订单页让用户看到刚创建的订单并继续支付，避免返回上一页又重新下单产生重复订单
			closePay() {
				if (this.paying) {
					return
				}
				this.showPayPopup = false
				uni.redirectTo({
					url: '/pages/order/pending-pay'
				})
			},
			// region 存「省 市 区」空格分隔，展示时去掉空格更紧凑
			formatRegion(region) {
				return (region || '').replace(/\s+/g, '')
			},
			// 商品图：后端 image 是 /image/upload/N.webp 相对路径，需补 BASE_URL；没有则回退后端同命名商品图
			imgUrl(item) {
				const img = item.image
				if (img) {
					return img.indexOf('http') === 0 ? img : BASE_URL + img
				}
				return item.productId ? BASE_URL + '/image/upload/' + item.productId + '.webp' : ''
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
		background: #f5f6f8;
		padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
	}

	/* ═══ 收货地址卡 ═══ */
	.address-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 20rpx 20rpx 0;
		padding: 28rpx 24rpx;
		background: #ffffff;
		border-radius: 16rpx;
	}

	.address-main {
		display: flex;
		align-items: center;
	}

	.address-main-l {
		display: flex;
		flex-direction: column;
	}

	.addr-name {
		font-size: 32rpx;
		font-weight: bold;
		color: #333333;
	}

	.addr-phone {
		margin-left: 16rpx;
		font-size: 26rpx;
		color: #666666;
	}

	.address-detail {
		display: flex;
		align-items: center;
		margin-top: 12rpx;
	}

	.addr-default {
		flex-shrink: 0;
		margin-right: 12rpx;
		padding: 2rpx 12rpx;
		font-size: 20rpx;
		color: #FF6700;
		background: #FFF3E8;
		border-radius: 6rpx;
	}

	.addr-text {
		font-size: 26rpx;
		color: #333333;
	}

	.address-empty {
		flex: 1;
		font-size: 28rpx;
		color: #999999;
	}

	.addr-arrow {
		flex-shrink: 0;
		margin-left: 16rpx;
		width: 16rpx;
		height: 16rpx;
		border-right: 3rpx solid #cccccc;
		border-bottom: 3rpx solid #cccccc;
		transform: rotate(-45deg);
	}

	/* ═══ 通用卡片 ═══ */
	.card {
		margin: 20rpx 20rpx 0;
		padding: 8rpx 14rpx;
		background: #ffffff;
		border-radius: 16rpx;
	}

	/* ═══ 商品列表 ═══ */
	.goods-item {
		display: flex;
		align-items: center;
		padding: 24rpx 4rpx;
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
		margin-left:20rpx;
	}

	.goods-name {
		font-size: 28rpx;
		color: #333333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.goods-price-row {
		display: flex;
		align-items: center;
		margin-top: 10rpx;
	}

	.goods-price {
		font-size: 26rpx;
		color: #999999;
	}

	/* 活动前原价：划线展示 */
	.goods-origin {
		margin-left: 10rpx;
		font-size: 22rpx;
		color: #bbbbbb;
		text-decoration: line-through;
	}

	/* 促销标签 */
	.goods-tag {
		margin-left: 10rpx;
		padding: 0 10rpx;
		font-size: 20rpx;
		color: #FF6700;
		border: 1rpx solid #FF6700;
		border-radius: 6rpx;
	}

	.goods-qty {
		margin-left: 16rpx;
		font-size: 24rpx;
		color: #999999;
	}

	.goods-insurance {
		margin-top: 6rpx;
		font-size: 24rpx;
		color: #999999;
	}

	.goods-sub {
		flex-shrink: 0;
		margin-left: 20rpx;
		font-size: 28rpx;
		font-weight: bold;
		color: #333333;
	}

	/* ═══ 明细行 ═══ */
	.detail-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 22rpx 0;
	}

	.detail-row+.detail-row {
		border-top: 1rpx solid #f5f5f5;
	}

	.detail-label {
		flex-shrink: 0;
		font-size: 26rpx;
		color: #666666;
		margin-right: 10rpx;
	}

	.detail-val {
		font-size: 26rpx;
		color: #333333;
	}

	.detail-val.free {
		color: #52c41a;
	}

	.detail-val.total {
		font-size: 30rpx;
		font-weight: bold;
		color: #FF4E2A;
	}

	/* 活动优惠：品牌橙，区分于应付金额的红色 */
	.detail-val.discount {
		color: #FF6700;
	}

	.coupon-entry {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.coupon-tip {
		font-size: 26rpx;
		color: #FF6700;
	}

	/* ===== 选券弹层 ===== */
	.coupon-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 999;
		display: flex;
		align-items: flex-end;
		background: rgba(0, 0, 0, 0.45);
	}

	.coupon-sheet {
		width: 100%;
		max-height: 70vh;
		padding-bottom: 40rpx;
		background: #ffffff;
		border-radius: 24rpx 24rpx 0 0;
	}

	.coupon-sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 28rpx 32rpx;
		border-bottom: 1rpx solid #f2f2f2;
	}

	.coupon-sheet-title {
		font-size: 30rpx;
		font-weight: bold;
		color: #333333;
	}

	.coupon-sheet-close {
		font-size: 44rpx;
		line-height: 1;
		color: #999999;
	}

	.coupon-sheet-body {
		height: 50vh;
		padding: 10rpx 32rpx;
	}

	.coupon-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 26rpx 0;
		border-bottom: 1rpx solid #f7f7f7;
	}

	.coupon-option.disabled {
		opacity: 0.5;
	}

	.coupon-option-info {
		display: flex;
		flex-direction: column;
	}

	.coupon-option-name {
		font-size: 28rpx;
		color: #333333;
	}

	.coupon-option-reason {
		margin-top: 6rpx;
		font-size: 22rpx;
		color: #999999;
	}

	.coupon-empty {
		padding: 60rpx 0;
		text-align: center;
		font-size: 26rpx;
		color: #999999;
	}

	.detail-input {
		flex: 1;
		margin-left: 24rpx;
		font-size: 26rpx;
		color: #333333;
		text-align: right;
	}

	.ph {
		color: #cccccc;
	}

	/* ═══ 支付方式 ═══ */
	.pay-item {
		display: flex;
		align-items: center;
		padding: 26rpx 0;
	}

	.pay-item+.pay-item {
		border-top: 1rpx solid #f5f5f5;
	}

	.pay-name {
		flex: 1;
		margin-left: 20rpx;
		font-size: 28rpx;
		color: #333333;
	}

	/* 单选圈：未选中是空心灰圈；选中填品牌橙，里面放一个白勾 */
	.pay-radio {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36rpx;
		height: 36rpx;
		border: 2rpx solid #cccccc;
		border-radius: 50%;
	}

	.pay-radio.checked {
		border-color: #FF6700;
		background: #FF6700;
	}

	/* ═══ 底部结算栏 ═══ */
	.bottom-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 998;
		display: flex;
		align-items: center;
		padding: 0 24rpx;
		padding-bottom: env(safe-area-inset-bottom);
		height: 160rpx;
		background: #ffffff;
		border-top: 1rpx solid #f0f0f0;
		box-sizing: border-box;
	}

	.total {
		flex: 1;
		display: flex;
		align-items: baseline;
	}

	.total-label {
		font-size: 28rpx;
		color: #333333;
	}

	.total-price {
		font-size: 36rpx;
		font-weight: bold;
		color: #FF4E2A;
	}

	.pay-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 220rpx;
		height: 80rpx;
		border-radius: 40rpx;
		font-size: 30rpx;
		font-weight: 600;
		color: #ffffff;
		background: linear-gradient(135deg, #FF4E2A, #FF7A00);
	}

	.pay-btn.disabled {
		opacity: 0.5;
	}

</style>
