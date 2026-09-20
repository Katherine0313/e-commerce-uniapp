<template>
	<view class="content">
		<view>
			<button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-btn">
				<image v-if="avatarUrl" :src="avatarUrl" class="avatar"></image>
				<text v-else class="login-text">获取用户信息</text>
			</button>
		</view>
		<view>
			<button type="warn" @click="handleLogin">微信登录</button>
			code: {{'' + code}}
			openid: {{'' + openid}}
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
				avatarUrl: '',
				code: '',
				openid: ''
			}
		},
		methods: {
			onChooseAvatar(e) {
				this.avatarUrl = e.detail.avatarUrl
			},
			handleLogin() {
				uni.login({
					success: (res) => {
						this.code = res.code
						console.log('用户的code为：' + res.code)
						// 拿 code 调后端换 openid
						wxLogin(res.code)
						.then(res => {
							this.openid = res.data.openid
							console.log('用户的openid为 ' + res.data.openid)
						})

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
		padding: 40rpx 80rpx;
		background: limegreen;
		color: #fff;
	}
</style>
