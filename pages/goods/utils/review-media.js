/**
 * 评价媒体（晒图/视频）解析工具。
 *
 * product_reviews.images 存的是 JSON 字符串：
 *   [{"url":"/image/review/xxx.png","type":"image"},{"url":"/image/review/v.mp4","type":"video"}]
 * 后端原样透传，前端解析后展示。解析失败一律当空数组，不让一条脏数据把详情页搞崩。
 */

/**
 * 解析评价媒体 JSON。
 * @param {string} images 后端返回的 images 字段（JSON 字符串）
 * @returns {Array<{url:string,type:string}>} 媒体列表
 */
export function parseReviewMedia(images) {
	if (!images) {
		return []
	}
	try {
		const arr = JSON.parse(images)
		if (!Array.isArray(arr)) {
			return []
		}
		return arr.filter((item) => item && item.url)
	} catch (e) {
		return []
	}
}

/**
 * 媒体地址补全：小程序把相对路径当包内路径，必须补上域名。
 * @param {string} url 相对或绝对地址
 * @param {string} baseUrl 网关地址
 * @returns {string}
 */
export function reviewMediaUrl(url, baseUrl) {
	if (!url) {
		return ''
	}
	return url.indexOf('http') === 0 ? url : baseUrl + url
}
