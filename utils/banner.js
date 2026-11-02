import { BASE_URL } from './server-api.js'
import { reportBannerBrowse } from '../api/banner.js'

// ===== Banner（轮播图）公共处理 =====
// 后台配置的 Banner 图片是相对路径（/image/banner/xxx.webp），
// 小程序 image 组件只认绝对地址，这里统一补 BASE_URL。

// 后台 Banner 列表 → 轮播组件（custom-swiper）要的项
export function toSwiperItems(list){
	return (list || []).map((b) => ({
		id: b.id,
		title: b.title,
		src: b.image ? (b.image.indexOf('http') === 0 ? b.image : BASE_URL + b.image) : '',
		linkType: b.linkType,
		linkValue: b.linkValue
	}))
}

// 点击 Banner 的统一处理：统计点击量 + 按跳转类型跳页面
// linkType：0 不跳转、1 商品、2 文章、3 外部链接
export function handleBannerTap(item){
	if (!item || typeof item === 'string') return
	// 点击量统计失败不影响跳转
	if (item.id) reportBannerBrowse(item.id).catch(() => {})
	if (item.linkType === 1) {
		uni.navigateTo({ url: '/pages/goods/detail?id=' + item.linkValue })
	} else if (item.linkType === 2) {
		uni.navigateTo({ url: '/pages/article/detail?id=' + item.linkValue })
	} else if (item.linkType === 3) {
		// 小程序不能直接打开外部网页，复制链接让用户去浏览器打开
		uni.setClipboardData({
			data: item.linkValue,
			success: () => uni.showToast({ title: '链接已复制', icon: 'none' })
		})
	}
}
