<template>
	<FloatingChat />
	<view class="page">
		<CustomNavbar title="我的优惠券" :show-back="true" />

		<!-- 领券入口 -->
		<view class="center-entry" @click="goCenter">
			<text class="center-entry-text">领券中心</text>
			<text class="center-entry-tip">更多优惠等你领</text>
			<uni-icons type="right" size="14" color="#FF6700"></uni-icons>
		</view>

		<!-- 状态页签 -->
		<view class="tabs">
			<view v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: current === tab.value }"
			      @click="switchTab(tab.value)">
				<text>{{ tab.label }}</text>
			</view>
		</view>

		<!-- 券列表 -->
		<view v-if="list.length" class="coupon-list">
			<view v-for="item in list" :key="item.userCouponId" class="coupon-card" :class="{ disabled: item.status !== 'AVAILABLE' }">
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
					<text class="coupon-name">{{ item.name }}</text>
					<text class="coupon-scope">{{ item.typeDesc }} · {{ scopeText(item.scopeType) }}</text>
					<text class="coupon-time">{{ timeText(item) }}</text>
					<text class="coupon-desc" v-if="item.description">{{ item.description }}</text>
				</view>
				<view class="coupon-status">
					<text v-if="item.status === 'AVAILABLE'" class="use-btn" @click="goUse">去使用</text>
					<text v-else class="status-text">{{ item.statusDesc }}</text>
				</view>
			</view>
		</view>

		<view v-else-if="!loading" class="empty">
			<text class="empty-text">{{ emptyText }}</text>
			<view class="empty-btn" @click="goCenter">去领券</view>
		</view>
	</view>
</template>

<script>
	import { getMyCoupons } from '../../api/coupon.js'
	import { ensureLogin } from '../../utils/auth.js'

	// 「可使用」页签收纳所有还没用掉的券：AVAILABLE（现在就能用）/ NOT_STARTED（未生效）/ LOCKED（使用中）
	// 后端只会返回这几种状态；按状态各开一个页签会让后台发到手的券在某个状态下彻底看不见，
	// 所以统一归到「可使用」页签，卡片上再标出「未生效」「使用中」
	const USABLE_STATUS = ['AVAILABLE', 'NOT_STARTED', 'LOCKED']

	export default {
		data() {
			return {
				tabs: [
					{ value: 'AVAILABLE', label: '可使用' },
					{ value: 'USED', label: '已使用' },
					{ value: 'EXPIRED', label: '已过期' }
				],
				current: 'AVAILABLE',
				allList: [],
				list: [],
				loading: false
			}
		},
		computed: {
			emptyText() {
				return this.current === 'AVAILABLE' ? '暂无可用优惠券' : '暂无优惠券'
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			load() {
				this.loading = true
				ensureLogin()
					.then(() => getMyCoupons())
					.then((list) => {
						// 一次拉全量，页签在本地过滤：切页签不用重新请求
						this.allList = list || []
						this.list = this.filterByTab(this.current)
					})
					.catch(() => {})
					.finally(() => {
						this.loading = false
					})
			},
			filterByTab(tab) {
				if (tab === 'USED') return this.allList.filter(c => c.status === 'USED')
				if (tab === 'EXPIRED') return this.allList.filter(c => c.status === 'EXPIRED')
				return this.allList.filter(c => USABLE_STATUS.includes(c.status))
			},
			switchTab(value) {
				if (this.current === value) return
				this.current = value
				this.list = this.filterByTab(value)
			},
			goCenter() {
				uni.navigateTo({ url: '/pages/my/coupon-center' })
			},
			goUse() {
				uni.switchTab({ url: '/pages/index/index' })
			},
			thresholdText(item) {
				const threshold = Number(item.thresholdAmount) || 0
				return threshold > 0 ? '满 ¥' + this.fmt(threshold) + ' 可用' : '无门槛'
			},
			scopeText(scope) {
				return { ALL: '全场通用', CATEGORY: '指定分类', PRODUCT: '指定商品' }[scope] || '全场通用'
			},
			timeText(item) {
				if (item.status === 'USED') {
					return '使用时间：' + (item.usedTime || '-')
				}
				return (item.startTime || '') + ' ~ ' + (item.endTime || '')
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

	.center-entry {
		display: flex;
		align-items: center;
		margin: 20rpx 24rpx;
		padding: 24rpx 28rpx;
		background: #fff3e8;
		border-radius: 16rpx;
	}

	.center-entry-text {
		font-size: 30rpx;
		font-weight: bold;
		color: #FF6700;
	}

	.center-entry-tip {
		flex: 1;
		margin-left: 16rpx;
		font-size: 24rpx;
		color: #b26b2c;
	}

	.tabs {
		display: flex;
		background: #ffffff;
	}

	.tab {
		flex: 1;
		padding: 24rpx 0;
		text-align: center;
		font-size: 28rpx;
		color: #666666;
		border-bottom: 4rpx solid transparent;
	}

	.tab.active {
		color: #FF6700;
		font-weight: bold;
		border-bottom-color: #FF6700;
	}

	.coupon-list {
		padding: 20rpx 24rpx 60rpx;
	}

	.coupon-card {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
		padding: 28rpx 24rpx;
		background: #ffffff;
		border-radius: 16rpx;
	}

	.coupon-card.disabled {
		opacity: 0.55;
	}

	.coupon-left {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 180rpx;
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

	.coupon-name {
		font-size: 30rpx;
		font-weight: bold;
		color: #333333;
	}

	.coupon-scope,
	.coupon-time,
	.coupon-desc {
		margin-top: 6rpx;
		font-size: 22rpx;
		color: #999999;
	}

	.coupon-status {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 120rpx;
	}

	.use-btn {
		padding: 8rpx 20rpx;
		font-size: 24rpx;
		color: #ffffff;
		background: #FF6700;
		border-radius: 24rpx;
	}

	.status-text {
		font-size: 24rpx;
		color: #999999;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 200rpx;
	}

	.empty-text {
		font-size: 28rpx;
		color: #999999;
	}

	.empty-btn {
		margin-top: 30rpx;
		padding: 14rpx 48rpx;
		font-size: 28rpx;
		color: #ffffff;
		background: #FF6700;
		border-radius: 32rpx;
	}
</style>
