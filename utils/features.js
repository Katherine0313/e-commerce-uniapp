// 小程序功能开关：未开通的功能先隐藏入口，避免审核判定「点击无响应」
// 功能上线后把对应项改成 true，入口自动恢复显示（页面/数据不用改）
export const FEATURES = {
	vip: false, // VIP 会员：权益、开通流程未实现
	coupon: false, // 优惠券：无接口、无页面
	points: false, // 积分：无接口、无页面
	agreement: false, // 用户协议页未实现
	privacy: false // 隐私政策页未实现
}
