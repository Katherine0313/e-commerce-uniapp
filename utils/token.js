// token 本地存储的 key
const TOKEN_KEY = 'token'

// 读取 token
export function getToken() {
	return uni.getStorageSync(TOKEN_KEY) || ''
}

// 保存 token
export function setToken(token) {
	uni.setStorageSync(TOKEN_KEY, token)
}

// 清除 token
export function clearToken() {
	uni.removeStorageSync(TOKEN_KEY)
}
