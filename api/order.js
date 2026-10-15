import { request } from '../utils/server-api.js'

// ===== 订单接口 =====
// /api/orders/** 不在后端免登录白名单内，调用前需先登录（走 utils/auth.js 的 ensureLogin）。

// 生成幂等键：一次「下单意图」调用一次，下单成功后前端丢弃，重试时复用同一个 key。
// 后端对相同 idempotencyKey 只真正下单一次（Redis SETNX 占位），防弱网重试重复下单。
// 小程序基础库较新时用 crypto.randomUUID，否则手写 v4 兜底。
export function genIdempotencyKey() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID()
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = Math.random() * 16 | 0
		const v = c === 'x' ? r : (r & 0x3 | 0x8)
		return v.toString(16)
	})
}

// 下单，对应 POST /api/orders。
// data 字段：{ consignee, phone, region, detailAddress, remark, idempotencyKey,
//   items: [{ productId, quantity, insuranceDetail(String), insuranceFee }] }
export function createOrder(data) {
	return request('/api/orders', {
		method: 'POST',
		data: data
	})
}

// 订单列表，对应 GET /api/orders；返回 OrderVO 数组
export function listOrders() {
	return request('/api/orders', { method: 'GET' })
}

// 订单详情，对应 GET /api/orders/{id}
export function getOrder(id) {
	return request('/api/orders/' + id, { method: 'GET' })
}

// 支付，对应 PUT /api/orders/{id}/pay；订单从待付款 → 待确认。
// 暂未接入微信支付，payType 仅被后端记录，传占位值即可（不传默认 wechat）。
export function payOrder(id, payType) {
	return request('/api/orders/' + id + '/pay', {
		method: 'PUT',
		data: { payType: payType || 'wechat' }
	})
}

// 取消订单，对应 PUT /api/orders/{id}/cancel；后端恢复库存并改取消
export function cancelOrder(id) {
	return request('/api/orders/' + id + '/cancel', { method: 'PUT' })
}

// 删除订单（软删），对应 DELETE /api/orders/{id}
export function deleteOrder(id) {
	return request('/api/orders/' + id, { method: 'DELETE' })
}
