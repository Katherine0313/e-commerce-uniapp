<template>
	<view class="page">
		<!-- 自定义顶部导航栏：tabBar 页没有上一级，只留标题 -->
		<CustomNavbar title="我的" />

		<!-- 免登录：启动时已静默登录，这里直接展示用户信息，不再有登录/退出按钮 -->
		<view class="user-box">
			<!-- chooseAvatar 必须由用户点击触发，所以包在 button 里 -->
			<button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-btn">
				<image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar"></image>
				<view v-else class="avatar avatar-default">微</view>
			</button>
			<view class="nickname">{{ userInfo.name || '微信用户' }}</view>
		</view>

		<!-- 自定义底部导航栏 -->
		<CustomTabBar />
	</view>
</template>

<script>
	import {
		useUserStore
	} from '../../store/user.js'
	import {
		ensureLogin
	} from '../../utils/auth.js'
	import {
		getProfile,
		uploadAvatar
	} from '../../api/login.js'

	export default {
		data() {
			return {
				store: useUserStore() // 用户登录态 + 用户信息，统一走 Pinia
			}
		},
		computed: {
			userInfo() {
				return this.store.userInfo
			}
		},
		onShow() {
			// 免登录：进页面确保已静默登录（已登录会短路），再补拉一次资料（昵称/头像），失败静默忽略
			ensureLogin()
				.then(() => getProfile())
				.then((profile) => {
					this.store.setUserInfo({
						id: profile.id,
						name: profile.name,
						avatar: profile.avatar
					})
				})
				.catch(() => {})
		},
		methods: {
			// 换头像：chooseAvatar 给的是本地临时路径，必须上传后端换成可访问 URL
			onChooseAvatar(e) {
				const filePath = e.detail.avatarUrl
				if (!filePath) {
					return
				}
				uploadAvatar(filePath).then((url) => {
					this.store.setAvatar(url)
					uni.showToast({
						title: '头像已更新',
						icon: 'success'
					})
				}).catch((err) => {
					// uploadAvatar 不走 request 封装，错误提示要自己来
					uni.showToast({
						title: (err && err.message) || '头像上传失败',
						icon: 'none'
					})
				})
			}
		}
	}
</script>

<style>
	.page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		/* 给固定定位的底部导航栏留出空间 */
		padding-bottom: 120rpx;
	}

	.user-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		/* 导航栏已自动占位，这里只留内容自身的间距 */
		margin-top: 120rpx;
	}

	/* 头像按钮与图片 */
	.avatar-btn {
		padding: 0;
		margin: 0;
		background: none;
		border: none;
		line-height: 1;
	}

	.avatar {
		width: 140rpx;
		height: 140rpx;
		border-radius: 50%;
	}

	/* 无头像时的占位块 */
	.avatar-default {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #e6e6e6;
		color: #999;
		font-size: 56rpx;
	}

	.nickname {
		margin-top: 24rpx;
		font-size: 32rpx;
		font-weight: bold;
	}
</style>
