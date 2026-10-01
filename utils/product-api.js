import { request } from './server-api.js'

// ===== 商品浏览接口 =====
// 这些接口免登录，游客也能访问（后端 WebMvcConfig 白名单放行）。
// 加购 / 下单才需要登录，走 utils/auth.js 的 ensureLogin。

// 获取商品列表，对应 GET /api/products
export function getProducts(){
	return request('/api/products', { method: 'GET' })
}

// 获取商品详情，对应 GET /api/products/{id}
export function getProductDetail(id){
	return request('/api/products/' + id, { method: 'GET' })
}

// 获取分类列表，对应 GET /api/categories
export function getCategories(){
	return request('/api/categories', { method: 'GET' })
}
