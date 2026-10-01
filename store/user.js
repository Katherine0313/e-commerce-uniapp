import { defineStore } from 'pinia'
import { getToken, setToken as saveToken, clearToken } from '../utils/token.js'

// 用户登录态：token 落到本地 Storage（重开小程序还在），用户信息只存内存（进页面时重新拉）
export const useUserStore = defineStore('user', {
	state: () => ({
		// 初始值从本地读，之后由 setToken / logout 同步维护
		token: getToken(),
		// 用空对象而不是 null：模板里直接读 userInfo.avatar 不会报错
		userInfo: {}
	}),
	getters: {
		// 有 token 即算已登录，资料由 /api/user/profile 补齐
		isLogin: (state) => !!state.token
	},
	actions: {
		setToken(token) {
			this.token = token
			saveToken(token)
		},
		setUserInfo(info) {
			this.userInfo = info
		},
		// 只改头像，保留其它字段
		setAvatar(avatar) {
			this.userInfo.avatar = avatar
		},
		logout() {
			this.token = ''
			this.userInfo = {}
			clearToken()
		}
	}
})
