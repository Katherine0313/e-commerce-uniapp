import { defineStore } from 'pinia'
import { getCart } from '../api/cart.js'

// 购物车全局状态：底部 tabBar 购物车图标角标显示的总件数
export const useCartStore = defineStore('cart', {
	state: () => ({
		count: 0, // 所有商品数量之和（不是商品种类数）
		checkoutItems: [] // 去结算的选中商品快照（下单确认页读取）
	}),
	actions: {
		// 直接设置件数
		setCount(n) {
			this.count = n
		},
		// 设置待结算商品：购物车「去结算」时写入，下单确认页读取
		setCheckoutItems(items) {
			this.checkoutItems = items || []
		},
		// 从后端购物车列表重算总件数（启动/兜底同步）
		async refresh() {
			try {
				const list = await getCart()
				this.count = (list || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
			} catch (e) {
				// 未登录/请求失败保持原值，角标不闪
			}
		},
		// 加购成功后累加件数
		addQuantity(n) {
			this.count += n
		}
	}
})
