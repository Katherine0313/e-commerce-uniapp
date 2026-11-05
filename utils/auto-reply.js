/**
 * 客服本地兜底规则表。
 * 正常情况由后端知识库回答；这里只在接口失败/超时时兜底。
 * 例外：「人工客服」必须本地拦截（要拉起微信原生客服会话，不能走网络）。
 */

// 匹配前统一处理：去空白、转小写（中文不受影响）
const normalize = (input) => String(input || '').replace(/\s+/g, '').toLowerCase()

const RULES = [
	{
		keywords: ['发货', '什么时候发', '几天到', '多久到', '什么时候到'],
		reply: '付款后 48 小时内发货，一般 2~4 天送达。可在「我的 → 物流查询」查看物流。'
	},
	{
		keywords: ['退货', '退款', '换货', '七天无理由', '7天无理由'],
		reply: '支持 7 天无理由退换（商品需不影响二次销售）。可在订单详情里点「申请售后」。'
	},
	{
		keywords: ['运费', '邮费', '包邮'],
		reply: '全场包邮，不额外收取运费。'
	},
	{
		keywords: ['订单', '物流', '快递', '到哪', '查单'],
		reply: '订单和物流可以在「我的 → 物流查询」或订单列表里查看。'
	},
	{
		keywords: ['优惠', '优惠券', '活动', '打折'],
		reply: '优惠券和活动正在接入中，可以留意首页活动区。'
	},
	{
		keywords: ['人工', '人工客服', '转人工', '真人'],
		reply: '当前是常见问题自动答复，需要人工处理请点击下方「联系人工客服」。',
		contact: true,
		// 标记为特殊意图：页面必须本地拦截，不能交给知识库
		intent: 'human'
	}
]

// 没命中规则时的兜底：引导人工客服 + 意见反馈（与后端兜底话术保持一致）
export const DEFAULT_REPLY = {
	text: '不好意思，这个我不太确定，您可以直接联系人工客服，他们会更快帮您解决。',
	contact: true,
	feedback: true
}

/**
 * 只匹配本地规则，未命中返回 null（交给后端知识库）。
 * @returns {{ text: string, contact?: boolean, feedback?: boolean } | null}
 */
export function matchAutoReply(input) {
	const text = normalize(input)
	if (!text) {
		return null
	}
	const rule = RULES.find(r => r.keywords.some(k => text.includes(normalize(k))))
	if (!rule) {
		return null
	}
	return {
		text: rule.reply,
		contact: !!rule.contact,
		feedback: !!rule.feedback,
		intent: rule.intent
	}
}

/**
 * 只匹配「人工客服」意图：命中返回规则，否则 null。
 * 页面用它做本地拦截，其余消息一律交给后端知识库。
 */
export function matchHumanIntent(input) {
	const rule = matchAutoReply(input)
	return rule && rule.intent === 'human' ? rule : null
}

/**
 * 纯规则回复（规则未命中时返回兜底），后端不可用时用。
 */
export function getAutoReply(input) {
	return matchAutoReply(input) || { ...DEFAULT_REPLY }
}
