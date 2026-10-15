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

<style lang="scss">
	/* @import 必须在样式表最前面，否则会被忽略 */
	@import url("./static/icon/iconfont.css");
	/* 第二套 iconfont（「我的」页专用） */
	@import url("./static/myvue-icon/iconfont.css");
	@import 'uview-plus/index.scss';

	/* 两套 iconfont 的 @font-face 都叫 "iconfont"，同名会互相覆盖：
	   后引入的那套把前一套的字形顶掉，底部导航的老图标就会变方框。
	   所以在两行 @import 之后按名字重新注册一次，把两套彻底分开。
	   ⚠️ 只要字体文件名还是 iconfont.woff2/woff/ttf，以后重新从 iconfont.cn
	   下载 static/myvue-icon 都不用动这里（下载的 css 里那句同名 @font-face
	   会被这里顶掉，不影响）。
	   换完图标若没生效，是字体文件名没变、开发者工具用了旧缓存，
	   清一次缓存重新编译即可。 */
	@font-face {
		font-family: "iconfont";
		src: url("./static/icon/iconfont.woff2") format("woff2"),
			url("./static/icon/iconfont.woff") format("woff"),
			url("./static/icon/iconfont.ttf") format("truetype");
	}

	@font-face {
		font-family: "myvue-icon";
		src: url("./static/myvue-icon/iconfont.woff2") format("woff2"),
			url("./static/myvue-icon/iconfont.woff") format("woff"),
			url("./static/myvue-icon/iconfont.ttf") format("truetype");
	}

	/* 上面那个 css 里只有 .iconfont 基类，myvue-icon 这个名字要自己配一个 */
	.myvue-icon {
		font-family: "myvue-icon" !important;
		font-size: 16px;
		font-style: normal;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	/*每个页面公共css */
</style>
