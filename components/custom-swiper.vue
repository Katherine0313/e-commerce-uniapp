<template>
	<view class="app-swiper">
		<!-- 轮播图：图片列表、自动播放、指示点等都可从外面传入，不传就用默认值 -->
		<swiper
			class="swiper"
			:style="{ height: height }"
			:autoplay="autoplay"
			:interval="interval"
			:duration="duration"
			:circular="circular"
			:indicator-dots="indicatorDots"
			:indicator-color="indicatorColor"
			:indicator-active-color="indicatorActiveColor"
			@change="handleChange"
		>
			<swiper-item v-for="(item, index) in list" :key="index">
				<image
					class="swiper-img"
					:src="item"
					mode="aspectFill"
					@click="handleClick(index)"
				></image>
			</swiper-item>
		</swiper>
	</view>
</template>

<script>
	import {
		BASE_URL
	} from '../utils/server-api.js'

	export default {
		name: 'CustomSwiper',
		props: {
			// 轮播图片路径列表，不传就用后端 /image/swiper 下的 4 张
			list: {
				type: Array,
				default: () => [
					BASE_URL + '/image/swiper/1.webp',
					BASE_URL + '/image/swiper/2.webp',
					BASE_URL + '/image/swiper/3.webp',
					BASE_URL + '/image/swiper/4.webp'
				]
			},
			// 轮播高度
			height: { type: String, default: '360rpx' },
			// 是否自动播放
			autoplay: { type: Boolean, default: true },
			// 自动播放间隔（毫秒）
			interval: { type: Number, default: 3000 },
			// 滑动动画时长（毫秒）
			duration: { type: Number, default: 500 },
			// 是否循环播放
			circular: { type: Boolean, default: true },
			// 是否显示指示点
			indicatorDots: { type: Boolean, default: true },
			// 指示点颜色
			indicatorColor: { type: String, default: 'rgba(255,255,255,0.5)' },
			// 当前指示点颜色
			indicatorActiveColor: { type: String, default: '#ffffff' }
		},
		methods: {
			// 滑动切换：把当前下标抛给页面
			handleChange(e) {
				this.$emit('change', e.detail.current)
			},
			// 点击某张图：把下标抛给页面，跳详情之类的交给页面处理
			handleClick(index) {
				this.$emit('click', index)
			}
		}
	}
</script>

<style scoped>
	/* width:100% 兜底：页面根节点若是 align-items:center 的 flex 容器，会把子元素宽度压成内容宽 */
	.app-swiper {
		width: 100%;
	}

	.swiper {
		width: 100%;
	}

	.swiper-img {
		width: 100%;
		height: 100%;
	}
</style>
