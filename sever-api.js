// 后端服务地址
const BASE_URL = 'http://127.0.0.1:8080'

// 登录令牌在本地缓存里的 key
const TOKEN_KEY = 'token'

/**
 * 通用请求封装：
 * 1. 自动从本地缓存取 token，带上 Authorization 头；
 * 2. 统一处理响应结构 { code, msg, data }，code 200 时直接返回 data；
 * 3. 统一处理登录失效（401）和网络异常。
 */
export function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync(TOKEN_KEY)
    const header = Object.assign({}, options.header || {})
    // 后端 JwtInterceptor 识别 Authorization 头，带不带 "Bearer " 前缀都能识别
    if (token) {
      header.Authorization = 'Bearer ' + token
    }

    uni.request({
      url: BASE_URL + url,
      ...options,
      header,
      success: (res) => {
        const body = res.data || {}
        if (body.code === 200) {
          // 成功：把业务数据直接返回给调用方
          resolve(body.data)
        } else if (body.code === 401) {
          // 登录失效：清掉令牌，提示重新登录
          uni.removeStorageSync(TOKEN_KEY)
          uni.showToast({ title: body.msg || '登录已过期，请重新登录', icon: 'none' })
          reject(body)
        } else {
          uni.showToast({ title: body.msg || '请求失败', icon: 'none' })
          reject(body)
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        reject(err)
      }
    })
  })
}

// 微信登录：用 wx.login 拿到的 code 换 token 和用户信息
export function wxLogin(code) {
  return request('/api/wxlogin', {
    method: 'POST',
    data: { code }
  })
}

// 登录态读写
export function getToken() {
  return uni.getStorageSync(TOKEN_KEY)
}

export function setToken(token) {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function clearToken() {
  uni.removeStorageSync(TOKEN_KEY)
}
