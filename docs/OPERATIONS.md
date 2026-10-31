# 部署、维护与故障排查

> 2026-10-31 校正：当前使用静态入口与 GitHub Pages 工作流，真实录音已打包。下述云端命令为历史完整应用方案，当前 package.json 不提供这些脚本；不要直接作为当前操作指引。静态操作以 [STATIC-RELEASE](STATIC-RELEASE.md) 为准，最新状态见 [第一天基线](DAY-1-BASELINE.md)。

完整部署选择、成本与迁移取舍见[部署方案](HOSTING-PLAN.md)，音乐官方接入前置条件见[QQ 申请说明](QQ-MUSIC-ACCESS.md)。

## 本地开发

使用 Node.js 22.17 或更新的受支持版本，依赖版本由 package-lock.json 固定。

```sh
npm ci
npm run check
npm test
npm run dev
```

`dev` 是无后端静态预览，默认 http://127.0.0.1:4173 。可以通过 PORT 环境变量修改端口。

完整后端使用：

```sh
npm run db:local
npm run dev:cloud
```

默认 http://127.0.0.1:8787 ，另一个终端执行 `npm run test:integration`。集成测试仅访问固定的本机地址，创建随机本地测试账号；会解散测试房间并退出登录，账号仍在本地数据库中，绝不指向正式环境。

`public/` 为生成的静态资源，改完前端后重新运行 `npm run build`，Wrangler 会读取更新。`.wrangler/` 是本地数据库及运行状态，不提交。

## GitHub Pages 静态发布

现有 GitHub Actions 在 main 更新后执行检查、测试和静态打包，发布 public/，不把后端源码、测试或文档作为站点根目录发布。当前没有自动推送本地修改。

此模式不提供本站注册/房间。页面会明确显示本地模式，QQ 音乐走官方外链。

## 完整 Cloudflare 部署

以下为人工发布操作说明，本次尚未执行正式资源创建或发布：

1. 使用项目所属 Cloudflare 账号完成 Wrangler 登录。
2. 执行 `npx wrangler d1 create rainy-cafe`，将返回的数据库 ID 写入 wrangler.jsonc，替换占位值。
3. 测试与正式环境使用不同 D1 数据库和 Worker 名称；不能将本地验收数据作为生产数据。
4. 备份现有正式数据库（首次创建除外），执行 `npx wrangler d1 migrations apply rainy-cafe --remote`。
5. 通过检查后执行 `npm run build`，再执行 `npx wrangler deploy`。
6. 在目标 HTTPS 域名验证 Cookie、Origin 校验、登录退出、两账号权限、双浏览器房间及重连。静态资源和 /api 建议同源。

代码里没有音乐平台密钥。将来获得平台接入资格后，用 Wrangler secrets 配置需要保密的值；不要写进前端、仓库、README 或聊天记录。

## 修改功能的位置

| 工作 | 文件 |
| --- | --- |
| 排版与响应式 | index.html、assets/css/styles.css |
| 场景与猫猫插画 | assets/js/scenes.js |
| 环境音及合成/录音资源入口 | assets/js/sound-catalog.js 统一音轨/来源/场景计划，src 字段可加入授权文件路径；audio.js 负责混音 |
| 左侧音乐授权与控制门控 | assets/js/music-session.js；未接入官方适配器前，不能只把状态改为已授权 |
| 音乐平台与 URL 白名单 | assets/js/domain.js 中 MUSIC_PROVIDERS / parseMusicLink；增加平台还需实现播放器及授权 UI |
| 计时、日期与完成去重 | assets/js/domain.js |
| 本地版本与迁移 | assets/js/storage.js，保留原始存储键作为迁移备份 |
| 交互与云端协调 | assets/js/main.js |
| HTTP API / 账号安全 | server/worker.js、server/security.js |
| 房间实时权限 | server/room.js |
| 数据库结构变更 | server/migrations 下新增递增 SQL 文件，已上线迁移不重写 |

## 例行维护

- 每次发布：检查与测试 → 预览 → 数据库兼容性确认 → 发布 → 登录、播放、房间冒烟验证。保留上一稳定版本及对应数据库备份。
- 每周：检查 Worker 错误率、授权失败、WebSocket 重连、D1/音频资源用量。避免记录密码、Cookie、Token、私人任务标题。
- 每月：审阅依赖更新与音乐平台官方能力变化；验证备份恢复。版本升级经测试后更新锁文件。
- 数据库：迁移优先采用可兼容的增量字段/表；回退应用代码不代表数据库会自动回退。不可逆迁移应先准备恢复方案。
- 会话和限流桶：每日定时清理已过期行，代码在 Worker scheduled 中。本地定时任务需手动触发，Wrangler 不会自动执行。
- 账号上线前确认无邮箱账号的密码恢复政策；当前尚无自动找回密码入口。

## 常见故障

- 页面可用但账号不可用：确认访问的是 Worker 域名或 8787，而不是 GitHub Pages / 4173；检查 /api/health 与 D1 绑定。
- 登录显示请求来源不允许：检查前后端是否同源、HTTPS 与反向代理是否一致；不要通过移除 Origin 校验解决。
- QQ 音乐需要重新登录：在 QQ 官方页面处理。本站没有平台 Cookie，也不能替平台恢复会话。
- 环境音无声：先点击播放，检查单轨音量、环境音静音和系统音量；此版本为合成音景，暂无真实录音。
- 改了页面但 Wrangler 没更新：重新 `npm run build`，检查 public/ 的生成时间。
- 房间重连失败：检查会话是否过期、成员是否已离开、房间是否解散、域名是否支持 WebSocket；客户端每三秒尝试恢复。

正式上线前还应确定数据保留、用户数据导出/删除及备份保留周期；当前未实现账号自助删除。
