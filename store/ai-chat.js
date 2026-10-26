import {
	defineStore
} from 'pinia'
import {
	matchAutoReply,
	matchHumanIntent,
	DEFAULT_REPLY
} from '../utils/auto-reply.js'
import {
	chatStream
} from '../api/agent.js'
import {
	ensureLogin
} from '../utils/auth.js'

let msgId = 0

const greeting = () => [{
	id: ++msgId,
	role: 'bot',
	text: '你好，我是杰米多多 AI，有什么可以帮你？'
}]

const newSessionId = () =>
	'float-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)

/**
 * 全局 AI 对话状态：悬浮球和「专属客服」页共用，
 * 放在 Pinia 里，切换页面不会丢消息；sessionId 让后端 Redis 串起多轮上下文。
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
		 * 发送一条消息。人工客服本地拦截；其余走大模型流式；
		 * AI 失败/超时/空回复时用本地规则兜底。
		 */
		send(text) {
			const content = String(text || '').trim()
			if (!content || this.sending) {
				return false
			}
			this.ensureSession()
			this.messages.push({
				id: ++msgId,
				role: 'user',
				text: content
			})

			// 人工客服不能交给大模型：要展示微信原生客服按钮
			const human = matchHumanIntent(content)
			if (human) {
				this.messages.push({
					id: ++msgId,
					role: 'bot',
					...human
				})
				return true
			}

			const fallback = matchAutoReply(content) || {
				...DEFAULT_REPLY
			}
			this.sending = true
			this.messages.push({
				id: ++msgId,
				role: 'bot',
				text: '',
				typing: true,
				ai: true,
				contact: false,
				feedback: false
			})
			// 取 Pinia 里的响应式引用，流式追加才能触发视图更新
			const botMsg = this.messages[this.messages.length - 1]
			let fullText = ''

			// 对话接口要求登录令牌：先确保已静默登录，避免冷启动时偶发 401
			ensureLogin().then(() => {
				chatStream({
					message: content,
					sessionId: this.sessionId,
					onChunk: (chunk) => {
						if (botMsg.typing) {
							botMsg.typing = false
						}
						fullText += chunk
						botMsg.text = fullText
					},
					onDone: () => {
						this.sending = false
						if (!fullText.trim()) {
							Object.assign(botMsg, {
								...fallback,
								typing: false
							})
						}
					},
					onError: () => {
						this.sending = false
						if (!fullText.trim()) {
							Object.assign(botMsg, {
								...fallback,
								typing: false
							})
						} else {
							botMsg.typing = false
						}
					}
				})
			}).catch(() => {
				// 用户手动退出登录：不走接口，直接用本地规则回复
				this.sending = false
				Object.assign(botMsg, {
					...fallback,
					typing: false
				})
			})
			return true
		}
	}
})
