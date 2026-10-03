import { request, BASE_URL } from '../utils/server-api.js'
import { getToken } from '../utils/token.js'

// ===== 登录 / 用户接口 =====
// 这些接口需要登录态，登录流程走 utils/auth.js 的 ensureLogin。

// 微信登录：用 code 换 token 和用户信息
export function wxLogin(code){
	return request('/api/wxlogin', {
		method: 'POST',
		data: { code }
	})
}

// 获取当前登录用户资料（含头像），对应 GET /api/user/profile
export function getProfile(){
	return request('/api/user/profile',{method:'GET'})
}

// 设置昵称：对应 POST /api/user/name，返回去除首尾空格后的昵称
export function updateName(name){
	return request('/api/user/name', {
		method: 'POST',
		data: { name }
	})
}

// 上传头像：用 uni.uploadFile 传本地文件，对应 POST /api/user/avatar，返回完整头像 URL
export function uploadAvatar(filePath){
	return new Promise((resolve, reject) => {
		uni.uploadFile(({
			url: BASE_URL + '/api/user/avatar',
			filePath: filePath,
			name: 'file',
			header:{
				Authorization: 'Bearer ' + getToken()
			},
			success:(res) => {
				const data = JSON.parse(res.data)
				if(data.success){
					resolve(data.data)
				}else{
					reject(data)
				}
			},
			fail:(err) => {
				reject(err)
			}
		}))
	})
}
