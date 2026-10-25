<template>
	<!-- 猜你喜欢：按用户下单记录做个性化推荐，商品列表来自后端 GET /api/products/recommend（免登录，未登录走销量热门兜底） -->
	<view class="guess">
		<view class="guess-header">
			<view class="header-line"></view>
			<view class="header-dot"></view>
			<text class="guess-title">猜你喜欢</text>
			<view class="header-dot"></view>
			<view class="header-line"></view>
		</view>

		<view class="guess-grid">
			<view class="goods-card" v-for="item in products" :key="item.id" @click="handleSelect(item.id)">
				<image lazy-load class="goods-img" :src="imgUrl(item)" mode="aspectFill"></image>
				<view class="goods-info">
					<text class="goods-name">{{ item.name }}</text>
					<text class="goods-price">¥{{ item.price }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { getRecommend } from '../api/product.js'
	import { BASE_URL } from '../utils/server-api.js'

	export default {
		name: 'Guess',
		data() {
			return {
				// 推荐商品列表：来自 GET /api/products/recommend，字段对齐后端 ProductVO（id/name/image/price）
				products: []
			}
		},
		mounted() {
			this.fetchRecommend()
		},
		methods: {
			// 拉猜你喜欢推荐：免登录，未登录后端走销量热门兜底
			// 返回 Promise，供页面下拉刷新时等请求结束
			fetchRecommend() {
				return getRecommend(10).then((list) => {
					this.products = list || []
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
				})
			},
			// 商品主图：后端 image 是 /image/upload/N.webp 相对路径，小程序把开头的 / 当包内路径，需补 BASE_URL；没有则回退后端同命名商品图
			imgUrl(item) {
				const img = item.image
				if (img) {
					return img.indexOf('http') === 0 ? img : BASE_URL + img
				}
				return item.id ? BASE_URL + '/image/upload/' + item.id + '.webp' : ''
			},
			// 点击商品：只把 id 抛给页面，拉详情和弹预览由页面统一处理（和 HotPanel 一致）
			handleSelect(id) {
				this.$emit('select', id)
			}
		}
	}
</script>

<style scoped>
	.guess {
		width: 100%;
		box-sizing: border-box;
		margin-top: 24rpx;
		padding: 0 20rpx;
	}

	.guess-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12rpx;
		padding: 20rpx 0;
	}

	/* 左右渐变装饰线：从透明过渡到品牌橙，指向标题 */
	.header-line {
		width: 120rpx;
		height: 2rpx;
		background: linear-gradient(to right, transparent, #FF6700);
	}

	/* 右边那条反向渐变，让两端都从透明开始 */
	.header-line:last-child {
		background: linear-gradient(to left, transparent, #FF6700);
	}

	/* 标题两侧的小圆点 */
	.header-dot {
		width: 10rpx;
		height: 10rpx;
		border-radius: 50%;
		background: #FF6700;
	}

	.guess-title {
		font-size: 34rpx;
		font-weight: bold;
		color: #333333;
	}

	.guess-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.goods-card {
		box-sizing: border-box;
		width: calc(50% - 10rpx);
		margin-bottom: 20rpx;
		background: #ffffff;
		border-radius: 16rpx;
		overflow: hidden;
	}

	.goods-img {
		width: 100%;
		height: 300rpx;
		/* 顶部圆角由卡片 overflow:hidden 裁出，底部在卡片内部要单独设圆角 */
		border-radius: 0 0 16rpx 16rpx;
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
		/* 名字最多两行，超出省略 */
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}

	/* 价格用品牌橙，和 tabBar 选中色、弹窗价格一致 */
	.goods-price {
		margin-top: 12rpx;
		font-size: 32rpx;
		font-weight: bold;
		color: #FF6700;
	}
</style>
