<template>
	<view class="content">
		<!-- <image class="logo" src="/static/zongjie.webp"></image> -->
		<view class="text-area">
			<text class="title">{{msg}}</text>
		</view>
		<view>
			<button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-btn">
				<image v-if="avatarUrl" :src="avatarUrl" class="avatar"></image>
				<text v-else class="login-text">登录</text>
			</button>
		</view>
	</view>
</template>

<script>
	import {
		wxLogin
	} from '../../sever-api.js'

	export default {
		data() {
			return {
				msg: '杰米多多',
				avatarUrl: ''
			}
		},
		onLoad() {

		},
		methods: {
			onChooseAvatar(e) {
					this.avatarUrl = e.detail.avatarUrl
					this.handleLogin()
				},
				// 微信登录：先拿 code，再调后端换取 openid
				handleLogin() {
					uni.login({
						provider: 'weixin',
						success: async (res) => {
							if (!res.code) {
								uni.showToast({
									title: '获取 code 失败',
									icon: 'none'
								})
								return
							}
							try {
								// 后端返回结构 { code, data: { openid, session_key } }
								const data = await wxLogin(res.code)
								console.log('wxLogin 返回：', data)
								if (data.code === 200 && data.data) {
									// openid 是后端识别用户的唯一标识，前端不保存、不展示，后续用 token 鉴权
									console.log('登录成功，openid：', data.data.openid)
									uni.showToast({
										title: '登录成功',
										icon: 'success'
									})
								} else {
									uni.showToast({
										title: data.msg || '登录失败',
										icon: 'none'
									})
								}
							} catch (e) {
								console.error('登录请求失败：', e)
								uni.showToast({
									title: '网络错误',
									icon: 'none'
								})
							}
						}
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

	.logo {
		height: 200rpx;
		width: 200rpx;
		margin-top: 200rpx;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 50rpx;
	}

	.text-area {
		display: flex;
		justify-content: center;
	}

	.title {
		font-size: 36rpx;
		color: #8f8f94;
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

	.login-text {
		padding: 20px 40px;
		background: limegreen;
		color: #fff;
	}
</style>
