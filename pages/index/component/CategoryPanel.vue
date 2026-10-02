<template>
	<!-- 前台分类面板：6 个分类宫格，点击抛出分类项，跳转交给页面处理 -->
	<view class="category-panel">
		<view
			v-for="item in categories"
			:key="item.name"
			class="category-item"
			@click="handleSelect(item)"
		>
			<image class="category-icon" :src="item.img" mode="aspectFit"></image>
			<text class="category-name">{{ item.name }}</text>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'CategoryPanel',
		data() {
			return {
				// 分类配置：img 对应 static/image/category 下的 png，name 是展示中文名
				categories: [
					{ img: '/static/image/category/shouji.png', name: '手机' },
					{ img: '/static/image/category/bijiben.png', name: '笔记本' },
					{ img: '/static/image/category/pingban.png', name: '平板' },
					{ img: '/static/image/category/xiangji.png', name: '相机' },
					{ img: '/static/image/category/shoubiao.png', name: '手表' },
					{ img: '/static/image/category/erji.png', name: '耳机' }
				]
			}
		},
		methods: {
			// 点击某个分类：把整项抛给页面，跳分类页 / 筛选交给页面决定
			handleSelect(item) {
				this.$emit('select', item)
			}
		}
	}
</script>

<style scoped>
	.category-panel {
		display: flex;
		flex-wrap: wrap;
		width: 100%;
		background: #ffffff;
		padding: 24rpx 0 0;
	}

	.category-item {
		width: 33.33%;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 28rpx;
	}

	.category-icon {
		width: 88rpx;
		height: 88rpx;
		/* 圆角裁剪，30rpx ≈ 15px */
		border-radius: 30rpx;
	}

	.category-name {
		margin-top: 12rpx;
		font-size: 26rpx;
		line-height: 1;
		color: #333333;
	}
</style>
