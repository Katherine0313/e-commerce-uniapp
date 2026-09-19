<script>
	import { wxLogin } from './sever-api.js'

	export default {
		globalData: {
			userInfo: null
		},
		onLaunch: function() {
			console.log('App Launch')

			// 微信登录
			uni.login({
				success: (loginRes) => {
					if (!loginRes.code) {
						console.error('login code 为空')
						return
					}

					wxLogin(loginRes.code).then(res => {
						if (res.code === 200) {
							// 保存用户信息到全局
							this.globalData.userInfo = res.data
							console.log('登录成功:', res.data)
						} else {
							console.error('登录失败:', res.msg)
						}
					}).catch(err => {
						console.error('后端请求失败:', err)
					})
				},
				fail: (err) => {
					console.error('wx.login 失败:', err)
				}
			})
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
