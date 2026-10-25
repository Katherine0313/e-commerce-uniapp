<template>
	<FloatingChat />
	<view class="page">
		<CustomNavbar title="搜索" :show-back="true" />

		<!-- 搜索栏：输入框自动聚焦，回车或点搜索触发 -->
		<view class="search-bar">
			<input
				class="search-input"
				v-model="keyword"
				placeholder="搜索商品"
				confirm-type="search"
				:focus="true"
				@confirm="doSearch"
			/>
			<view class="search-btn" @click="doSearch">搜索</view>
		</view>

		<!-- 搜索结果：两列商品网格 -->
		<view v-if="products.length" class="goods-grid">
			<view class="goods-card" v-for="item in products" :key="item.id" @click="goDetail(item.id)">
				<image lazy-load class="goods-img" :src="goodsImgUrl(item.image, item.id)" mode="aspectFill"></image>
				<view class="goods-info">
					<text class="goods-name">{{ item.name }}</text>
					<view class="goods-bottom">
						<text class="goods-price">¥{{ item.price }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 空态：搜过且无结果 -->
		<view v-else-if="searched" class="empty">
			<text class="empty-text">未找到相关商品</text>
		</view>
	</view>
</template>

<script>
	import { searchProducts } from '../../api/product.js'
	import { goodsImgUrl } from '../../utils/format.js'

	export default {
		data() {
			return {
				keyword: '',
				products: [],
				searched: false
			}
		},
		methods: {
			goodsImgUrl,
			// 触发搜索：输入框回车或点搜索按钮
			doSearch() {
				const kw = this.keyword.trim()
				if (!kw) {
					return
				}
				searchProducts(kw).then((list) => {
					this.products = list || []
					this.searched = true
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
				})
			},
			// 点商品跳详情
			goDetail(id) {
				uni.navigateTo({ url: '/pages/goods/detail?id=' + id })
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
	}

	/* ═══ 搜索栏 ═══ */
	.search-bar {
		display: flex;
		align-items: center;
		padding: 16rpx 20rpx;
		background: #ffffff;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.search-input {
		flex: 1;
		height: 64rpx;
		background: #f5f5f5;
		border-radius: 32rpx;
		padding: 0 24rpx;
		font-size: 28rpx;
	}

	.search-btn {
		margin-left: 16rpx;
		padding: 0 36rpx;
		height: 64rpx;
		line-height: 64rpx;
		background: #FF6700;
		color: #ffffff;
		border-radius: 32rpx;
		font-size: 28rpx;
	}

	/* ═══ 商品网格 ═══ */
	.goods-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		padding: 20rpx 16rpx;
	}

	.goods-card {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		width: calc(50% - 8rpx);
		margin-bottom: 20rpx;
		background: #ffffff;
		border-radius: 12rpx;
		overflow: hidden;
	}

	.goods-img {
		width: 100%;
		height: 300rpx;
		flex-shrink: 0;
	}

	.goods-info {
		display: flex;
		flex-direction: column;
		padding: 16rpx 20rpx 20rpx;
	}

	.goods-name {
		font-size: 28rpx;
		color: #333333;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}

	.goods-bottom {
		display: flex;
		align-items: center;
		margin-top: 12rpx;
	}

	.goods-price {
		font-size: 32rpx;
		font-weight: bold;
		color: #FF6700;
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
