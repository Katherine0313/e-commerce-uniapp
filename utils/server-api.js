import { getToken, clearToken } from "./token.js"

// 后端 API 网关地址：前端所有请求统一走网关，不直连各微服务端口。
// 网关按 /api/** 前缀路由到下游服务，各微服务的端口对前端透明，无需（也不应）为每个模块单独配地址。
// 后端微服务端口规划（仅维护参考，前端只需记住网关 8080）：
//   gateway 8080 / auth 9001 / shop 9002 / product 9003 / order 9004
//   aftersale 9005 / user 9006 / file 9007
const BASE_URL = 'http://127.0.0.1:8080'

// 通用请求封装：自动带 token，成功返回 data，失败统一弹提示
export function request(url, options = {}){
	const token = getToken()
	const header = Object.assign({}, options.header || {})
	// 判断 token 是否存在
	if(token){
		header.Authorization = 'Bearer ' + token
	}

	return uni.request({
		url: BASE_URL + url,
		...options,
		header
	}).then((res) => {
		const code = res.statusCode
		// 401/403：token 失效或不可用（本项目 token 不匹配时返回 403），先清掉本地 token
		if(code === 401 || code === 403){
			clearToken()
			throw { statusCode: 401, message: '登录已过期，请重新登录' }
		}
		// 其余非 2xx（网关 502、后端 500 等）：带上状态码，不与业务错误混淆
		if(code < 200 || code >= 300){
			throw { statusCode: code, message: '请求失败（' + code + '）' }
		}
		// 后端约定：{ success, data } 成功，{ success, message } 失败
		if(res.data.success){
			return res.data.data
		}else{
			throw res.data
		}
	}).catch((err) => {
		// 统一错误提示，再抛给调用方
		uni.showToast({
			title: (err && (err.message || err.msg || err.errMsg)) || '请求失败，请重试',
			icon: 'none'
		})
		throw err
	})
}

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
