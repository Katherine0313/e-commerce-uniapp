<template>
	<view class="floating-chat">
		<!-- 悬浮球：默认右侧中间，可拖动；轻点打开面板 -->
		<view
			v-if="!store.visible"
			class="float-btn"
			:style="{ left: ballLeft + 'px', top: ballTop + 'px', width: ballSize + 'px', height: ballSize + 'px' }"
			@touchstart.stop="onTouchStart"
			@touchmove.stop.prevent="onTouchMove"
			@touchend.stop="onTouchEnd"
			@touchcancel.stop="onTouchCancel"
		>
			<image class="float-avatar" src="/static/zongjie.jpg" mode="aspectFill"></image>
			<view class="float-badge">客服</view>
		</view>

		<!-- 聊天面板：底部浮层，点遮罩关闭 -->
		<!-- 键盘弹起时不让微信自动推页面（input 的 adjust-position=false），
		     改由 keyboardHeight 给遮罩加 padding-bottom 把面板顶到键盘上方 -->
		<view
			v-if="store.visible"
			class="chat-mask"
			:style="{ paddingBottom: keyboardHeight + 'px' }"
			@click="store.close()"
		>
			<view class="chat-panel" :class="{ fullscreen }" :style="panelStyle" @click.stop>
				<view class="chat-head">
					<image class="head-avatar" src="/static/zongjie.jpg" mode="aspectFill"></image>
					<view class="head-info">
						<text class="head-title">{{ store.humanMode ? '人工客服' : '客服助手' }}</text>
						<text class="head-sub">{{ store.humanMode ? '人工客服接待中，请直接留言' : '常见问题自动答复' }}</text>
					</view>
					<view class="head-actions">
						<text v-if="!store.humanMode" class="head-action" @click="handoffToHuman('人工客服')">转人工</text>
						<text class="head-action" @click="toggleFullscreen">{{ fullscreen ? '还原' : '全屏' }}</text>
						<text class="head-action" @click="resetChat">新对话</text>
						<text class="head-close" @click="store.close()">×</text>
					</view>
				</view>

				<!-- 页面显著位置说明：自动答复内容仅供参考 -->
				<view class="ai-notice">本服务为常见问题自动答复，仅供参考，未解决请联系人工客服</view>

				<scroll-view class="chat-scroll" scroll-y :scroll-top="scrollTop">
					<view class="msg-list">
						<view
							v-for="msg in messages"
							:key="msg.id"
							class="msg-row"
							:class="msg.role"
						>
							<image
								v-if="msg.role === 'bot'"
								class="msg-avatar"
								src="/static/zongjie.jpg"
								mode="aspectFill"
							></image>
							<view class="bubble">
								<text v-if="msg.typing" class="bubble-text typing-text">正在查询…</text>
								<text v-else class="bubble-text">{{ msg.text }}</text>
								<text v-if="msg.ai && !msg.typing" class="ai-tag">自动答复</text>
								<text v-else-if="msg.human && !msg.typing" class="human-tag">人工客服</text>
								<view v-if="msg.contact || msg.feedback" class="bubble-actions">
									<button
										v-if="msg.contact"
										class="bubble-btn"
										@click="handoffToHuman(msg.handoffText)"
										hover-class="none"
									>联系人工客服</button>
									<button
										v-if="msg.feedback"
										class="bubble-btn ghost"
										@click="goFeedback"
									>去意见反馈</button>
								</view>
							</view>
							<image
								v-if="msg.role === 'user' && userAvatar"
								class="msg-avatar msg-avatar-user"
								:src="userAvatar"
								mode="aspectFill"
							></image>
							<view
								v-else-if="msg.role === 'user'"
								class="msg-avatar msg-avatar-user avatar-default"
							>微</view>
						</view>
					</view>
				</scroll-view>

				<!-- 对话刚开始时给几个快捷问题 -->
				<scroll-view v-if="messages.length <= 2" scroll-x class="quick-scroll">
					<view class="quick-list">
						<view
							v-for="q in quickQuestions"
							:key="q"
							class="quick-chip"
							:class="{ disabled: store.sending }"
							@click="ask(q)"
						>{{ q }}</view>
					</view>
				</scroll-view>

				<!-- 输入框：adjust-position=false 阻止微信自动推页面，
				     键盘高度靠 bindkeyboardheightchange 拿，避免面板被顶到屏幕顶部 -->
				<view class="chat-input">
					<input
						class="input"
						v-model="inputText"
						placeholder="问点什么…"
						confirm-type="send"
						:cursor-spacing="20"
						:adjust-position="false"
						@keyboardheightchange="onKeyboardHeightChange"
						@confirm="send"
					/>
					<view
						class="send-btn"
						:class="{ disabled: !inputText.trim() || store.sending }"
						@click="send"
					>发送</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		useAiChatStore
	} from '../../store/ai-chat.js'
	import {
		useUserStore
	} from '../../store/user.js'

	export default {
		name: 'FloatingChat',
		data() {
			const store = useAiChatStore()
			const sysInfo = uni.getSystemInfoSync()
			// 设计稿 104rpx，按当前屏幕宽度换算成 px
			const ballSize = Math.round(104 * sysInfo.windowWidth / 750)
			// 首次渲染直接放到右侧中间，避免先闪到左上角再跳过去
			const ballLeft = store.ballLeft != null ? store.ballLeft :
				Math.max(0, sysInfo.windowWidth - ballSize - 10)
			const ballTop = store.ballTop != null ? store.ballTop :
				Math.max(0, (sysInfo.windowHeight - ballSize) / 2)
			return {
				store,
				userStore: useUserStore(),
				inputText: '',
				scrollTop: 0,
				keyboardHeight: 0,
				// 面板是否全屏（聊天记录长时可放大看）
				fullscreen: false,
				quickQuestions: ['什么时候发货', '怎么退换货', '运费怎么算', '查订单物流'],
				sysInfo,
				ballSize,
				ballLeft,
				ballTop,
				dragStart: null,
				dragging: false
			}
		},
		computed: {
			messages() {
				return this.store.messages
			},
			userAvatar() {
				return this.userStore.userInfo.avatar || ''
			},
			// 键盘弹起时缩短面板，避免输入框被挡住
			panelStyle() {
				if (!this.keyboardHeight) {
					return {}
				}
				return {
					// 遮罩已加 padding-bottom，这里只需把面板高度压到键盘上方
					height: 'calc(' + (this.fullscreen ? '100vh' : '74vh') + ' - ' + this.keyboardHeight + 'px)'
				}
			}
		},
		watch: {
			// 流式输出时消息内容持续变化，deep 监听保持贴底
			messages: {
				deep: true,
				handler() {
					if (this.store.visible) {
						this.scrollToBottom()
					}
				}
			},
			'store.visible'(visible) {
				if (visible) {
					this.scrollToBottom()
				} else {
					// 关掉面板后回到常规尺寸，下次打开不会突然全屏
					this.fullscreen = false
				}
			}
		},
		mounted() {
			this.initBallPos()
			// 小程序被系统回收后重新进入：恢复当天会话，人工会话续上轮询
			this.store.resumeSession()
			// App 端用全局监听，小程序端用 input 的 bindkeyboardheightchange（见模板）
			// #ifdef APP-PLUS
			if (typeof uni.onKeyboardHeightChange === 'function') {
				this._keyboardHandler = (res) => {
					this.keyboardHeight = res.height || 0
				}
				uni.onKeyboardHeightChange(this._keyboardHandler)
			}
			// #endif
		},
		beforeUnmount() {
			// #ifdef APP-PLUS
			if (typeof uni.offKeyboardHeightChange === 'function' && this._keyboardHandler) {
				uni.offKeyboardHeightChange(this._keyboardHandler)
			}
			// #endif
		},
		methods: {
			// 小程序端：input 的 keyboardheightchange 事件
			onKeyboardHeightChange(e) {
				this.keyboardHeight = (e && e.detail && e.detail.height) || 0
			},
			// 首次进入默认右侧中间；之后使用 store 里记住的位置
			initBallPos() {
				const info = this.sysInfo
				const maxLeft = info.windowWidth - this.ballSize
				const maxTop = info.windowHeight - this.ballSize
				if (this.store.ballLeft == null || this.store.ballTop == null) {
					this.ballLeft = Math.max(0, maxLeft - 10)
					this.ballTop = Math.max(0, (info.windowHeight - this.ballSize) / 2)
					this.store.setBallPos(this.ballLeft, this.ballTop)
					return
				}
				this.ballLeft = Math.min(Math.max(0, this.store.ballLeft), maxLeft)
				this.ballTop = Math.min(Math.max(0, this.store.ballTop), maxTop)
			},
			onTouchStart(e) {
				const touch = e.touches && e.touches[0]
				if (!touch) {
					return
				}
				this.dragStart = {
					x: touch.clientX,
					y: touch.clientY,
					left: this.ballLeft,
					top: this.ballTop
				}
				this.dragging = false
			},
			onTouchMove(e) {
				if (!this.dragStart) {
					return
				}
				const touch = e.touches && e.touches[0]
				if (!touch) {
					return
				}
				const dx = touch.clientX - this.dragStart.x
				const dy = touch.clientY - this.dragStart.y
				// 超过 4px 才算拖动，避免轻点被误判
				if (!this.dragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
					this.dragging = true
				}
				if (!this.dragging) {
					return
				}
				const maxLeft = this.sysInfo.windowWidth - this.ballSize
				const maxTop = this.sysInfo.windowHeight - this.ballSize
				this.ballLeft = Math.min(Math.max(0, this.dragStart.left + dx), maxLeft)
				this.ballTop = Math.min(Math.max(0, this.dragStart.top + dy), maxTop)
			},
			onTouchEnd() {
				if (!this.dragStart) {
					return
				}
				if (this.dragging) {
					// 松手吸附到最近的一侧，垂直位置保留
					const centerX = this.ballLeft + this.ballSize / 2
					this.ballLeft = centerX < this.sysInfo.windowWidth / 2 ?
						10 :
						this.sysInfo.windowWidth - this.ballSize - 10
					this.store.setBallPos(this.ballLeft, this.ballTop)
				} else {
					// 轻点打开聊天面板
					this.store.open()
				}
				this.dragStart = null
				this.dragging = false
			},
			// 系统取消触摸（来电/手势打断）只复位，不打开面板
			onTouchCancel() {
				this.dragStart = null
				this.dragging = false
			},
			send() {
				const text = this.inputText.trim()
				if (!text || this.store.sending) {
					return
				}
				this.store.send(text)
				this.inputText = ''
			},
			ask(text) {
				if (this.store.sending) {
					return
				}
				this.inputText = text
				this.send()
			},
			resetChat() {
				// 流式回答中不重置，避免旧请求的回调写进新会话
				if (this.store.sending) {
					return
				}
				this.inputText = ''
				this.store.reset()
			},
			// 全屏 / 还原：聊天记录长时占满整屏看
			toggleFullscreen() {
				this.fullscreen = !this.fullscreen
				this.scrollToBottom()
			},
			// 持续贴底：scroll-top 每次递增，值变化才触发滚动
			scrollToBottom() {
				this.$nextTick(() => {
					this.scrollTop += 10000
				})
			},
			handoffToHuman(text) {
				if (this.store.sending) return
				// 卡片按钮传 msg.handoffText：后端已落库时为空串，避免重复写入用户消息
				this.store.handoffToHuman(text)
			},
			goFeedback() {
				this.store.close()
				uni.navigateTo({
					url: '/pages/my/feedback/feedback'
				})
			}
		}
	}
</script>

<style scoped>
	/* ═══ 悬浮球：右侧中间 ═══ */
	.float-btn {
		position: fixed;
		z-index: 9997;
		box-sizing: border-box;
		border-radius: 50%;
		background: #ffffff;
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.float-avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	.float-badge {
		position: absolute;
		right: -6rpx;
		top: -6rpx;
		padding: 0 10rpx;
		height: 32rpx;
		line-height: 32rpx;
		background: #ff6700;
		color: #ffffff;
		font-size: 18rpx;
		border-radius: 16rpx;
	}

	/* ═══ 遮罩 + 面板 ═══ */
	.chat-mask {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 9998;
		background: rgba(0, 0, 0, 0.35);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		/* padding-bottom 用来给键盘让位，border-box 保证不撑出屏幕 */
		box-sizing: border-box;
	}

	.chat-panel {
		width: calc(100% - 32rpx);
		max-width: 750rpx;
		height: 74vh;
		margin-bottom: calc(16rpx + env(safe-area-inset-bottom));
		background: #f8f8f8;
		border-radius: 24rpx;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		animation: panel-in 0.22s ease-out;
	}

	/* 全屏：撑满整屏，去掉圆角和外边距 */
	.chat-panel.fullscreen {
		width: 100%;
		max-width: none;
		height: 100vh;
		margin-bottom: 0;
		border-radius: 0;
	}

	/* 全屏时头部顶到状态栏底下，补一段安全区，避免标题被时间/刘海遮住 */
	.chat-panel.fullscreen .chat-head {
		padding-top: calc(20rpx + env(safe-area-inset-top));
	}

	@keyframes panel-in {
		from {
			transform: translateY(40rpx);
			opacity: 0;
		}

		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.chat-head {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		padding: 20rpx 24rpx;
		background: #ffffff;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.head-avatar {
		width: 72rpx;
		height: 72rpx;
		border-radius: 50%;
		background: #f0f0f0;
	}

	.head-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		margin-left: 16rpx;
	}

	.head-title {
		font-size: 30rpx;
		font-weight: bold;
		color: #333333;
	}

	.head-sub {
		margin-top: 4rpx;
		font-size: 20rpx;
		color: #999999;
	}

	.head-actions {
		display: flex;
		align-items: center;
	}

	.head-action {
		padding: 8rpx 12rpx;
		font-size: 22rpx;
		color: #ff6700;
	}

	.head-close {
		margin-left: 8rpx;
		padding: 0 8rpx;
		font-size: 40rpx;
		line-height: 1;
		color: #999999;
	}

	/* ═══ 消息 ═══ */
	.chat-scroll {
		flex: 1;
		height: 0;
	}

	.msg-list {
		padding: 24rpx;
	}

	.msg-row {
		display: flex;
		align-items: flex-start;
		margin-bottom: 24rpx;
	}

	.msg-row.user {
		justify-content: flex-end;
	}

	.msg-avatar {
		flex-shrink: 0;
		width: 64rpx;
		height: 64rpx;
		margin-right: 16rpx;
		border-radius: 50%;
		background: #f0f0f0;
	}

	.msg-avatar-user {
		margin-right: 0;
		margin-left: 16rpx;
	}

	.avatar-default {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #999999;
		font-size: 28rpx;
	}

	.bubble {
		max-width: 76%;
		padding: 20rpx 24rpx;
		background: #ffffff;
		border-radius: 16rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
	}

	.msg-row.user .bubble {
		background: #ff6700;
	}

	.bubble-text {
		font-size: 28rpx;
		line-height: 1.6;
		color: #333333;
		word-break: break-all;
	}

	.msg-row.user .bubble-text {
		color: #ffffff;
	}

	.typing-text {
		color: #999999;
	}

	.ai-tag {
		display: inline-block;
		margin-top: 8rpx;
		padding: 2rpx 10rpx;
		border-radius: 6rpx;
		background: #FFF3E8;
		font-size: 20rpx;
		color: #B25B00;
	}

	.human-tag {
		display: inline-block;
		margin-top: 8rpx;
		padding: 2rpx 10rpx;
		border-radius: 6rpx;
		background: #E6F7FF;
		font-size: 20rpx;
		color: #1677FF;
	}

	/* 页面级自动答复提示条 */
	.ai-notice {
		flex-shrink: 0;
		padding: 10rpx 24rpx;
		background: #FFF3E8;
		color: #B25B00;
		font-size: 24rpx;
		text-align: center;
	}

	.bubble-actions {
		display: flex;
		flex-wrap: wrap;
		margin-top: 16rpx;
	}

	.bubble-btn {
		margin: 0 16rpx 0 0;
		padding: 0 20rpx;
		height: 56rpx;
		line-height: 56rpx;
		background: #ff6700;
		color: #ffffff;
		font-size: 24rpx;
		border-radius: 28rpx;
	}

	.bubble-btn::after {
		border: none;
	}

	.bubble-btn.ghost {
		background: #ffffff;
		color: #ff6700;
		border: 1rpx solid #ff6700;
	}

	/* ═══ 快捷问题 ═══ */
	.quick-scroll {
		flex-shrink: 0;
		white-space: nowrap;
		background: #ffffff;
		border-top: 1rpx solid #f0f0f0;
	}

	.quick-list {
		display: flex;
		padding: 16rpx 24rpx;
	}

	.quick-chip {
		flex-shrink: 0;
		margin-right: 16rpx;
		padding: 10rpx 20rpx;
		background: #f5f5f5;
		color: #666666;
		font-size: 24rpx;
		border-radius: 24rpx;
	}

	.quick-chip.disabled {
		opacity: 0.5;
	}

	/* ═══ 输入框 ═══ */
	.chat-input {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		padding: 16rpx 24rpx;
		padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
		background: #ffffff;
	}

	.input {
		flex: 1;
		height: 72rpx;
		padding: 0 24rpx;
		background: #f5f5f5;
		border-radius: 36rpx;
		font-size: 28rpx;
	}

	.send-btn {
		margin-left: 16rpx;
		padding: 0 28rpx;
		height: 72rpx;
		line-height: 72rpx;
		background: #ff6700;
		color: #ffffff;
		font-size: 28rpx;
		border-radius: 36rpx;
	}

	.send-btn.disabled {
		opacity: 0.4;
	}
</style>
