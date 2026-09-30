<template>
	<view class="content">
		<!-- 已登录：展示用户信息 -->
		<view v-if="isLogin" class="user-box">
			<image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar"></image>
			<view v-else class="avatar avatar-default">{{ avatarText }}</view>
			<text class="nickname">{{ userInfo.name || '微信用户' }}</text>
			<!-- 昵称填写：微信昵称能力，失焦或回车时提交 -->
			<input type="nickname" class="nickname-input" placeholder="点击修改昵称" :value="nickname"
				@blur="onNicknameBlur" @confirm="onNicknameBlur" />
			<button type="default" class="logout-btn" @click="handleLogout">退出登录</button>
		</view>

		<!-- 未登录：填写昵称后选择头像自动登录 -->
		<block v-else>
			<input type="nickname" class="nickname-input" placeholder="点击填写昵称" :value="nickname"
				@blur="onNicknameBlur" @confirm="onNicknameBlur" />
			<button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-btn">
				<image v-if="avatarUrl" :src="avatarUrl" class="avatar"></image>
				<text v-else class="login-text">获取用户信息</text>
			</button>
		</block>
	</view>
</template>

<script>
	import {
		getToken,
		setToken,
		clearToken
	} from '../../utils/token.js'
	import {
		wxLogin,
		getProfile,
		uploadAvatar,
		updateName
	} from '../../utils/server-api.js'
	export default {
		data() {
			return {
				avatarUrl: '', // 用户选择的头像临时地址
				nickname: '', // 昵称输入框的值：登录前先暂存，登录后直接提交
				userInfo: {}, // 登录成功后后端返回的用户信息
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
			// 启动时恢复登录态：有 token 就拉最新资料
			if (getToken()) {
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
						setToken(res.token)
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
					this.userInfo = {
						id: res.id,
						name: res.name,
						avatar: res.avatar
					}
					// 昵称输入框回填：后端有昵称就用后端的，登录前填过的保留
					this.nickname = res.name || this.nickname
					this.isLogin = true
					// 登录前选过头像，登录后上传
					if (this.avatarUrl) {
						this.saveAvatar()
					} else {
						uni.setStorageSync('userInfo', this.userInfo)
					}
					// 登录前填过昵称，登录后提交
					if (this.nickname && this.nickname !== res.name) {
						this.saveName()
					}
				}).catch(() => {
					// 拉取失败：token 可能失效，回退到未登录
					clearToken()
					uni.removeStorageSync('userInfo')
					this.userInfo = {}
					this.isLogin = false
				})
			},
			// 第四步：上传头像并回写展示
			saveAvatar() {
				uploadAvatar(this.avatarUrl).then((url) => {
					this.userInfo.avatar = url
					this.avatarUrl = ''
					uni.setStorageSync('userInfo', this.userInfo)
				}).catch((err) => {
					uni.showToast({ title: (err && err.message) || '头像上传失败', icon: 'none' })
				})
			},
			// 昵称失焦/回车：空值或没改动就不提交，已登录直接提交，未登录先暂存等登录后提交
			onNicknameBlur(e) {
				const name = (e.detail.value || '').trim()
				if (!name || name === this.nickname) {
					return
				}
				this.nickname = name
				if (this.isLogin) {
					this.saveName()
				}
			},
			// 第五步：提交昵称并回写展示
			saveName() {
				updateName(this.nickname).then((name) => {
					this.nickname = name
					this.userInfo.name = name
					uni.setStorageSync('userInfo', this.userInfo)
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
				})
			},
			// 退出登录：清掉本地登录态，回到未登录状态
			handleLogout(){
				clearToken()
				uni.removeStorageSync('userInfo')
				this.userInfo = {}
				this.nickname = ''
				this.isLogin = false
				uni.showToast({
					title:'已退出登录',icon:'none'
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
		margin-top: 100rpx;
	}

	.nickname {
		margin-top: 20rpx;
		font-size: 32rpx;
		color: #333;
	}

	/* 昵称输入框（type="nickname" 用微信昵称能力） */
	.nickname-input {
		margin-top: 20rpx;
		width: 400rpx;
		height: 72rpx;
		line-height: 72rpx;
		font-size: 32rpx;
		text-align: center;
		border-bottom: 1rpx solid #e6e6e6;
	}

	.logout-btn {
		margin-top: 40rpx;
	}
</style>
