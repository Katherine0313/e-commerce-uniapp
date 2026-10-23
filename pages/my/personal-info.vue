<template>
	<view class="page">
		<CustomNavbar title="个人信息" :show-back="true" />

		<!-- 资料卡：头像 / 昵称 / 手机号 -->
		<view class="card">
			<!-- 头像：chooseAvatar 必须由用户点击触发，所以包在 button 里 -->
			<view class="row">
				<text class="label">头像</text>
				<button open-type="chooseAvatar" @chooseavatar="onChooseAvatar" class="avatar-btn">
					<image v-if="form.avatar" :src="form.avatar" class="avatar"></image>
					<view v-else class="avatar avatar-default">微</view>
					<uni-icons type="right" size="14" color="#c0c0c0"></uni-icons>
				</button>
			</view>

			<!-- 昵称：失焦或键盘「完成」时保存 -->
			<view class="row">
				<text class="label">昵称</text>
				<input class="input" v-model="form.name" maxlength="32" placeholder="点击设置昵称"
					placeholder-class="placeholder" confirm-type="done" @blur="saveName" @confirm="saveName" />
				<uni-icons type="right" size="14" color="#c0c0c0"></uni-icons>
			</view>

			<!-- 手机号：已绑定显示脱敏号码；未绑定走微信手机号授权 -->
			<view class="row">
				<text class="label">手机号</text>
				<text v-if="form.phone" class="value">{{ maskPhone(form.phone) }}</text>
				<button v-else open-type="getPhoneNumber" @getphonenumber="onGetPhone" class="bind-btn">去绑定</button>
			</view>
		</view>

		<!-- 只读信息 -->
		<view class="card">
			<view class="row last">
				<text class="label">注册时间</text>
				<text class="value">{{ formatCreateTime(createTime) }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { useUserStore } from '../../store/user.js'
	import { ensureLogin } from '../../utils/auth.js'
	import { getProfile, uploadAvatar, updateName, bindPhone } from '../../api/login.js'
	import { parseOrderTime } from '../../utils/format.js'

	export default {
		data() {
			return {
				store: useUserStore(), // 用户信息统一走 Pinia，改完同步回「我的」页
				form: {
					name: '',
					avatar: '',
					phone: ''
				},
				createTime: null, // 注册时间原样存后端返回值，展示时再格式化
				originalName: '', // 已保存的昵称，用于失焦时判断是否真的改了
				savingName: false // confirm + blur 可能连着触发，防止重复提交
			}
		},
		onShow() {
			// 免登录：直接进本页（分享等）时先确保已登录，再拉最新资料
			ensureLogin()
				.then(() => getProfile())
				.then((profile) => {
					this.form = {
						name: profile.name || '',
						avatar: profile.avatar || '',
						phone: profile.phone || ''
					}
					this.originalName = this.form.name
					this.createTime = profile.createTime
					this.store.setUserInfo({
						id: profile.id,
						name: profile.name,
						avatar: profile.avatar
					})
				})
				.catch(() => {})
		},
		methods: {
			// 换头像：chooseAvatar 给的是本地临时路径，必须上传后端换成可访问 URL
			onChooseAvatar(e) {
				const filePath = e.detail.avatarUrl
				if (!filePath) {
					return
				}
				uploadAvatar(filePath).then((url) => {
					this.form.avatar = url
					this.store.setAvatar(url)
					uni.showToast({
						title: '头像已更新',
						icon: 'success'
					})
				}).catch((err) => {
					// uploadAvatar 不走 request 封装，错误提示要自己来
					uni.showToast({
						title: (err && err.message) || '头像上传失败',
						icon: 'none'
					})
				})
			},
			// 保存昵称：为空回退，没改动不发请求
			saveName() {
				const name = (this.form.name || '').trim()
				if (!name) {
					this.form.name = this.originalName
					uni.showToast({
						title: '昵称不能为空',
						icon: 'none'
					})
					return
				}
				if (name === this.originalName || this.savingName) {
					this.form.name = name
					return
				}
				this.savingName = true
				updateName(name).then((saved) => {
					this.form.name = saved
					this.originalName = saved
					// 保留 id/avatar，只替换昵称
					this.store.setUserInfo({
						...this.store.userInfo,
						name: saved
					})
					uni.showToast({
						title: '昵称已更新',
						icon: 'success'
					})
				}).catch(() => {
					this.form.name = this.originalName
				}).finally(() => {
					this.savingName = false
				})
			},
			// 绑定手机号：getPhoneNumber 授权拿 code，后端换号码并写库
			onGetPhone(e) {
				const code = e.detail && e.detail.code
				if (!code) {
					uni.showToast({
						title: '已取消手机号授权',
						icon: 'none'
					})
					return
				}
				bindPhone(code).then((phone) => {
					this.form.phone = phone
					uni.showToast({
						title: '手机号已绑定',
						icon: 'success'
					})
				}).catch(() => {
					// 错误提示已在 request 封装里统一处理
				})
			},
			// 手机号脱敏：138****8000，非 11 位原样返回
			maskPhone(phone) {
				return String(phone || '').replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
			},
			// 注册时间展示：兼容 Jackson 3 的 ISO 字符串 / 数组两种序列化
			formatCreateTime(t) {
				if (!t) {
					return '—'
				}
				if (typeof t === 'string') {
					return t.replace('T', ' ').slice(0, 16)
				}
				const ms = parseOrderTime(t)
				if (!ms) {
					return '—'
				}
				const d = new Date(ms)
				const pad = (n) => String(n).padStart(2, '0')
				return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
			}
		}
	}
</script>

<style scoped>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		box-sizing: border-box;
		padding-bottom: env(safe-area-inset-bottom);
		background: #F8F8F8;
	}

	/* 通用白卡片 */
	.card {
		margin: 20rpx 20rpx 0;
		padding: 0 24rpx;
		background: #ffffff;
		border-radius: 16rpx;
	}

	/* 一行资料：左侧标签，右侧内容，行间细分隔线 */
	.row {
		display: flex;
		align-items: center;
		min-height: 100rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.row.last {
		border-bottom: none;
	}

	.label {
		width: 140rpx;
		flex-shrink: 0;
		font-size: 28rpx;
		color: #333333;
	}

	/* 头像按钮：去掉 button 默认样式，只当点击区域用 */
	.avatar-btn {
		display: flex;
		align-items: center;
		flex: 1;
		justify-content: flex-end;
		margin: 0;
		padding: 0;
		background: none;
		border: none;
		line-height: 1;
	}

	.avatar-btn::after,
	.bind-btn::after {
		border: none;
	}

	.avatar {
		width: 88rpx;
		height: 88rpx;
		margin-right: 12rpx;
		border: 2rpx solid #f0f0f0;
		border-radius: 50%;
	}

	/* 无头像时的占位块 */
	.avatar-default {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #e6e6e6;
		color: #999;
		font-size: 32rpx;
	}

	.input {
		flex: 1;
		text-align: right;
		font-size: 28rpx;
		color: #333333;
	}

	.placeholder {
		color: #c0c0c0;
	}

	.value {
		flex: 1;
		text-align: right;
		font-size: 28rpx;
		color: #666666;
	}

	/* 「去绑定」小胶囊按钮 */
	.bind-btn {
		height: 56rpx;
		line-height: 56rpx;
		margin: 0 0 0 auto;
		padding: 0 24rpx;
		font-size: 24rpx;
		color: #FF6700;
		background: #FFF3E8;
		border-radius: 28rpx;
	}
</style>
