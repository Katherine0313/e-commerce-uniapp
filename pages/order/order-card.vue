<template>
	<!-- 订单卡片：头部（订单号+状态）+ 商品明细 + 底部 #foot 插槽。
	     列表页 / 待付款页共用，底部按钮/金额/倒计时由父页面按状态填。
	     点卡片本体 emit click，父页面跳订单详情；foot 插槽里的按钮要自行 @click.stop 阻止冒泡 -->
	<view class="order-card" @click="$emit('click', order)">
		<!-- 头部：订单号（可选复制）+ 状态 -->
		<view class="order-head">
			<view class="order-no-wrap">
				<text class="order-no">{{ order.orderNo }}</text>
				<uni-icons v-if="showCopy" type="copy" size="26" color="#999" @click="copyOrderNo"></uni-icons>
			</view>
			<text v-if="isClosed" class="order-status-pill">{{ statusLabel }}</text>
			<text v-else class="order-status">{{ statusLabel }}</text>
		</view>

		<!-- 商品明细：一个订单可能多件，逐件展示 -->
		<view class="goods-item" v-for="item in order.items" :key="item.productId">
			<image class="goods-img" :src="goodsImgUrl(item.image, item.productId)" mode="aspectFill"></image>
			<view class="goods-info">
				<text class="goods-name">{{ item.productName }}</text>
				<text class="goods-price">¥{{ fmtMoney(item.salesPrice) }}</text>
			</view>
			<view class="goods-info-r">
				<text class="goods-qty">×{{ item.quantity }}</text>
				<view>
					<text class="goods-action" v-if="isRefundable">申请退款</text>
					<text class="goods-action" v-if="isAfterSaleable">申请售后</text>
				</view>
			</view>
		</view>

		<!-- 物流信息：已发货/已完成显示最新一条轨迹，点击进物流详情 -->
		<view class="logistics-row" v-if="order.logisticsStatus" @click.stop="goLogistics">
			<view class="logi-icon">📦</view>
			<view class="logi-text">{{ order.logisticsStatus }} {{ order.latestTrace }}</view>
			<view class="logi-arrow">></view>
		</view>

		<!-- 底部操作区：父页面按状态填充 -->
		<slot name="foot"></slot>
	</view>
</template>

<script>
	import {
		fmtMoney,
		goodsImgUrl
	} from '../../utils/format.js'

	export default {
		name: 'OrderCard',
		props: {
			// 后端 OrderVO
			order: {
				type: Object,
				required: true
			},
			// 是否显示「复制订单号」图标（待付款页用）
			showCopy: {
				type: Boolean,
				default: false
			},
			// 覆盖「关闭」显示：true 灰色胶囊 / false 正常橙字 / null 按 order.orderStatus===6 判断
			closed: {
				type: Boolean,
				default: null
			},
			// 覆盖状态文本：非空用这个，否则用 order.orderStatusDesc
			statusText: {
				type: String,
				default: ''
			}
		},
		computed: {
			// 是否「关闭/取消」展示：优先用父页面传的 closed，否则按后端状态码 6（已取消）
			isClosed() {
				return this.closed != null ? this.closed : (Number(this.order.orderStatus) === 6)
			},
			// 状态文案：优先用父页面覆盖，否则后端中文描述
			statusLabel() {
				return this.statusText || this.order.orderStatusDesc
			},
			// 待发货（2 待确认 / 3 待发货）可申请退款
			isRefundable() {
				const s = Number(this.order.orderStatus)
				return s === 2 || s === 3
			},
			// 已发货（4）可申请售后
			isAfterSaleable() {
				return Number(this.order.orderStatus) === 4
			}
		},
		methods: {
			fmtMoney,
			goodsImgUrl,
			// 复制订单号到剪贴板
			copyOrderNo() {
				uni.setClipboardData({
					data: this.order.orderNo,
					success: () => uni.showToast({
						title: '已复制',
						icon: 'none'
					})
				})
			},
			// 跳物流详情页
			goLogistics() {
				uni.navigateTo({
					url: '/pages/order/logistics?id=' + this.order.id
				})
			}
		}
	}
</script>

<style scoped>
	/* ═══ 订单卡片 ═══ */
	.order-card {
		margin: 20rpx 0 0;
		padding: 0 24rpx;
		background: #ffffff;
		border-radius: 16rpx;
	}

	/* ═══ 头部 ═══ */
	.order-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 80rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.order-no-wrap {
		display: flex;
		align-items: center;
	}

	.order-no {
		margin-right: 10rpx;
		font-size: 24rpx;
		color: #999999;
	}

	/* 正常状态：品牌橙字 */
	.order-status {
		font-size: 26rpx;
		font-weight: bold;
	}

	/* 已取消/关闭状态：灰色胶囊标签 */
	.order-status-pill {
		padding: 6rpx 24rpx;
		background: #f2f2f2;
		color: #888888;
		border-radius: 32rpx;
		font-size: 24rpx;
	}

	/* ═══ 商品明细 ═══ */
	.goods-item {
		display: flex;
		align-items: center;
		padding: 18rpx 0;
	}

	.goods-item+.goods-item {
		border-top: 1rpx solid #f5f5f5;
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

	.goods-info-r {
		display: flex;
		flex-direction: column;
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
		margin: 20rpx 20rpx 14rpx;
		font-size: 26rpx;
		color: #999999;
	}

	.goods-action {
		flex-shrink: 0;
		font-size: 24rpx;
		color: #ccc;
		border-radius: 40rpx;
		border: 1rpx solid #ccc;
		padding: 2rpx 10rpx;
	}

	/* ═══ 物流信息行 ═══ */
	.logistics-row {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-top: 1rpx solid #f5f5f5;
	}

	.logi-icon {
		font-size: 32rpx;
		margin-right: 12rpx;
	}

	.logi-text {
		flex: 1;
		min-width: 0;
		font-size: 24rpx;
		color: #666666;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.logi-arrow {
		flex-shrink: 0;
		font-size: 24rpx;
		color: #cccccc;
		margin-left: 8rpx;
	}
</style>
