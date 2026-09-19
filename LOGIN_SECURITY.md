# 微信登录安全说明（session_key 处理规范）

## 背景

微信小程序登录时，后端用 `code` 调微信 `jscode2session` 接口，返回两个关键字段：

- `openid`：用户在小程序下的唯一标识；
- `session_key`：会话密钥，用于解密手机号、用户敏感数据等，**属于敏感凭证**。

## 当前问题（学习阶段）

现在 `WXLoginController` 把 `session_key` 连同 `openid` 一起通过 `/api/wxlogin` 返回给了前端：

```json
{
  "code": 200,
  "data": { "openid": "...", "session_key": "..." }
}
```

前端控制台可直接打印出 `session_key`，存在泄露风险。学习阶段可以接受，正式做登录态时必须调整。

## 正式方案（要做登录态时改成这样）

### 1. 后端自己保存 session_key，不返回前端

后端拿到微信返回后，把 `openid` + `session_key` 存到服务端（数据库 / Redis），
只返回 `openid` 或自己签发的 token：

```json
{
  "code": 200,
  "data": { "token": "自签发的登录凭证", "openid": "..." }
}
```

### 2. 签发 token 代替 session_key

登录成功后，后端生成一个 token（如 JWT 或随机 token），
与 `openid` / `session_key` 关联存储，返回给前端。

### 3. 后续请求用 token 鉴权

前端把 token 放在请求头（如 `Authorization`），
后端校验 token 换取用户身份，**前端永远不接触 `session_key`**。

## 要点

- `session_key` 只在后端内存 / 存储中出现，不出现在任何返回给前端的数据里；
- `session_key` 有有效期，微信接口可能返回新值，后端要能覆盖更新；
- 需要解密敏感数据（手机号、步数等）时，由后端持 `session_key` 完成解密，而不是把 key 交给前端解密。
