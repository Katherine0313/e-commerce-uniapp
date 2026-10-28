import {
	defineStore
} from 'pinia'
import {
	matchAutoReply,
	matchHumanIntent,
	DEFAULT_REPLY
} from '../utils/auto-reply.js'

let msgId = 0

const greeting = () => [{
	id: ++msgId,
	role: 'bot',
	text: '你好，我是客服助手，有什么可以帮你？'
}]

const newSessionId = () =>
	'float-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)

/**
 * 全局客服对话状态：悬浮球和「专属客服」页共用，
 * 放在 Pinia 里，切换页面不会丢消息。
 * 回复只查本地固定知识库（utils/auto-reply.js），不调用大模型。
 */
export const useAiChatStore = defineStore('aiChat', {
	state: () => ({
		visible: false, // 聊天面板是否打开
		sessionId: '',
		sending: false,
		messages: greeting(),
		// 悬浮球位置（px）：null 表示还没拖过，由组件按右侧中间初始化
		ballLeft: null,
		ballTop: null
	}),
	actions: {
		ensureSession() {
			if (!this.sessionId) {
				this.sessionId = newSessionId()
			}
		},
		// 记住悬浮球位置，切页面不回到默认位置
		setBallPos(left, top) {
			this.ballLeft = left
			this.ballTop = top
		},
		open() {
			this.ensureSession()
			this.visible = true
		},
		close() {
			this.visible = false
		},
		// 新对话：换 sessionId + 清空消息
		reset() {
			this.sessionId = newSessionId()
			this.messages = greeting()
			this.sending = false
		},
		/**
		 * 发送一条消息：只查本地固定知识库（规则表），不调用大模型。
		 * 命中「人工客服」意图时展示微信原生客服按钮，未命中走兜底话术。
		 */
		send(text) {
			const content = String(text || '').trim()
			if (!content || this.sending) {
				return false
			}
			this.messages.push({
				id: ++msgId,
				role: 'user',
				text: content
			})

			// 人工客服要展示微信原生客服按钮，不能走规则表
			const human = matchHumanIntent(content)
			if (human) {
				this.messages.push({
					id: ++msgId,
					role: 'bot',
					...human
				})
				return true
			}

			// 固定知识库查询：命中规则返回答案，未命中引导人工客服
			const reply = matchAutoReply(content) || {
				...DEFAULT_REPLY
			}
			this.messages.push({
				id: ++msgId,
				role: 'bot',
				text: reply.text,
				contact: !!reply.contact,
				feedback: !!reply.feedback,
				ai: true // 展示「自动答复」标识
			})
			return true
		}
	}
})
