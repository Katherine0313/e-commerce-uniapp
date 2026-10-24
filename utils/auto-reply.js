/**
 * 客服自动回复规则表。
 * 加规则 = 往 RULES 里加一条对象；按数组顺序匹配，第一条命中即返回。
 * 当前策略：大模型流式优先；规则表作为 AI 失败/超时时的兜底。
 * 例外：「人工客服」必须本地拦截（要拉起微信原生客服会话，不能交给模型）。
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
		reply: '单笔订单满 99 元包邮，偏远地区运费以结算页显示为准。'
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
		reply: '当前是智能客服自动回复，需要人工处理请点击下方「联系人工客服」。',
		contact: true,
		// 标记为特殊意图：页面必须本地拦截，不能交给大模型
		intent: 'human'
	}
]

// 没命中规则、且 AI 不可用时的兜底：引导人工客服 + 意见反馈
export const DEFAULT_REPLY = {
	text: '这个问题我还没学会。你可以点击上方「联系人工客服」，或去「意见反馈」留言。',
	contact: true,
	feedback: true
}

/**
 * 只匹配本地规则，未命中返回 null（交给大模型）。
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
 * 页面用它做本地拦截，其余消息一律交给大模型。
 */
export function matchHumanIntent(input) {
	const rule = matchAutoReply(input)
	return rule && rule.intent === 'human' ? rule : null
}

/**
 * 纯规则回复（规则未命中时返回兜底），保留给不需要大模型的场景。
 */
export function getAutoReply(input) {
	return matchAutoReply(input) || { ...DEFAULT_REPLY }
}
