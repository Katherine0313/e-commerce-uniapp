import { useUserStore } from '../store/user.js'
import { wxLogin } from '../api/login.js'

// 需要登录的操作（加购、下单）前调用：已登录直接放行，未登录则静默登录。
// uni.login 只换 code，不弹授权框，用户全程无感；
// 需要用户主动操作的只有头像（chooseAvatar）和昵称（nickname 输入框）。
export async function ensureLogin(){
	const store = useUserStore()
	// 已经有 token 就不用再走一遍登录
	if(store.isLogin){
		return true
	}

	const { code } = await uni.login({ provider: 'weixin' })
	const res = await wxLogin(code)
	store.setToken(res.token)
	store.setUserInfo({ id: res.id, name: res.name, avatar: res.avatar })
	return true
}
