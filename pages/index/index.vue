<template>
	<view class="content">
		<!-- 已登录：展示用户信息 -->
		<view v-if="isLogin" class="user-box">
			<image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar"></image>
			<view v-else class="avatar avatar-default">{{ avatarText }}</view>
			<text class="nickname">{{ userInfo.name || '微信用户' }}</text>
			<button type="default" class="logout-btn" @click="handleLogout">退出登录</button>
		</view>

		<!-- 未登录：选择头像 + 微信登录 -->
		<block v-else>
			<button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-btn">
				<image v-if="avatarUrl" :src="avatarUrl" class="avatar"></image>
				<text v-else class="login-text">获取用户信息</text>
			</button>
			<button type="warn" class="login-btn" @click="handleLogin">微信登录</button>
		</block>
	</view>
</template>

<script>
	import {
		wxLogin,
		setToken,
		getToken,
		clearToken
	} from '../../sever-api.js'

	export default {
		data() {
			return {
				avatarUrl: '', // 用户选择的头像临时地址
				userInfo: {},  // 登录成功后后端返回的用户信息
				isLogin: false
			}
		},
		computed: {
			// 没有头像时展示昵称首字作为占位
			avatarText() {
				const name = this.userInfo.name
				return name ? name[0] : '微'
			}
		},
		onLoad() {
			// 启动时恢复登录态：本地有 token 就认为已登录
			if (getToken()) {
				this.isLogin = true
				this.userInfo = uni.getStorageSync('userInfo') || {}
			}
		},
		methods: {
			onChooseAvatar(e) {
				this.avatarUrl = e.detail.avatarUrl
			},
			// 第一步：wx.login 拿临时 code
			handleLogin() {
				uni.login({
					success: (res) => {
						this.doLogin(res.code)
					},
					fail: () => {
						uni.showToast({ title: '登录失败，请重试', icon: 'none' })
					}
				})
			},
			// 第二步：拿 code 调后端换 token 和用户信息
			doLogin(code) {
				wxLogin(code).then((res) => {
					// 后端返回 { token, id, name, avatar }
					console.log('登录成功，用户id为：' + res.id)
					setToken(res.token)
					const userInfo = {
						id: res.id,
						name: res.name,
						avatar: res.avatar
					}
					uni.setStorageSync('userInfo', userInfo)
					this.userInfo = userInfo
					this.isLogin = true
					uni.showToast({ title: '登录成功', icon: 'success' })
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
				})
			},
			// 退出登录：清掉本地登录态，回到未登录状态
			handleLogout() {
				clearToken()
				uni.removeStorageSync('userInfo')
				this.userInfo = {}
				this.isLogin = false
				uni.showToast({ title: '已退出登录', icon: 'none' })
			}
		}
	}
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	/* 头像按钮与图片 */
	.avatar-btn {
		margin-top: 40rpx;
		padding: 0;
		background: none;
		border: none;
		/* 去掉小程序原生 button 的 0.5px 边框 */
	}

	.avatar {
		width: 120rpx;
		height: 120rpx;
		border-radius: 50%;
	}

	/* 无头像时的占位块 */
	.avatar-default {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #e6e6e6;
		color: #999;
		font-size: 48rpx;
	}

	.login-text {
		padding: 40rpx 80rpx;
		background: limegreen;
		color: #fff;
	}

	.login-btn {
		margin-top: 40rpx;
	}

	/* 已登录的用户信息区 */
	.user-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 100rpx;
	}

	.nickname {
		margin-top: 20rpx;
		font-size: 32rpx;
		color: #333;
	}

	.logout-btn {
		margin-top: 40rpx;
	}
</style>
