# life.ing｜第一天基线与验收

日期：2026-10-31。第一天完成；本记录为本地源码及自动检查结果，不代表本轮线上或真机验收。

## 已确认的现状

- 品牌：life.ing｜生活进行时；入口标题与运行中计时标题已一致。README、当前需求标题和 QQ 申请示例同步更新。V1 原文及历史截图保留旧名称作为历史资料；package.json 的 rainy-cafe 为内部包名，不是展示品牌，不更改存储键。
- 布局：左音乐、中原创 SVG、右声音、右上工具；嫩黄 #fff6bd、咖啡色 #654531、粉色音乐区 #f8dce5。深色主题的音乐区继续保持粉色。
- 已有单机能力：四场景、四猫、QQ 链接收藏和跳转、独立环境音混音、待办、番茄钟、本地偏好与专注统计。未在本轮重新进行浏览器交互和听检。
- 当前脚本仅 dev、check、test、build；自动测试运行 domain.test.js 和 static-audio.test.js，共九项。server/ 及其他云端文件是本地后续资料，不能视为当前入口已接入。

## 固定四场景与猫咪定位规格

保留现有 ID，避免旧偏好失效；四猫 ID 为 black、coal、cream、orange，名称为小黑、煤球、奶糖、橘子。

| 场景 ID | 场景 | 当前实际音轨 ID | 第二天定位目标 |
| --- | --- | --- | --- |
| cafe | 窗边沙发咖啡馆 | machine、cups、rain | 沙发坐垫上，保持接触坐垫 |
| rainy-room | 雨夜工作台 | rain | 键盘旁或书本旁，不遮挡主体 |
| sunny-beach | 晴天海边 | waves | 秋千椅坐垫上（按后续海边修订更新） |
| campfire | 篝火旁 | fire、crickets | 帐篷口软垫上，远离火源 |

当前 scenes.js 仅咖啡馆使用独立变换，其余场景共用猫咪坐标。上表为已确定的实现规格，不标为已完成视觉改造。阅读、学习、工作、发呆用于场景介绍，不替换现有四场景。

## 六条录音核对

| 音轨 ID | 文件 | 清单记录作者 | 清单记录许可 |
| --- | --- | --- | --- |
| machine | coffee.mp3 | christoph | CC BY 3.0 |
| cups | cup.mp3 | TinyWorlds | CC0 1.0 |
| rain | rain.mp3 | OveMelaa / Ove Melaa | CC0 1.0 |
| waves | waves.mp3 | jasinski，由 qubodup 整理 | CC0 1.0 |
| fire | fire.mp3 | AntumDeluge | CC0 1.0 |
| crickets | crickets.mp3 | Wolfgang_ / Ted Kerr | CC0 1.0 |

核对依据：sound-catalog.js、assets/audio/CREDITS.md 和 manifest.json。现有自动测试确认六条文件哈希、源页面、许可与场景引用一致；来源网站未在本轮重新联网核验。清单原核实日期 2026-10-29 保持不变。猫叫为合成提示音，不属于六条录音。

## 本周待做

1. 第 2 天：猫咪按场景定位、统一比例和支撑关系。
2. 第 3 天：交叉淡化、快速切换取消、猫咪计时状态反馈。
3. 第 4 天：推荐/自由混音、失败重试及配置恢复完善。
4. 第 5–7 天：手机面板、完整流程、性能与浏览器验收、发布复验。

每场景六轨继续为 V2 目标；素材未核验不上线、不凑数。QQ 官方个人库和站内播放、账号、云同步、房间、共享歌单与云端热力图继续列入后续阶段。

## 文档校正

DEVELOPMENT、AUDIO-SOURCES、OPERATIONS、REQUIREMENTS-BACKLOG 增加当前状态说明，原记录保留为历史。V2 补充当前发布范围、粉色主题和真实录音的校正说明；V1 保留原文。完整应用托管方案继续保留，不在本周迁移。

## 发布基线与验收结果

- 当前工作流：main 推送触发 .github/workflows/deploy-pages.yml，执行检查、测试、构建后发布 public/ 到 GitHub Pages。
- 音频路径相对模块解析，保留 /W.S.Y/ 子路径支持；不将文档及后端作为站点资源打包。
- npm run check：通过，检查 30 个 JavaScript 文件及入口资源、HTML ID。
- npm test：9/9 通过，包含计时恢复、完成去重、旧数据迁移、链接校验、录音哈希、循环和加载取消。
- npm run build：通过，生成 public/index.html 与 public/assets。
- 本轮没有发布、没有创建云端资源，也没有验证线上 Actions 状态。

短总结：第一天完成品牌和文档基线统一，固定四场景、四猫与六条录音清单；现有检查、九项测试和构建全部通过。第二天开始处理场景插画及猫咪实际定位。
