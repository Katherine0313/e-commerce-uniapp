import {
	defineStore
} from 'pinia'
import {
	matchAutoReply,
	matchHumanIntent,
	DEFAULT_REPLY
} from '../utils/auto-reply.js'
import {
	askAgent,
	handoff,
	getConversation,
	getMessages
} from '../api/agent.js'

let msgId = 0

const greeting = () => [{
	id: ++msgId,
	role: 'bot',
	text: '你好，我是客服助手，有什么可以帮你？'
}]

const newSessionId = () =>
	'float-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)

const HUMAN_POLL_INTERVAL = 3000

/**
 * 全局客服对话状态：悬浮球和「专属客服」页共用，
 * 放在 Pinia 里，切换页面不会丢消息。
 *
 * 回答优先走后端知识库（/api/agent/chat），后端不可用时才用本地规则兜底；
 * 「人工客服」在本地拦截，保证能立刻拉起微信原生客服会话。
 */
export const useAiChatStore = defineStore('aiChat', {
	state: () => ({
		visible: false, // 聊天面板是否打开
		sessionId: '',
		sending: false,
		messages: greeting(),
		// 悬浮球位置（px）：null 表示还没拖过，由组件按右侧中间初始化
		ballLeft: null,
		ballTop: null,
		// 人工客服相关
		conversationId: null,
		humanMode: false,
		humanTimer: null
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
			this.stopHumanPolling()
			this.sessionId = newSessionId()
			this.conversationId = null
			this.humanMode = false
			this.messages = greeting()
			this.sending = false
		},

		// ===== 人工客服 =====
		startHumanPolling() {
			this.stopHumanPolling()
			this.humanTimer = setInterval(() => this.refreshHuman(), HUMAN_POLL_INTERVAL)
		},
		stopHumanPolling() {
			if (this.humanTimer) {
				clearInterval(this.humanTimer)
				this.humanTimer = null
			}
		},
		async refreshHuman() {
			if (!this.conversationId) return
			const id = this.conversationId
			try {
				const [msgRes, convRes] = await Promise.all([
					getMessages(id),
					getConversation(id)
				])
				if (id !== this.conversationId) return

				const list = (msgRes || []).filter(m => m.type === 'user' || m.type === 'assistant')
				this.messages = list.map(m => ({
					id: m.id,
					role: m.type === 'user' ? 'user' : 'bot',
					text: m.content || '',
					human: m.type === 'assistant'
				}))

				// 客服结束会话后切回 AI
				if (convRes && !convRes.humanMode && this.humanMode) {
					this.humanMode = false
					this.stopHumanPolling()
					this.messages.push({
						id: 'local-close',
						role: 'bot',
						text: '人工客服已结束本次会话，如有其他问题可以继续咨询 AI 客服。',
						human: true
					})
				}
			} catch (e) {
				// 轮询失败静默，下一轮重试
			}
		},
		async handoffToHuman(content) {
			if (this.sending) return false
			this.sending = true
			try {
				const res = await handoff(this.conversationId || undefined, content || '人工客服')
				if (res.conversationId) {
					this.conversationId = res.conversationId
					this.humanMode = true
				}
				await this.refreshHuman()
				this.startHumanPolling()
				return true
			} catch (e) {
				this.messages.push({
					id: 'local-handoff-err',
					role: 'bot',
					text: '转人工失败，请检查网络后重试',
					human: true
				})
				return false
			} finally {
				this.sending = false
			}
		},
		async sendHumanMessage(content) {
			if (this.sending) return false
			this.sending = true
			try {
				await handoff(this.conversationId, content)
				await this.refreshHuman()
				return true
			} catch (e) {
				return false
			} finally {
				this.sending = false
			}
		},
		/**
		 * 发送一条消息：先请求后端知识库，失败/超时才用本地规则兜底。
		 * 命中「人工客服」意图时本地直接展示微信原生客服按钮。
		 */
		async send(text) {
			const content = String(text || '').trim()
			if (!content || this.sending) {
				return false
			}
			this.ensureSession()
			this.sending = true
			this.messages.push({
				id: 'local-' + (++msgId),
				role: 'user',
				text: content
			})

			// 已经在人工模式：直接走人工通道发消息
			if (this.humanMode) {
				return await this.sendHumanMessage(content)
			}

			// 命中「人工客服」意图：转接后端人工客服
			const human = matchHumanIntent(content)
			if (human) {
				return await this.handoffToHuman(content)
			}

			try {
				const result = await askAgent({
					message: content,
					sessionId: this.sessionId
				})
				this.messages.push({
					id: 'local-' + (++msgId),
					role: 'bot',
					text: result.reply || DEFAULT_REPLY.text,
					contact: !!result.contact,
					feedback: !!result.feedback,
					ai: true // 展示「自动答复」标识
				})
			} catch (e) {
				// 后端不可用：本地规则兜底，保证用户总能收到一句回复
				const reply = matchAutoReply(content) || {
					...DEFAULT_REPLY
				}
				this.messages.push({
					id: 'local-' + (++msgId),
					role: 'bot',
					text: reply.text,
					contact: !!reply.contact,
					feedback: !!reply.feedback,
					ai: true
				})
			} finally {
				this.sending = false
			}
			return true
		}
	}
})
