# life.ing｜第六天：性能、回归与发布准备

日期：2026-10-31。本机可执行的回归和性能检查已完成，进入第七天发布准备。真实设备及其他浏览器未测试项保留如下，不标为已通过。

## 性能优化

音频解码缓存新增 24MiB 的闲置回收预算。缓存按近期使用排序，超预算时清理较旧的非播放录音；播放中的缓冲不被强制移除，暂停后再次回收。因此该预算不是全页面内存硬上限，六轨同时播放允许暂时超过预算。

首屏继续只请求页面、样式和脚本，音频在用户点击后加载。素材保持现有六条 MP3，本轮不增加依赖、场景或新功能。

## 实际浏览器结果

Chrome 156.0.8078.79 与 Edge 156.0.4314.50 均在本机无界面模式通过以下检查：

- 390×844 触控模拟中检查四场景×四猫，共 16 组。
- 同帧连续切场景 80 次，最终仅保留一个图层；垃圾回收前后测量，Chrome DOM 节点 538→538，Edge 538→540。此结果用于观察本次短时切换，不等于长期内存泄漏证明。
- 首屏音频请求 0 次；本地 DOMContentLoaded 约 43/52ms，仅为本机结果，不代表公网或弱网性能。
- 六条真实文件全部加载、解码并启动，活动解码缓存约 37.2MiB；暂停后缓存约 18.5MiB，低于 24MiB 预算，剩余播放音轨数 0。
- 动态启用减少动画偏好后，插画动画实例为 0。
- 844×390 短屏下计时面板位于视口内部，内部内容使用滚动布局。
- 两浏览器未捕获页面 JavaScript 异常。

详细机器结果：[JSON](day6-browser-results.json)；[Edge 短屏截图](day6-edge-short-screen.png)。

优化后重跑 Chrome 完整回归：六种窗口尺寸、真实三轨混音、加载失败重试与取消、快速切场景、关闭动画、过期计时完成去重、禁止本地存储的页面使用，全部通过。窗口尺寸及具体断言见 [历史待验项修复记录](BUGFIX-VALIDATION.md)。

## 自动检查

- npm test：23/23 通过，包含新增缓存淘汰与活动音轨保留测试。
- npm run check：36 个 JavaScript 文件、入口资源与 HTML ID 通过。
- npm run build：通过；生成 public/，不包含文档和测试工具。
- git diff --check：通过。

## 可重复执行的浏览器检查

保留 scripts/browser-audit.mjs 与 scripts/performance-audit.mjs。工具只使用临时本地数据，脚本退出时关闭浏览器和临时预览服务；不访问 QQ 账号、不发布站点。

可选安装测试工具（不修改产品依赖清单）：

```powershell
npm install --prefix .release-check --no-save --package-lock=false --ignore-scripts playwright
node scripts/browser-audit.mjs
node scripts/performance-audit.mjs
```

当前脚本面向本机 Windows 的标准 Chrome/Edge 路径，其他机器需修改 executablePath。首次脚本安装需网络，浏览器检查仅访问本地页面；生产页面不需要 Playwright。

## 验证边界和发布交接

尚未测试：物理手机及软键盘、Safari/Firefox、真实长时间后台播放、耳机或扬声器主观试听。Chrome/Edge 同属 Chromium，不能以本轮结果代替所有浏览器支持结论。当前已验证的设备范围为桌面 Chrome/Edge 与其触控/视口模拟。

第七天执行：审阅本轮改动范围、提交推送、确认 GitHub Actions、核对 GitHub Pages 子路径和线上音频，再记录发布版本及回退方案。当前尚未提交、推送或发布。
