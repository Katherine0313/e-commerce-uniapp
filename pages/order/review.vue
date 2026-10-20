<template>
	<view class="page">
		<CustomNavbar title="填写评价" :show-back="true" />

		<view class="coupon-tip">参与晒单最多可得 <text class="coupon-amount">1.00 元</text> 优惠券</view>

		<view class="goods-card" v-if="product">
			<image class="goods-img" :src="goodsImgUrl(product.image, product.productId)" mode="aspectFill"></image>
			<view class="goods-info">
				<text class="goods-name">{{ product.productName }}</text>
				<view class="goods-bottom">
					<text class="goods-price">¥{{ fmtMoney(product.salesPrice) }}</text>
					<text class="goods-qty">x{{ product.quantity }}</text>
				</view>
			</view>
		</view>

		<view class="rate-block">
			<text class="rate-label">描述相符</text>
			<view class="stars">
				<uni-icons
					v-for="i in 5"
					:key="i"
					:type="i <= rating ? 'star-filled' : 'star'"
					size="36"
					:color="i <= rating ? '#FF4E2A' : '#e0e0e0'"
					@click="rating = i"
				/>
			</view>
		</view>

		<view class="tags">
			<view
				v-for="tag in tagOptions"
				:key="tag"
				class="tag-item"
				:class="{ active: selectedTag === tag }"
				@click="selectedTag = tag"
			>{{ tag }}</view>
		</view>

		<view class="input-block">
			<textarea
				class="review-input"
				v-model="content"
				placeholder="填写评价，可以帮助更多想买的人哦～"
				:maxlength="500"
			/>
			<text class="input-tip">详细描述 (至少输入 5 个字)</text>
		</view>

		<view class="upload-row">
			<view class="upload-box">
				<uni-icons type="image" size="32" color="#cccccc"></uni-icons>
				<text class="upload-text">图片上传</text>
			</view>
			<view class="upload-box">
				<uni-icons type="videocam" size="32" color="#cccccc"></uni-icons>
				<text class="upload-text">视频上传</text>
			</view>
		</view>

		<view class="footer-bar">
			<view class="submit-btn" @click="submit">提交评价</view>
		</view>
	</view>
</template>

<script>
	import {
		getOrder
	} from '../../api/order.js'
	import {
		goodsImgUrl,
		fmtMoney
	} from '../../utils/format.js'

	export default {
		data() {
			return {
				orderId: null,
				product: null,
				rating: 5,
				tagOptions: ['性价比高', '品质惊艳', '物美价廉', '发货很快'],
				selectedTag: '',
				content: ''
			}
		},
		onLoad(options) {
			this.orderId = options.orderId
			if (this.orderId) {
				this.loadProduct()
			}
		},
		methods: {
			goodsImgUrl,
			fmtMoney,
			loadProduct() {
				getOrder(this.orderId).then((order) => {
					this.product = (order.items && order.items[0]) || null
				}).catch(() => {})
			},
			submit() {
				const content = this.content.trim()
				if (content.length < 5) {
					uni.showToast({
						title: '请至少输入 5 个字',
						icon: 'none'
					})
					return
				}
				const form = {
					orderId: this.orderId,
					productId: this.product ? this.product.productId : null,
					rating: this.rating,
					tag: this.selectedTag,
					content: content
				}
				console.log('评价表单数据：', form)
				uni.showToast({
					title: '评价已提交',
					icon: 'success'
				})
				setTimeout(() => {
					uni.redirectTo({
						url: '/pages/order/list'
					})
				}, 600)
			}
		}
	}
</script>

<style scoped>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: #f5f5f5;
		padding-bottom: 160rpx;
	}

	.coupon-tip {
		text-align: center;
		font-size: 26rpx;
		color: #666666;
		padding: 20rpx;
	}

	.coupon-amount {
		color: #FF4E2A;
		font-weight: bold;
	}

	.goods-card {
		display: flex;
		align-items: center;
		background: #ffffff;
		margin: 0 20rpx 20rpx;
		border-radius: 16rpx;
		padding: 24rpx;
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
		height: 120rpx;
		margin-left: 20rpx;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.goods-name {
		font-size: 28rpx;
		color: #333333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.goods-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.goods-price {
		font-size: 30rpx;
		color: #f44;
	}

	.goods-qty {
		font-size: 26rpx;
		color: #999999;
	}

	.rate-block {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #ffffff;
		margin: 0 20rpx 20rpx;
		border-radius: 16rpx;
		padding: 24rpx;
	}

	.rate-label {
		font-size: 28rpx;
		color: #333333;
	}

	.stars {
		display: flex;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 20rpx;
		background: #ffffff;
		margin: 0 20rpx 20rpx;
		border-radius: 16rpx;
		padding: 24rpx;
	}

	.tag-item {
		padding: 8rpx 28rpx;
		border: 1rpx solid #dddddd;
		border-radius: 32rpx;
		font-size: 24rpx;
		color: #666666;
	}

	.tag-item.active {
		border-color: #FF4E2A;
		color: #FF4E2A;
		background: #fff5f2;
	}

	.input-block {
		background: #ffffff;
		margin: 0 20rpx 20rpx;
		border-radius: 16rpx;
		padding: 24rpx;
	}

	.review-input {
		width: 100%;
		height: 160rpx;
		font-size: 28rpx;
		line-height: 1.6;
	}

	.input-tip {
		display: block;
		margin-top: 12rpx;
		font-size: 22rpx;
		color: #999999;
	}

	.upload-row {
		display: flex;
		justify-content: space-between;
		background: #ffffff;
		margin: 0 20rpx 20rpx;
		border-radius: 16rpx;
		padding: 24rpx;
	}

	.upload-box {
		width:200rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 120rpx;
		gap: 8rpx;
		border: 2rpx dashed #dddddd;
		border-radius: 12rpx;
	}

	.upload-text {
		font-size: 24rpx;
		color: #999999;
	}

	.footer-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 16rpx 20rpx;
		padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
		background: #ffffff;
		box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
	}

	.submit-btn {
		height: 88rpx;
		line-height: 88rpx;
		text-align: center;
		background: #FF4E2A;
		color: #ffffff;
		border-radius: 44rpx;
		font-size: 30rpx;
	}
</style>
