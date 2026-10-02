<template>
	<view class="panel-hot">
		<view class="list">
			<view class="item">
				<view class="l">
					<text class="title">爆款推荐</text>
					<image ></image>
				</view>
				<view class="r">
					<text class="title">人气热卖</text>
					<image ></image>
				</view>
			</view>
			<view class="item">
				<view class="l">
					<text class="title">特惠推荐</text>
					<image ></image>
				</view>
				<view class="r">
					<text class="title">精选数码</text>
					<image ></image>
				</view>
			</view>
		</view>
		<view class="list">
			<view class="item">
				<view class="l">
					<text class="title">好物精选</text>
					<image></image>
				</view>
				<view class="r">
					<text class="title">新品首发</text>
					<image></image>
				</view>
			</view>
			<view class="item">
				<view class="l">
					<text class="title">前沿潮品</text>
					<image></image>
				</view>
				<view class="r">
					<text class="title">数码优选</text>
					<image></image>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
</script>

<style scoped>
	.panel-hot {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		padding: 0 20rpx;
	}

	.list {
		display: flex;
		gap: 20rpx;
	}

	.item {
		box-sizing: border-box;
		display: flex;
		gap: 15rpx;
		width: calc(50% - 10rpx);
		padding: 10rpx 15rpx;
		background: #BAEEF7;
	}
	.l{
		width: calc(50% - 7.5rpx);
		font-weight:bold;
	}
	.r{
		flex:1;
		color:#bbb;
	}
	image{
		height: 140rpx;
		width:100%;
	}
</style>
