<template>
	<!-- 商品预览弹窗：遮罩 / 居中 / 点遮罩关闭都交给 uni-popup（uni-ui，easycom 免注册），里面放自己的卡片 -->
	<uni-popup ref="popup" class="product-popup" type="center" :is-mask-click="true" @change="handleChange">
		<view class="popup-card">
			<image v-if="cover" class="cover" :src="cover" mode="aspectFill"></image>
			<view class="info">
				<text class="name">{{ product.name }}</text>
				<text class="price">¥{{ product.price }}</text>
				<text class="desc">{{ product.description }}</text>
			</view>
			<view class="close-btn" @click="handleClose">关闭</view>
		</view>
	</uni-popup>
</template>

<script>
	import {
		BASE_URL
	} from '../../../utils/server-api.js'
	export default {
		name: 'ProductPopup',
		props: {
			// 是否展示弹窗
			show: {
				type: Boolean,
				default: false
			},
			// 商品信息，对应后端 ProductVO；未加载时为 {}
			product: {
				type: Object,
				default: () => ({})
			}
		},
		data() {
			return {
				// 组件内部记录的开关状态，配合页面传入的 show，避免重复 open/close 触发多余的 change
				opened: false
			}
		},
		watch: {
			// uni-popup 是 ref 调 open()/close() 的命令式用法，这里把页面的 show 开关翻译成对应调用
			show(val) {
				const popup = this.$refs.popup
				if (!popup) {
					return
				}
				if (val && !this.opened) {
					this.opened = true
					popup.open()
				} else if (!val && this.opened) {
					this.opened = false
					popup.close()
				}
			}
		},
		computed: {
			// 主图：优先后端返回的 image，没有就退回本地占位图
			cover() {
				const img = this.product.image
				if (img) {
					// 后端存的是 /image/upload/N.webp 这类相对路径，小程序会把开头的 / 当包内路径，
					// 必须补上网关域名才能取到图（后端 /image/** 已映射到 upload/image/）
					return img.indexOf('http') === 0 ? img : BASE_URL + img
				}
				return this.product.id ? '/static/image/upload/' + this.product.id + '.webp' : ''
			}
		},
		methods: {
			// 点遮罩：uni-popup 自己关掉后只发 change，这里同步内部状态并通知页面，显隐最终仍由页面控制
			handleChange(e) {
				if (!e.show && this.opened) {
					this.opened = false
					this.$emit('close')
				}
			},
			// 点关闭按钮：通知页面把 show 置 false，再由 watch 真正关闭
			handleClose() {
				this.$emit('close')
			}
		}
	}
</script>

<style scoped>
	.popup-card {
		box-sizing: border-box;
		width: 560rpx;
		padding: 30rpx;
		background: #ffffff;
		border-radius: 20rpx;
	}

	.cover {
		width: 100%;
		height: 400rpx;
		border-radius: 12rpx;
	}

	.info {
		display: flex;
		flex-direction: column;
		margin-top: 24rpx;
	}

	.name {
		font-size: 32rpx;
		font-weight: bold;
		color: #333333;
	}

	/* 价格用品牌橙，和 tabBar 选中色一致 */
	.price {
		margin-top: 12rpx;
		font-size: 36rpx;
		font-weight: bold;
		color: #FF6700;
	}

	.desc {
		margin-top: 12rpx;
		font-size: 26rpx;
		color: #999999;
	}

	.close-btn {
		margin-top: 30rpx;
		padding: 16rpx 0;
		font-size: 28rpx;
		text-align: center;
		color: #ffffff;
		background: #FF6700;
		border-radius: 40rpx;
	}
</style>

<style>
	/* uni-popup 自带 z-index:99，会被首页自定义 TabBar（z-index:999）压在下面，这里抬到 1000 */
	.product-popup.uni-popup {
		z-index: 1000;
	}
</style>
