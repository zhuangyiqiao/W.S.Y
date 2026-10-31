# life.ing 2.1.0｜发布记录

日期：2026-10-31。

## 发布范围

四场景与四猫定位、海边椰子树秋千椅、场景交叉淡化、猫咪计时反馈、自由混音与偏好恢复、音轨失败重试及取消、手机音频面板、焦点与存储容错、闲置音频缓存回收。

包含本轮实现、回归测试、浏览器验收工具和开发文档。server/、wrangler.jsonc、旧云端测试及未接入音乐适配器不纳入本次提交和静态发布。

版本信息在 assets/release.json；保留原本地存储键。静态版仍通过 QQ 官方外链收听音乐，无账号与云同步。

## 发布前验证

23 项自动测试、代码检查和构建通过。Chrome/Edge 本地验收与六尺寸回归已通过，详见 DAY-6-VALIDATION.md 和 BUGFIX-VALIDATION.md。

真实手机、Safari/Firefox、主观音质和长期后台播放尚未完成验证，不在本轮已验证范围内。

## 发布状态

- 已提交并推送 main：4a0e2965b814bb9886900b4022754e6760e1a3ea。
- [GitHub Actions 41169428021](https://github.com/zhuangyiqiao/W.S.Y/actions/runs/41169428021)：completed / success。
- 正式网址：[life.ing](https://zhuangyiqiao.github.io/W.S.Y/)。线上 assets/release.json 返回版本 2.1.0。
- 六条线上 MP3 均返回成功，SHA-256 与本地 manifest 一致。
- 线上 Chrome 手机视口：推荐环境音真实加载播放、添加任务并关联计时、切海边秋千椅不重置计时、刷新不自动播放，均通过；页面 JavaScript 异常为 0。
- [线上验证结果](release-live-results.json)；[线上截图](release-live-2.1.png)。
- 以上功能版本已发布。本文件及验证证据由后续文档提交补充，文档不进入站点产物。

## 回退方式

上一稳定代码提交为 a87c50a（life.ing 更名版）。若本轮发布出现阻塞问题，使用 git revert 撤销本轮功能提交，生成新提交后推送 main，再确认 Deploy Pages 成功。不要 reset 或强制推送；回退代码不会清除用户浏览器的本地数据。

本轮功能回退目标为 4a0e296：执行 git revert 4a0e296 后推送 main，等待 Deploy Pages 再次成功并核验页面。后续文档提交可以保留，不改变运行代码。
