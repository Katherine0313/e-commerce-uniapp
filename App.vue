<script>
	import {
		ensureLogin
	} from './utils/auth.js'
	import {
		useCartStore
	} from './store/cart.js'

	export default {
		globalData: {
			userInfo: null
		},
		onLaunch: function() {
			console.log('App Launch')
			// 免登录：启动即静默登录（uni.login 换 openid），用户无感，不弹任何授权框；
			// 失败不阻塞，后续需要登录的操作（加购/下单）会再触发 ensureLogin 兜底；
			// 登录成功后拉一次购物车件数，初始化底部购物车角标
			ensureLogin().then(() => useCartStore().refresh()).catch(() => {})
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/* @import 必须在样式表最前面，否则会被忽略 */
	@import url("./static/icon/iconfont.css");


	/*每个页面公共css */
</style>
