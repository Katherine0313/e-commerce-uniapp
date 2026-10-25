<template>
	<!-- 热门推荐面板：4 个色块，每块左右各一个商品位，点图片把商品 id 抛给页面 -->
	<view class="panel-hot">
		<view class="list" v-for="(row, ri) in rows" :key="ri">
			<view class="item" v-for="(block, bi) in row" :key="bi">
				<view class="l">
					<text class="title">{{ block.left.title }}</text>
					<image lazy-load :src="imgUrl(block.left.id)" mode="aspectFill" @click="handleSelect(block.left.id)"></image>
				</view>
				<view class="r">
					<text class="title">{{ block.right.title }}</text>
					<image lazy-load :src="imgUrl(block.right.id)" mode="aspectFill" @click="handleSelect(block.right.id)"></image>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		BASE_URL
	} from '../../../utils/server-api.js'

	export default {
		name: 'HotPanel',
		data() {
			return {
				// 每行两个色块，每个色块左右各放一个商品位：title 是栏目名，id 是商品 id
				rows: [
					[
						{ left: { title: '爆款推荐', id: 1 }, right: { title: '人气热卖', id: 7 } },
						{ left: { title: '特惠推荐', id: 16 }, right: { title: '精选数码', id: 32 } }
					],
					[
						{ left: { title: '好物精选', id: 26 }, right: { title: '新品首发', id: 12 } },
						{ left: { title: '前沿潮品', id: 22 }, right: { title: '数码优选', id: 21 } }
					]
				]
			}
		},
		methods: {
			// 商品图：按商品 id 走后端同命名商品图（/image/upload/{id}.webp）
			imgUrl(id) {
				return BASE_URL + '/image/upload/' + id + '.webp'
			},
			// 点击商品图：只把 id 抛出去，拉详情和弹窗都由页面处理
			handleSelect(id) {
				this.$emit('select', id)
			}
		}
	}
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
		margin-top: 14rpx;
		height: 140rpx;
		width:100%;
	}
</style>
