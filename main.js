import App from './App'
// 自定义顶部导航栏，全局注册后各页面直接用 <CustomNavbar />
import CustomNavbar from './pages/index/component/TopBar.vue'
// 自定义底部导航栏，全局注册后各 tabBar 页直接用 <CustomTabBar />
import CustomTabBar from './pages/index/component/TabBar.vue'
// 自定义轮播图，全局注册后各页面直接用 <CustomSwiper />
import CustomSwiper from './components/CustomSwiper.vue'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
Vue.component('CustomNavbar', CustomNavbar)
Vue.component('CustomTabBar', CustomTabBar)
Vue.component('CustomSwiper',CustomSwiper)
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
import {
	createPinia
} from 'pinia'
export function createApp() {
	const app = createSSRApp(App)
	// 全局注册自定义导航栏组件
	app.component('CustomNavbar', CustomNavbar)
	// 全局注册自定义底部导航栏组件
	app.component('CustomTabBar', CustomTabBar)
	// 全局注册自定义轮播图组件
	app.component('CustomSwiper',CustomSwiper)
	// 创建 Pinia 实例并注册，统一管理全局状态
	const pinia = createPinia()
	app.use(pinia)
	return {
		app
	}
}
// #endif
