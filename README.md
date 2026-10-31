# life.ing｜生活进行时

嫩黄色背景、咖啡色线条和嫩粉色音乐角落（浅色与深色模式保持一致）的静态专注网页。

- 四个原创 SVG 场景，真实开放许可录音可独立混音。
- 左侧收藏 QQ 音乐歌曲／歌单链接，在原平台打开收听。
- 右上角待办、番茄钟、场景／猫猫设置与本机专注记录。
- 本地保存任务、音量、链接与计时；无需登录和后端。

本次不提供音乐授权、站内音乐播放、云端账号或多人房间。

Node.js 22.17+，无需安装依赖：

```sh
npm run dev
npm run check
npm test
npm run build
```

推送 main 后 GitHub Actions 将 public/ 发布到 GitHub Pages。

- [静态版发布与维护](docs/STATIC-RELEASE.md)
- [当前基线与第一天验收](docs/DAY-1-BASELINE.md)
- [一周优化计划](docs/LIFE-ING-WEEK-PLAN.md)
- [第六天性能与发布前验收](docs/DAY-6-VALIDATION.md)
- [录音作者、来源、许可与修改说明](assets/audio/CREDITS.md)
- [音频文件清单与 SHA-256](assets/audio/manifest.json)
