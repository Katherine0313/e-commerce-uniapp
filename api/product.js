import { request } from '../utils/server-api.js'

// ===== 商品浏览接口 =====
// 这些接口免登录，游客也能访问（后端 WebMvcConfig 白名单放行）。
// 加购 / 下单才需要登录，走 utils/auth.js 的 ensureLogin。

// 获取商品列表，对应 GET /api/products
export function getProducts(){
	return request('/api/products', { method: 'GET' })
}

// 按一级分类查商品，对应 GET /api/products?categoryId=x
export function getProductsByCategory(categoryId){
	return request('/api/products?categoryId=' + categoryId, { method: 'GET' })
}

// 获取商品详情，对应 GET /api/products/{id}
export function getProductDetail(id){
	return request('/api/products/' + id, { method: 'GET' })
}

// 获取猜你喜欢推荐列表，对应 GET /api/products/recommend（免登录，未登录走销量热门兜底）
export function getRecommend(limit){
	return request('/api/products/recommend?limit=' + (limit || 10), { method: 'GET' })
}

// 按关键词搜索商品，对应 GET /api/products?keyword=x（免登录）
export function searchProducts(keyword){
	return request('/api/products?keyword=' + encodeURIComponent(keyword), { method: 'GET' })
}
