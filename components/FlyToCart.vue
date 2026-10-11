<template>
	<!-- 飞入购物车动画层：加购成功后调用方调 play() 触发，商品图划弧线飞向底部购物车图标 -->
	<view v-if="show" class="fly-wrap" :style="wrap">
		<image class="fly-img" :src="src" :style="img"></image>
	</view>
</template>

<script>
	export default {
		name: 'FlyToCart',
		data() {
			return {
				show: false, // 是否显示飞入层
				src: '', // 要飞的商品图 URL
				wrap: {}, // 外层行内样式（位置 + 横向位移）
				img: {} // 内层行内样式（纵向弧线 + 缩放）
			}
		},
		methods: {
			// 触发动画。
			// src：要飞的图；
			// options.selector：起点元素的选择器（默认 .cover）；
			// options.scope：起点元素所在的组件实例 —— 起点几乎都在某个页面/弹窗组件内部，
			//   而小程序的选择器默认查不进别的自定义组件，必须把所在实例传进来做 .in(scope) 查询。
			// 起点量不到就退到屏幕中心，保证动画照样能播。动画跑完发 done 事件。
			play(src, options) {
				const opts = options || {}
				this.src = src || ''
				const scope = opts.scope || this
				const selector = opts.selector || '.cover'
				uni.createSelectorQuery().in(scope).select(selector).boundingClientRect().exec((res) => {
					this.start(res && res[0])
				})
			},
			// 摆好起点、算好终点、跑补间。终点固定是底部 tabBar 的购物车图标：
			// tabBar 是「固定贴底 + 4 等分」，购物车是第 3 项（下标 2），位置直接按屏幕尺寸算，不用去查 TabBar 组件内部。
			start(from) {
				const sysInfo = uni.getSystemInfoSync()
				const px = sysInfo.windowWidth / 750 // rpx → px
				const itemH = 100 * px // tabBar 的 .tab-item 高度（见 TabBar.vue，100rpx）
				// 底部安全区高度：iPhone 这类有底部黑条的机型要往上挪
				const bottomInset = sysInfo.safeArea
					? Math.max(0, sysInfo.screenHeight - sysInfo.safeArea.bottom)
					: 0
				// 终点 = 购物车 tab 图标中心：图标在 tab 项里约 37% 高度处，换算成「距 tab 项底部 63%」
				const toX = sysInfo.windowWidth * 2.5 / 4
				const toY = sysInfo.screenHeight - bottomInset - itemH * 0.63
				// 起点 = 商品图中心，量不到退到屏幕中心
				const startX = from ? from.left + from.width / 2 : sysInfo.windowWidth / 2
				const startY = from ? from.top + from.height / 2 : sysInfo.screenHeight / 2
				const size = from ? from.width : 200
				const dx = toX - startX
				const dy = toY - startY
				// 先按起点摆好，再改位移，补间交给 CSS transition。
				// 初始 transform 显式写 translate(0,0)：留空是 none，从 none 起插值不稳
				this.wrap = {
					left: (startX - size / 2) + 'px',
					top: (startY - size / 2) + 'px',
					width: size + 'px',
					height: size + 'px',
					transform: 'translate(0, 0)'
				}
				this.img = {
					transform: 'translate(0, 0) scale(1)'
				}
				this.show = true
				// 等首帧渲染到视图层再改位移：小程序里 $nextTick 不保证这一步已完成，
				// 两次样式落在同一次渲染里就不会有补间、会直接闪到终点
				setTimeout(() => {
					this.wrap = Object.assign({}, this.wrap, {
						transform: 'translate(' + dx + 'px, 0)'
					})
					this.img = {
						transform: 'translate(0, ' + dy + 'px) scale(0.2)'
					}
				}, 30)
				// 和 CSS 里的 0.6s 对齐，跑完收掉飞入层并通知调用方
				setTimeout(() => {
					this.show = false
					this.$emit('done')
				}, 650)
			}
		}
	}
</script>

<style scoped>
	/* 飞入动画：外层 fixed 定位负责横向匀速位移，内层负责纵向弧线 + 缩小，两层合成抛物线 */
	.fly-wrap {
		position: fixed;
		/* 要盖在弹窗遮罩（1000）和底部导航栏（999）之上 */
		z-index: 1200;
		pointer-events: none;
		transition: transform 0.6s linear;
	}

	.fly-img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		/* y1 取负值：纵向先向上再落下，形成弧线 */
		transition: transform 0.6s cubic-bezier(0.5, -0.6, 1, 1);
	}
</style>
