import { BASE_URL } from '../utils/server-api.js'
import { getToken } from '../utils/token.js'

/**
 * AI 客服对话（SSE 流式）。
 * 微信小程序用 wx.request + enableChunked 接收分片；基础库不支持时降级为非流式。
 *
 * @param {Object} opts
 * @param {string} opts.message   用户输入
 * @param {string} opts.sessionId 会话 ID（后端用它把多轮历史存 Redis）
 * @param {(text:string)=>void} opts.onChunk 每收到一段增量文本回调
 * @param {(text:string)=>void} opts.onDone  流结束回调（完整文本）
 * @param {(err:any)=>void} opts.onError     失败回调
 */
export function chatStream({ message, sessionId, onChunk, onDone, onError }) {
	// #ifdef MP-WEIXIN
	// 低版本基础库没有分片能力：直接走非流式接口
	const canChunk = (typeof wx.canIUse === 'function' &&
			wx.canIUse('request.object.enableChunked')) ||
		(typeof wx.getSystemInfoSync === 'function' &&
			compareVersion(wx.getSystemInfoSync().SDKVersion, '2.20.0') >= 0)
	if (!canChunk) {
		chatOnce({ message, sessionId, onChunk, onDone, onError })
		return
	}

	let finished = false
	let buffer = new Uint8Array(0)
	let fullText = ''
	// 首字看门狗：15 秒还没收到任何分片就主动断开，页面走规则兜底
	let firstChunkTimer = null
	const clearFirstChunkTimer = () => {
		if (firstChunkTimer) {
			clearTimeout(firstChunkTimer)
			firstChunkTimer = null
		}
	}

	const finish = () => {
		if (finished) return
		finished = true
		clearFirstChunkTimer()
		onDone && onDone(fullText)
	}
	const fail = (err) => {
		if (finished) return
		finished = true
		clearFirstChunkTimer()
		onError && onError(err)
	}

	const header = { 'content-type': 'application/json' }
	const token = getToken()
	if (token) {
		header.Authorization = 'Bearer ' + token
	}

	const task = wx.request({
		url: BASE_URL + '/api/agent/chat/stream',
		method: 'POST',
		header,
		data: {
			message,
			sessionId,
			scene: 'customer-service'
		},
		enableChunked: true,
		timeout: 60000,
		success: (res) => {
			if (res.statusCode < 200 || res.statusCode >= 300) {
				fail({
					statusCode: res.statusCode,
					message: '请求失败（' + res.statusCode + '）'
				})
				return
			}
			// 流结束后把缓冲区里剩余的内容也解析掉
			flush(true)
			finish()
		},
		fail: (err) => fail(err)
	})

	if (typeof task.onChunkReceived !== 'function') {
		// 理论上走不到这里（上面已判断 canChunk），兜底防止卡死
		fail({ message: '当前微信版本不支持流式输出' })
		return task
	}

	firstChunkTimer = setTimeout(() => {
		try {
			task.abort()
		} catch (e) {
			// 忽略 abort 异常
		}
		fail({ message: 'AI 响应超时' })
	}, 15000)

	let gotFirstChunk = false
	task.onChunkReceived((res) => {
		if (!gotFirstChunk) {
			gotFirstChunk = true
			clearFirstChunkTimer()
		}
		appendBytes(new Uint8Array(res.data))
		flush(false)
	})

	// 追加二进制分片
	function appendBytes(bytes) {
		const next = new Uint8Array(buffer.length + bytes.length)
		next.set(buffer, 0)
		next.set(bytes, buffer.length)
		buffer = next
	}

	// 只在完整的空行边界（\n\n）处解码，避免中文多字节被分片截断
	function flush(force) {
		let cut = -1
		for (let i = 0; i < buffer.length - 1; i++) {
			if (buffer[i] === 10 && buffer[i + 1] === 10) {
				cut = i + 2
			}
		}
		if (cut === -1 && !force) {
			return
		}
		const end = cut === -1 ? buffer.length : cut
		const text = utf8Decode(buffer.slice(0, end))
		buffer = buffer.slice(end)
		parseEvents(text)
	}

	// 解析 SSE：取 data: 行；没有 data: 前缀的普通行按续行处理，
	// 兼容服务端把换行原样写进 data 的情况（避免丢内容）
	function parseEvents(text) {
		text.split('\n\n').forEach((event) => {
			if (!event) return
			const parts = []
			event.split('\n').forEach((raw) => {
				const line = raw.replace(/\r$/, '')
				if (line.startsWith('data:')) {
					parts.push(line.slice(5).replace(/^ /, ''))
				} else if (line.startsWith('event:') || line.startsWith('id:') ||
					line.startsWith('retry:') || line === '') {
					// 其余 SSE 字段忽略
				} else {
					parts.push(line)
				}
			})
			const data = parts.join('\n')
			if (!data) return
			fullText += data
			onChunk && onChunk(data)
		})
	}
	// #endif

	// #ifndef MP-WEIXIN
	chatOnce({ message, sessionId, onChunk, onDone, onError })
	// #endif
}

/**
 * 非流式兜底：H5 / 低版本小程序用。
 * 不走 request 封装，是为了把错误交给页面决定（页面要展示兜底气泡，而不是弹 toast）。
 */
function chatOnce({ message, sessionId, onChunk, onDone, onError }) {
	const header = { 'content-type': 'application/json' }
	const token = getToken()
	if (token) {
		header.Authorization = 'Bearer ' + token
	}
	uni.request({
		url: BASE_URL + '/api/agent/chat',
		method: 'POST',
		header,
		data: {
			message,
			sessionId,
			scene: 'customer-service'
		},
		timeout: 60000,
		success: (res) => {
			if (res.statusCode < 200 || res.statusCode >= 300 ||
				!res.data || !res.data.success) {
				onError && onError({
					statusCode: res.statusCode,
					message: (res.data && res.data.message) || 'AI 服务暂不可用'
				})
				return
			}
			const reply = (res.data.data && res.data.data.reply) || ''
			onChunk && onChunk(reply)
			onDone && onDone(reply)
		},
		fail: (err) => onError && onError(err)
	})
}

// 基础库版本比较：v1 > v2 返回 1，v1 < v2 返回 -1
function compareVersion(v1, v2) {
	const a = String(v1 || '').split('.').map(Number)
	const b = String(v2 || '').split('.').map(Number)
	const len = Math.max(a.length, b.length)
	for (let i = 0; i < len; i++) {
		const x = a[i] || 0
		const y = b[i] || 0
		if (x > y) return 1
		if (x < y) return -1
	}
	return 0
}

// UTF-8 解码（小程序不一定有 TextDecoder；按完整事件解码，不会截断中文）
function utf8Decode(bytes) {
	let out = ''
	for (let i = 0; i < bytes.length;) {
		const b = bytes[i++]
		if (b < 0x80) {
			out += String.fromCharCode(b)
		} else if (b < 0xE0) {
			out += String.fromCharCode(((b & 0x1F) << 6) | (bytes[i++] & 0x3F))
		} else if (b < 0xF0) {
			out += String.fromCharCode(((b & 0x0F) << 12) |
				((bytes[i++] & 0x3F) << 6) |
				(bytes[i++] & 0x3F))
		} else {
			const cp = ((b & 0x07) << 18) |
				((bytes[i++] & 0x3F) << 12) |
				((bytes[i++] & 0x3F) << 6) |
				(bytes[i++] & 0x3F)
			const v = cp - 0x10000
			out += String.fromCharCode(0xD800 + (v >> 10), 0xDC00 + (v & 0x3FF))
		}
	}
	return out
}
