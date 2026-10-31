# Spotify 接入核查

核查日期：2026-10-29。仅核查官方文档，没有登录用户账号、创建应用或修改当前音乐平台优先级。

## 能否自助接入

可以自助创建开发应用，采用 OAuth 和 Web Playback SDK 验证个人网页播放器；这不等于可以立即向所有访客开放。官方开发模式要求应用所有者保持 Premium，最多 5 个授权白名单用户。白名单外用户即使能完成登录，也可能在 API 调用时收到 403。[官方配额说明](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)

面向公众需要申请扩展配额。目前新合作方申请要求组织主体、已上线服务，以及至少 25 万月活等条件。因此，对现阶段个人项目，不能把自助创建应用当成公开上线接入已获准。[同一配额说明的 Extended quota mode 部分](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)

2026 年 7 月更新将每个开发者的 Client ID 上限增到 25，开发应用共享账号配额；不能把这个“25”理解成允许 25 位测试用户。[官方更新](https://developer.spotify.com/blog/2026-07-23-web-api-quota-updates)

## 左侧播放器的组成

| 能力 | 官方组件 |
| --- | --- |
| 用户授权 | OAuth Authorization Code 或 PKCE |
| 读取允许的歌单、元数据、发送播放命令 | Web API，需要相应用户权限 |
| 在当前浏览器内实际播放 | Web Playback SDK，需要 Spotify Premium 播放账号 |
| 快速展示平台自己的播放器 | 官方 Embed；不等于自定义控制器或个人音乐库接入 |

[OAuth 文档](https://developer.spotify.com/documentation/web-api/concepts/authorization)、[Web Playback SDK 入门](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started)、[官方嵌入](https://developer.spotify.com/documentation/embeds)。

PKCE 不需要在浏览器中保存 Client Secret，因此单独的个人 Spotify 验证页面可以使用静态托管。完整咖啡馆仍因本站账号、云端任务和多人房间需要后端；建议同源 Worker 管理业务会话及音乐令牌。若采用服务端令牌保存，Refresh Token 与 Client Secret 留在后端，SDK 所需的短期 Access Token 仅按需交给浏览器，不把“所有令牌都不能到前端”当成实现方式。

## 与当前需求直接相关的限制

Spotify 开发者政策 III.7 限制将 Spotify 内容与其他音频混合、重叠；III.5 也限制集成其他服务的流或内容。政策另有计时提醒和商业流媒体用途方面的约束。[官方开发者政策](https://developer.spotify.com/policy)

据此，不能把“Spotify 音乐 + 本站雨声/篝火等同时混音”和“三平台合一播放器”直接视作已获允许的上线方案。即便开发模式 API 能成功调用，产品用途仍需按平台政策调整或获得明确许可。若仅验证独立 Spotify 音乐模式，应与环境音播放互斥；互斥也不代表完整番茄钟产品自动通过其他政策要求。

## 若进行小范围技术验证

1. 使用具有 Premium 的应用所有者账号进入 [Developer Dashboard](https://developer.spotify.com/dashboard)，按账户界面创建应用。
2. 为测试与正式环境分别登记准确回调 URI。正式使用 HTTPS；本地可用显式回环地址，例如 `http://127.0.0.1:8787/api/music/spotify/callback`。官方不允许 `localhost` 作为回调主机。[回调要求](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
3. 配置必要权限，例如个人歌单读取与 `streaming`；播放状态和控制按实际需要申请，不把 App-only Client Credentials 用于读取用户私有数据。[权限说明](https://developer.spotify.com/documentation/web-api/concepts/scopes)
4. 将测试账号加入白名单，验证授权、取消、过期刷新、个人歌单、SDK 设备就绪、用户点击播放、暂停/切歌/进度/音量。
5. 音频由浏览器中的官方 SDK 播放，不经 Worker 抓取，也不下载到 D1/R2。独立的环境音资源继续与 Spotify 内容分开。
6. 未获得公开接入许可前，仅作为合适账号的小范围验证，不承诺所有访客可使用。

当前项目尚未实现 Spotify OAuth 或 SDK；原来的 QQ 优先顺序未因这份核查而改变。
