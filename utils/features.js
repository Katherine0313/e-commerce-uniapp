// 小程序功能开关：未开通的功能先隐藏入口，避免审核判定「点击无响应」
// 功能上线后把对应项改成 true，入口自动恢复显示（页面/数据不用改）
export const FEATURES = {
	vip: true, // 会员：等级 + 成长值 + 会员专享券（2026-10-30 已实现）
	coupon: true, // 优惠券：领券中心 / 我的券 / 下单选券（2026-10-30 已实现）
	points: false, // 积分：无接口、无页面
	agreement: false, // 用户协议页未实现
	privacy: false // 隐私政策页未实现
}
