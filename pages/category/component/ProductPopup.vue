<template>
	<!-- 商品加购弹窗：遮罩 / 居中 / 点遮罩关闭都交给 uni-popup（uni-ui，easycom 免注册），里面放 图片 + 名称 + 加入购物车按钮 -->
	<uni-popup ref="popup" class="product-popup" type="center" :is-mask-click="true" @change="handleChange">
		<view class="popup-card">
			<image v-if="cover" class="cover" :src="cover" mode="aspectFill"></image>
			<text class="name">{{ product.name }}</text>
			<text class="price">¥{{ product.price }}</text>
			<!-- 服务保障：和后台 Mall.vue 的 assurance-row 一致，小程序没有 ant 图标，用 uni-ui 的 uni-icons 对应 -->
			<view class="assurance-row">
				<view class="assurance-item">
					<uni-icons type="auth" size="15" color="#FF6700"></uni-icons>
					<text class="assurance-text">正品保证</text>
				</view>
				<view class="assurance-item">
					<uni-icons type="refreshempty" size="15" color="#FF6700"></uni-icons>
					<text class="assurance-text">极速退款</text>
				</view>
				<view class="assurance-item">
					<uni-icons type="calendar" size="15" color="#FF6700"></uni-icons>
					<text class="assurance-text">七天无理由</text>
				</view>
				<view class="assurance-item">
					<uni-icons type="location" size="15" color="#FF6700"></uni-icons>
					<text class="assurance-text">全国联保</text>
				</view>
			</view>
			<view class="quantity">
				<text class="qty-label">数量</text>
				<view class="qty-stepper">
					<view class="qty-btn" @click="handleMinus">-</view>
					<text class="qty-num">{{ quantity }}</text>
					<view class="qty-btn" @click="handlePlus">+</view>
				</view>
			</view>
			<!-- 增值保障：和后台 Mall.vue 的 insurance-section 一致，点卡片切换选中（橙边框 + 浅橙底） -->
			<view class="insurance-section">
				<text class="insurance-title">增值保障</text>
				<view class="insurance-cards">
					<view class="insurance-card" :class="{ active: selectedInsurance2 }"
						@click="selectedInsurance2 = !selectedInsurance2">
						<text class="insurance-name">一年意外保</text>
						<text class="insurance-price">¥{{ insurance2 }}</text>
					</view>
					<view class="insurance-card" :class="{ active: selectedInsurance1 }"
						@click="selectedInsurance1 = !selectedInsurance1">
						<text class="insurance-name">全面保修</text>
						<text class="insurance-price">¥{{ insurance1 }}</text>
					</view>
					<view class="insurance-card" :class="{ active: selectedBattery }"
						@click="selectedBattery = !selectedBattery">
						<text class="insurance-name">电池无忧</text>
						<text class="insurance-price">¥20</text>
					</view>
				</view>
			</view>
			<view class="add-btn" @click="handleAdd">加入购物车</view>
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
			// 商品信息，点击商品时把整条商品对象传进来
			product: {
				type: Object,
				default: () => ({})
			}
		},
		data() {
			return {
				// 组件内部记录的开关状态，配合页面传入的 show，避免重复 open/close 触发多余的 change
				opened: false,
				// 加入购物车的数量，最少 1 个
				quantity: 1,
				// 增值保障选中状态，命名和后台 Mall.vue 保持一致，便于两边对照
				selectedInsurance1: false, // 全面保修
				selectedInsurance2: false, // 一年意外保
				selectedBattery: false // 电池无忧
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
					// 每次打开都从 1 开始选数量
					this.quantity = 1
					// 增值保障也一并清空，避免上一个商品的选择被带过来
					this.selectedInsurance1 = false
					this.selectedInsurance2 = false
					this.selectedBattery = false
					popup.open()
				} else if (!val && this.opened) {
					this.opened = false
					popup.close()
				}
			}
		},
		computed: {
			// 主图：后端 image 是相对路径，补上网关域名才能取到图
			cover() {
				const img = this.product.image
				return img ? (img.indexOf('http') === 0 ? img : BASE_URL + img) : ''
			},
			// 保障服务价格：售价的 1%（和后台 Mall.vue 计费口径一致）
			insurance1() {
				const price = Number(this.product.price) || 0
				return price ? (price * 0.01).toFixed(2) : ''
			},
			// 保障服务价格：售价的 2%
			insurance2() {
				const price = Number(this.product.price) || 0
				return price ? (price * 0.02).toFixed(2) : ''
			},
			// 选中的增值保障明细（数组，随加购/下单一起交给后端）
			insuranceDetail() {
				const list = []
				if (this.selectedInsurance1) list.push({ code: 'warranty', name: '全面保修', fee: Number(this.insurance1) })
				if (this.selectedInsurance2) list.push({ code: 'accident', name: '一年意外保', fee: Number(this.insurance2) })
				if (this.selectedBattery) list.push({ code: 'battery', name: '电池无忧', fee: 20 })
				return list
			},
			// 单件保障费合计
			insuranceFee() {
				let fee = 0
				if (this.selectedInsurance1) fee += Number(this.insurance1)
				if (this.selectedInsurance2) fee += Number(this.insurance2)
				if (this.selectedBattery) fee += 20
				return fee.toFixed(2)
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
			// 数量减：最少 1 个
			handleMinus() {
				if (this.quantity > 1) {
					this.quantity--
				}
			},
			// 数量加
			handlePlus() {
				this.quantity++
			},
			// 点加入购物车：购物车逻辑后面再接，先把商品、数量和选中的增值保障抛给页面
			handleAdd() {
				this.$emit('add', {
					product: this.product,
					quantity: this.quantity,
					insurance_detail: this.insuranceDetail,
					insurance_fee: Number(this.insuranceFee)
				})
			}
		}
	}
</script>

<style scoped>
	.popup-card {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
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

	.name {
		align-self: flex-start;
		margin-top: 24rpx;
		font-size: 32rpx;
		font-weight: bold;
		color: #333333;
	}

	/* 价格用品牌橙，和 tabBar 选中色一致 */
	.price {
		align-self: flex-start;
		margin-top: 12rpx;
		font-size: 36rpx;
		font-weight: bold;
		color: #FF6700;
	}

	/* 服务保障：卡片宽 560rpx 装不下 4 项一行，折成两行两列，图标橙色文字灰色，配色跟后台一致 */
	.assurance-row {
		display: flex;
		flex-wrap: wrap;
		width: 100%;
		margin-top: 24rpx;
	}

	.assurance-item {
		display: flex;
		align-items: center;
		box-sizing: border-box;
		width: 50%;
		padding: 8rpx 0;
	}

	.assurance-text {
		margin-left: 8rpx;
		font-size: 24rpx;
		color: #666666;
	}

	/* 增值保障：三张卡片横排，选中态橙边框 + 浅橙底，配色和后台 Mall.vue 一致 */
	.insurance-section {
		display: flex;
		flex-direction: column;
		width: 100%;
		margin-top: 24rpx;
	}

	.insurance-title {
		font-size: 24rpx;
		font-weight: 600;
		color: #333333;
	}

	.insurance-cards {
		display: flex;
		margin-top: 16rpx;
	}

	.insurance-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		margin-right: 16rpx;
		padding: 24rpx 8rpx;
		background: #ffffff;
		border: 3rpx solid #e8e8e8;
		border-radius: 24rpx;
	}

	/* 最后一张去掉右间距，避免三张卡片整体偏左 */
	.insurance-card:last-child {
		margin-right: 0;
	}

	.insurance-card.active {
		border-color: #FF6700;
		background: #FFF7F0;
	}

	.insurance-name {
		font-size: 24rpx;
		color: #555555;
	}

	.insurance-price {
		margin-top: 8rpx;
		font-size: 26rpx;
		font-weight: 700;
		color: #FF6700;
	}

	/* 数量选择：左边“数量”标签，右边 - / 数字 / + 步进器 */
	.quantity {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-top: 30rpx;
	}

	.qty-label {
		font-size: 26rpx;
		color: #333333;
	}

	.qty-stepper {
		display: flex;
		align-items: center;
	}

	.qty-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56rpx;
		height: 56rpx;
		font-size: 32rpx;
		color: #333333;
		background: #f5f5f5;
		border-radius: 8rpx;
	}

	.qty-num {
		min-width: 64rpx;
		margin: 0 16rpx;
		font-size: 26rpx;
		color: #333333;
		text-align: center;
	}

	/* 加入购物车按钮：品牌橙圆角按钮，和 tabBar 选中色一致 */
	.add-btn {
		width: 100%;
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
	/* uni-popup 自带 z-index:99，会被自定义 TabBar（z-index:999）压在下面，这里抬到 1000 */
	.product-popup.uni-popup {
		z-index: 1000;
	}
</style>
