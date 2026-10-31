# 部署方案：保留 GitHub 仓库，完整应用采用同源 Worker

日期：2026-10-29。本次提供方案与现有配置说明，没有创建付费资源或执行正式部署。

## 推荐方案的准确含义

正式完整应用的页面和 API 都由 Cloudflare 同一域名提供，GitHub 保留源码、版本记录与 CI。GitHub Pages 可以另留静态演示入口，但不是完整应用运行账号和房间所必需的一层。

例如，用户访问 `https://cafe.example.com/` 获取页面，新增任务请求同域 `/api/tasks`，加入房间连接同域 `/api/rooms/房间码/socket`。同域让现有相对 API 地址、Cookie 与 Origin 校验可以继续使用。

## 一次访问如何经过这些服务

1. 浏览器打开页面，Static Assets 返回 public/ 中的 HTML、CSS、JavaScript 和 SVG。
2. 用户新增/完成任务时，Worker 校验会话、输入和任务所属用户，再读写 D1。D1 保存长期业务数据，不存音乐音频文件。
3. 用户进入房间时，Worker 校验成员身份，再将 WebSocket 交给该房间的 Durable Object。它协调成员在线状态、共享场景和允许的操作；私人任务标题和音乐 Token 不广播。
4. 专注剩余时间按截止时间在浏览器计算，不需要每秒写数据库。计时操作、成员心跳和房间快照通过实时通道同步。
5. 环境录音较少时随静态文件发布，规模增大后放 R2；R2 只存自有或获授权的环境素材。音乐平台歌曲不下载到 R2。
6. 如接入音乐，Worker 负责必要的授权与令牌业务，实际播放使用平台批准的浏览器播放器/SDK。能部署后端不等于获得音乐平台权限。

## GitHub Pages 能做什么

[GitHub Pages 是静态托管](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)，可以继续部署 HTML/CSS/JS、SVG 和小型音频文件，运行本地任务、计时器、环境音。

本站账号会话、音乐授权密钥/令牌交换、数据库与房间 WebSocket 需要后端。GitHub 仍然作为源码、版本历史与 CI 平台，不必迁走仓库。

| 方案 | 优点 | 对当前代码的代价 | 建议 |
| --- | --- | --- | --- |
| 全站 Cloudflare Worker + Static Assets + D1 + Durable Objects | 同源会话和回调，符合当前后端代码；不用维护常驻服务器 | 创建 D1、绑定域名、配置正式资源与 secrets | 首选 |
| GitHub Pages 前端 + 独立 API 后端 | 保留现有静态入口 | 当前使用同源 /api，必须改 API 地址，处理 CORS、跨站 Cookie、CSRF 与回调；部分浏览器会限制跨站会话 | 可做，但维护更复杂 |
| 腾讯云等服务器 + 对象存储/CDN | 可按目标网络选择区域，便于对接要求固定出口的服务 | 当前 D1/DO 不能直接搬到 Node，需要替换数据库适配和房间服务，另做运维 | 当目标网络实测或平台要求不适合 Worker 时考虑 |

## 首选结构

```text
GitHub 仓库 → 检查、测试、静态构建
                     ↓
             HTTPS 自定义域名
                     ↓
        Cloudflare Worker + Static Assets
          ├─ /、/assets/*  前端与插画
          ├─ /api/auth/*   本站账号与安全会话
          ├─ /api/music/*  官方授权、令牌与播放适配（待获批）
          ├─ D1           账号、任务、设置、歌单、每日汇总
          └─ Durable Objects + WebSocket  房间实时状态

音频录音较多时：独立 R2 存储 + CDN 域名
```

[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) 支持在 Worker 项目中提供前端静态资源。现有 `wrangler.jsonc` 已采用该结构，`npm run build` 生成 public/，`/api/*` 由 Worker 先处理。

建议先把少量授权音频与前端一起打包；素材增长后移入 R2。R2 按存储和操作计费，官方定价当前说明无互联网出口流量费，但仍应计算读取操作与其他服务成本。[R2 定价](https://developers.cloudflare.com/r2/pricing/)

## 环境与发布步骤

1. 本地保持现有 Wrangler 模式，测试数据库只在 .wrangler 中。
2. 创建独立的测试与正式 Worker/D1。各环境有不同数据库、域名和音乐回调配置，避免测试账号进入正式库。
3. 在目标环境创建 D1，将返回的真实 ID 写入对应配置；现有占位 ID 只适用于本地验证，不能直接发布。
4. 运行 `npm ci`、`npm run check`、`npm test`，启动本地 Worker 后运行集成测试。
5. 备份已有正式数据库，审阅迁移，再应用目标环境迁移。构建前端后发布 Worker。
6. 先用测试域名确认 HTTPS Cookie、Origin、登录退出、双浏览器房间、音频加载和目标地区网络体验，再切正式域名。
7. 获得 QQ 正式应用后，将应用密钥设为 Worker secrets，固定官方核准的回调地址；完成真实授权和播放验证后才开启播放器能力。
8. 后续通过 GitHub Actions 或 Workers Builds 发布；当前仓库自动工作流仍是静态 Pages，不会自动部署 Worker。切换 CI 前需在平台配置正式资源与最小权限部署凭据。

若音乐平台要求固定出口 IP、特定地区服务器或专用 SDK，要先确认 Worker 是否满足；不通过移除校验或代理未授权音频来解决。

## 预算与维护

- 内测可以评估免费额度；SQLite-backed Durable Objects 当前也支持 Workers Free，但超额操作可能失败，不保证免费额度足够长期在线房间。[Durable Objects 定价](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- 正式运营可从 Workers 付费计划的约 US$5/月起点评估，额外 D1/DO/R2 使用、域名与音乐合作费用另计，不承诺固定总价。[Workers 定价](https://developers.cloudflare.com/workers/platform/pricing/)
- 配置预算提醒，重点观察 API 错误、数据库读写、WebSocket 消息数量、音频存储/读取和音乐授权失败。
- 每次发布保留可回滚的应用版本；数据库增量迁移前做备份，定期验证恢复。密钥与用户 Token 不进入日志。
- 单独评估主要用户地区的网络体验；国内访问效果应实测，不能仅按平台名称推断速度或可达性。

选择托管平台不能替代 QQ 应用审核。方案可先部署账号、任务、房间与声音，音乐站内控制须待官方授权与播放能力获准后交付。

Spotify 的最新核查见 [Spotify 接入核查](SPOTIFY-ACCESS-REVIEW.md)：可以自助开发验证，但白名单、Premium、公开扩展配额与混音政策会影响该产品的可用范围。单独的 Spotify PKCE 验证可用静态页面；完整咖啡馆的账号、数据和房间仍需后端。
