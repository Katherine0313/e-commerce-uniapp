<template>
	<view class="page">
		<!-- 自定义顶部导航栏：tabBar 页没有上一级，只留标题 -->
		<CustomNavbar title="我的" />

		<!-- 已登录：展示用户信息，点头像可换 -->
		<view v-if="isLogin" class="user-box">
			<!-- chooseAvatar 必须由用户点击触发，所以包在 button 里 -->
			<button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-btn">
				<image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar"></image>
				<view v-else class="avatar avatar-default">微</view>
			</button>
			<view class="nickname">{{ userInfo.name || '微信用户' }}</view>
			<button type="default" class="btn" @click="handleLogout">退出登录</button>
		</view>

		<!-- 未登录：点一下就走静默登录，没有授权弹窗 -->
		<view v-else class="user-box">
			<view class="avatar avatar-default">微</view>
			<button type="primary" class="btn" @click="handleLogin">微信登录</button>
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
		uploadAvatar
	} from '../../utils/server-api.js'

	export default {
		data() {
			return {
				store: useUserStore() // 用户登录态 + 用户信息，统一走 Pinia
			}
		},
		computed: {
			userInfo() {
				return this.store.userInfo
			},
			isLogin() {
				return this.store.isLogin
			}
		},
		methods: {
			// 静默登录：uni.login 拿 code 换 token，无需用户授权
			async handleLogin() {
				await ensureLogin()
				uni.showToast({
					title: '登录成功',
					icon: 'success'
				})
			},
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
			},
			// 退出登录：清掉本地 token 和用户信息
			handleLogout() {
				this.store.logout()
				uni.showToast({
					title: '已退出登录',
					icon: 'none'
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

	.btn {
		margin-top: 40rpx;
	}
</style>
