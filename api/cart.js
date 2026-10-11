import { request } from '../utils/server-api.js'

// ===== 购物车接口 =====
// /api/cart/** 不在后端免登录白名单内，调用前需先登录（走 utils/auth.js 的 ensureLogin）。

// 加入购物车，对应 POST /api/cart；该商品已在购物车则由后端累加数量，成功返回但无数据。
// insuranceDetail / insuranceFee 是加购弹窗里勾选的增值保障（不选传空数组 / 0）。
export function addToCart(productId, quantity, insuranceDetail, insuranceFee) {
	return request('/api/cart', {
		method: 'POST',
		data: {
			productId: productId,
			quantity: quantity,
			insuranceDetail: insuranceDetail,
			insuranceFee: insuranceFee
		}
	})
}

// 购物车列表，对应 GET /api/cart；返回 CartVO 数组（含 subTotal 单品小计）
export function getCart() {
	return request('/api/cart', { method: 'GET' })
}

// 更新数量，对应 PUT /api/cart/{productId}；quantity 最小 1，由后端兜底
export function updateQuantity(productId, quantity) {
	return request('/api/cart/' + productId, {
		method: 'PUT',
		data: { quantity: quantity }
	})
}

// 移除某个商品，对应 DELETE /api/cart/{productId}
export function removeItem(productId) {
	return request('/api/cart/' + productId, { method: 'DELETE' })
}

// 清空购物车，对应 DELETE /api/cart；productIds 非空只删列出的商品，不传则清空整个购物车
export function clearCart(productIds) {
	const data = (productIds && productIds.length) ? { productIds: productIds } : undefined
	return request('/api/cart', {
		method: 'DELETE',
		data: data
	})
}
