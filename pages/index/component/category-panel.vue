<template>
	<!-- 前台分类面板：一级分类宫格，来自后端 GET /api/categories，点击抛出分类项，跳转交给页面处理 -->
	<view class="category-panel">
		<view
			v-for="item in categories"
			:key="item.id"
			class="category-item"
			@click="handleSelect(item)"
		>
			<image lazy-load class="category-icon" :src="imgUrl(item)" mode="aspectFit"></image>
			<text class="category-name">{{ item.name }}</text>
		</view>
	</view>
</template>

<script>
	import { getCategories } from '../../../api/categories.js'
	import { BASE_URL } from '../../../utils/server-api.js'

	export default {
		name: 'CategoryPanel',
		data() {
			return {
				// 一级父分类列表：来自 GET /api/categories（树形，每个元素就是一级父分类）
				categories: []
			}
		},
		mounted() {
			this.fetchCategories()
		},
		methods: {
			// 拉一级分类：后端 categories 表 parentId 为 null 的是顶级分类，名称和图片都用后端的
			// 返回 Promise，供页面下拉刷新时等请求结束
			fetchCategories() {
				return getCategories().then((list) => {
					// 后端返回树形列表，每个元素就是一级父分类
					this.categories = list || []
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
				})
			},
			// 分类图：后端 image 是 /image/category/xxx.png 相对路径，小程序把开头的 / 当包内路径，需补 BASE_URL
			imgUrl(item) {
				const img = item.image
				return img ? (img.indexOf('http') === 0 ? img : BASE_URL + img) : ''
			},
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
