<template>
	<view class="page">
		<!-- 自定义顶部导航栏：隐藏 logo，只留搜索框 -->
		<CustomNavbar :showSearch="true" />

		<view class="title">分类</view>
		<view class="tip">分类页占位，待开发</view>

		<!-- 自定义底部导航栏 -->
		<CustomTabBar />
	</view>
</template>

<script>
	export default {
		data() {
			return {}
		}
	}
</script>

<style>
	.page {
		display: flex;
		flex-direction: column;
		align-items: center;
		/* 导航栏已自动占位，这里只留内容自身的间距 */
		padding-top: 120rpx;
		/* 给固定定位的底部导航栏留出空间 */
		padding-bottom: 120rpx;
	}

	.title {
		font-size: 40rpx;
		font-weight: bold;
	}

	.tip {
		margin-top: 20rpx;
		color: #999;
		font-size: 28rpx;
	}
</style>
