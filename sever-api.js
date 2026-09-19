const BASE_URL = 'http://127.0.0.1:8080'

export function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      ...options,
      success: (res) => resolve(res.data),
      fail: (err) => reject(err)
    })
  })
}

export function wxLogin(code) {
  return request('/api/wxlogin', {
    method: 'POST',
    data: { code }
  })
}
