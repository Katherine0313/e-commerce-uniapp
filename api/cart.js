import { request } from '../utils/server-api.js'

// ===== 购物车接口 =====
// /api/cart/** 不在后端免登录白名单内，调用前需先登录（走 utils/auth.js 的 ensureLogin）。

// 加入购物车，对应 POST /api/cart；该商品已在购物车则由后端累加数量，成功返回但无数据
export function addToCart(productId, quantity) {
	return request('/api/cart', {
		method: 'POST',
		data: {
			productId: productId,
			quantity: quantity
		}
	})
}
