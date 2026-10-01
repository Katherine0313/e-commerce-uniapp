<template>
	<view class="content">
		<!-- 自定义顶部导航栏：橙色底 + 搜索框 -->
		<CustomNavbar :showSearch="true" />

		<!-- 已登录：展示用户信息 -->
		<view v-if="isLogin" class="user-box">
			<image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar"></image>
			<view v-else class="avatar avatar-default">微</view>
			<button type="default" class="logout-btn" @click="handleLogout">退出登录</button>
		</view>

		<!-- 未登录：点击头像自动登录。暂时隐藏登录入口，等首页接上商品、加购时再触发登录 -->
		<!-- <block v-else>
			<button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-btn">
				<image v-if="avatarUrl" :src="avatarUrl" class="avatar"></image>
				<text v-else class="login-text">获取用户信息</text>
			</button>
		</block> -->

		<!-- 自定义底部导航栏 -->
		<CustomTabBar />
	</view>
</template>

<script>
	import {
		useUserStore
	} from '../../store/user.js'
	import {
		wxLogin,
		getProfile,
		uploadAvatar
	} from '../../utils/server-api.js'
	export default {
		data() {
			return {
				avatarUrl: '', // 用户选择的头像临时地址
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
		onLoad() {
			// 启动时恢复登录态：有 token 就拉最新资料
			if (this.store.isLogin) {
				this.fetchProfile()
			}
		},
		methods: {
			onChooseAvatar(e) {
				this.avatarUrl = e.detail.avatarUrl
				// 选完头像自动登录
				this.handleLogin()
			},
			// 第一步：wx.login 拿临时 code
			handleLogin() {
				uni.login({
					success: ((res) => {
						this.doLogin(res.code)
					}),
					fail: () => {
						uni.showToast({ title: '登录失败，请重试', icon: 'none' })
					}
				})
			},
			// 第二步：拿 code 换 token，再拉取会员资料（含头像）
			doLogin(code) {
				wxLogin(code)
					.then((res) => {
						console.log('登录返回结果：', res)
						this.store.setToken(res.token)
						uni.showToast({
							title: '登录成功',
							icon: 'success'
						})
						this.fetchProfile()
					})
					.catch(() => {
						// 错误提示已在 request 封装里统一处理
					})
			},
			// 第三步：拉取会员资料（含头像），成功则进入登录态
			fetchProfile() {
				getProfile().then((res) => {
					this.store.setUserInfo({
						id: res.id,
						name: res.name,
						avatar: res.avatar
					})
					// 登录前选过头像，登录后上传
					if (this.avatarUrl) {
						this.saveAvatar()
					}
				}).catch((err) => {
					// 只有鉴权失败（401/403）才回退登录态；网络抖动、网关 502 等保留
					if (err && (err.statusCode === 401 || err.statusCode === 403)) {
						this.store.logout()
					}
				})
			},
			// 第四步：上传头像并回写展示
			saveAvatar() {
				uploadAvatar(this.avatarUrl).then((url) => {
					this.store.setAvatar(url)
					this.avatarUrl = ''
				}).catch((err) => {
					uni.showToast({ title: (err && err.message) || '头像上传失败', icon: 'none' })
				})
			},
			// 退出登录：清掉本地登录态，回到未登录状态
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
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		/* 给固定定位的底部导航栏留出空间，内容才不会被压住 */
		padding-bottom: 120rpx;
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

	/* 已登录的用户信息区 */
	.user-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		/* 导航栏已自动占位，这里只留内容自身的间距 */
		margin-top: 60rpx;
	}

	.logout-btn {
		margin-top: 40rpx;
	}
</style>
