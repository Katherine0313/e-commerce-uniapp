<template>
	<FloatingChat />
	<view class="page">
		<CustomNavbar title="领券中心" :show-back="true" />

		<view v-if="list.length" class="coupon-list">
			<view v-for="item in list" :key="item.templateId" class="coupon-card">
				<view class="coupon-left">
					<view class="coupon-value" v-if="item.type === 'DISCOUNT'">
						<text class="value-num">{{ (Number(item.discountRate) * 10).toFixed(1) }}</text>
						<text class="value-unit">折</text>
					</view>
					<view class="coupon-value" v-else>
						<text class="value-unit">¥</text>
						<text class="value-num">{{ fmt(item.faceValue) }}</text>
					</view>
					<text class="coupon-threshold">{{ thresholdText(item) }}</text>
				</view>
				<view class="coupon-right">
					<view class="coupon-name-row">
						<text class="coupon-name">{{ item.name }}</text>
						<text v-if="item.minMemberLevel > 0" class="member-tag">会员专享</text>
					</view>
					<text class="coupon-scope">{{ item.scopeTypeDesc }} · {{ item.targetGroupDesc }}</text>
					<text class="coupon-time">{{ item.validityDesc }}</text>
					<text class="coupon-desc" v-if="item.description">{{ item.description }}</text>
				</view>
				<view class="coupon-action">
					<text v-if="item.claimed" class="claimed-btn">已领取</text>
					<text v-else class="claim-btn" @click="handleClaim(item)">立即领取</text>
					<text class="remain">剩 {{ item.remainQuantity }} 张</text>
				</view>
			</view>
		</view>

		<view v-else-if="!loading" class="empty">
			<text class="empty-text">暂时没有可领取的优惠券</text>
		</view>
	</view>
</template>

<script>
	import { claimCoupon, getCouponCenter } from '../../api/coupon.js'
	import { ensureLogin } from '../../utils/auth.js'

	export default {
		data() {
			return {
				list: [],
				loading: false,
				claiming: false
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			load() {
				this.loading = true
				ensureLogin()
					.then(() => getCouponCenter())
					.then((list) => {
						this.list = list || []
					})
					.catch(() => {})
					.finally(() => {
						this.loading = false
					})
			},
			handleClaim(item) {
				if (this.claiming) return
				this.claiming = true
				claimCoupon(item.templateId)
					.then(() => {
						uni.showToast({ title: '领取成功', icon: 'success' })
						this.load()
					})
					.catch(() => {})
					.finally(() => {
						this.claiming = false
					})
			},
			thresholdText(item) {
				const threshold = Number(item.thresholdAmount) || 0
				return threshold > 0 ? '满 ¥' + this.fmt(threshold) + ' 可用' : '无门槛'
			},
			fmt(value) {
				const n = Number(value)
				return Number.isFinite(n) ? n.toFixed(2) : '0.00'
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background: #f8f8f8;
	}

	.coupon-list {
		padding: 24rpx;
	}

	.coupon-card {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
		padding: 28rpx 24rpx;
		background: #ffffff;
		border-radius: 16rpx;
	}

	.coupon-left {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 170rpx;
		padding-right: 20rpx;
		border-right: 1rpx dashed #eeeeee;
	}

	.coupon-value {
		display: flex;
		align-items: baseline;
		color: #FF6700;
	}

	.value-num {
		font-size: 48rpx;
		font-weight: bold;
	}

	.value-unit {
		font-size: 24rpx;
	}

	.coupon-threshold {
		margin-top: 6rpx;
		font-size: 22rpx;
		color: #999999;
	}

	.coupon-right {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 0 20rpx;
	}

	.coupon-name-row {
		display: flex;
		align-items: center;
	}

	.coupon-name {
		font-size: 30rpx;
		font-weight: bold;
		color: #333333;
	}

	.member-tag {
		margin-left: 10rpx;
		padding: 0 10rpx;
		font-size: 20rpx;
		color: #7A5410;
		background: #F7E3B5;
		border-radius: 6rpx;
	}

	.coupon-scope,
	.coupon-time,
	.coupon-desc {
		margin-top: 6rpx;
		font-size: 22rpx;
		color: #999999;
	}

	.coupon-action {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 140rpx;
	}

	.claim-btn {
		padding: 10rpx 22rpx;
		font-size: 24rpx;
		color: #ffffff;
		background: #FF6700;
		border-radius: 26rpx;
	}

	.claimed-btn {
		padding: 10rpx 22rpx;
		font-size: 24rpx;
		color: #999999;
		background: #f2f2f2;
		border-radius: 26rpx;
	}

	.remain {
		margin-top: 10rpx;
		font-size: 20rpx;
		color: #bbbbbb;
	}

	.empty {
		display: flex;
		justify-content: center;
		padding-top: 220rpx;
	}

	.empty-text {
		font-size: 28rpx;
		color: #999999;
	}
</style>
