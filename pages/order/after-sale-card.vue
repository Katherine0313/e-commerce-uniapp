<template>
	<view class="after-sale-card" @click="$emit('click', afterSale)">
		<!-- 头部：售后类型 + 状态 -->
		<view class="card-head">
			<text class="type">{{ afterSale.afterSaleTypeDesc }}</text>
			<text class="status">{{ afterSale.statusDesc }}</text>
		</view>
		<!-- 商品明细 -->
		<view class="goods-item" v-for="item in afterSale.items" :key="item.productId">
			<image class="goods-img" :src="goodsImgUrl(item.image, item.productId)" mode="aspectFill"></image>
			<view class="goods-info">
				<text class="goods-name">{{ item.productName }}</text>
				<text class="goods-qty">×{{ item.quantity }}</text>
			</view>
		</view>
		<!-- 底部：申请时间 + 金额 -->
		<view class="card-foot">
			<text class="time">{{ formatOrderTime(afterSale.createdAt) }}</text>
			<text class="amount">¥{{ fmtMoney(refundTotal) }}</text>
		</view>
	</view>
</template>

<script>
	import {
		goodsImgUrl,
		fmtMoney,
		formatOrderTime
	} from '../../utils/format.js'

	export default {
		name: 'AfterSaleCard',
		props: {
			afterSale: {
				type: Object,
				required: true
			}
		},
		computed: {
			// 售后金额 = 明细单品小计之和
			refundTotal() {
				return (this.afterSale.items || []).reduce((sum, i) => sum + (Number(i.refundAmount) || 0), 0)
			}
		},
		methods: {
			goodsImgUrl,
			fmtMoney,
			formatOrderTime
		}
	}
</script>

<style scoped>
	.after-sale-card {
		margin: 20rpx 0 0;
		padding: 0 24rpx;
		background: #ffffff;
		border-radius: 16rpx;
	}

	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 80rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.type {
		font-size: 28rpx;
		color: #333333;
		font-weight: bold;
	}

	.status {
		font-size: 26rpx;
		color: #FF6700;
	}

	.goods-item {
		display: flex;
		align-items: center;
		padding: 18rpx 0;
	}

	.goods-item + .goods-item {
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
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.goods-name {
		font-size: 26rpx;
		color: #333333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.goods-qty {
		font-size: 24rpx;
		color: #999999;
	}

	.card-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18rpx 0;
		border-top: 1rpx solid #f0f0f0;
	}

	.time {
		font-size: 22rpx;
		color: #999999;
	}

	.amount {
		font-size: 26rpx;
		color: #333333;
	}
</style>
