# 环境录音与许可

核实日期：2026-10-29。本站仅打包下列六条录音；不通过第三方服务器热链播放。每条原始下载 URL、原始及成品 SHA-256、大小和转码参数见同目录 `manifest.json`。

| 文件 | 作品、作者与来源 | 选用许可 | 修改 |
| --- | --- | --- | --- |
| coffee.mp3 | [coffee cooking](https://opengameart.org/content/coffee-cooking), christoph | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | MP3 转码、响度调整 |
| cup.mp3 | [cutlery sounds — cup_on_table_01](https://opengameart.org/content/cutlery-sounds), TinyWorlds | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | MP3 转码、响度调整 |
| rain.mp3 | [Rainy (NOT loopable)](https://opengameart.org/content/rain-ambient-not-loopable-2-versions-available), OveMelaa / Ove Melaa | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 截取 10–70 秒、MP3 转码、响度调整 |
| waves.mp3 | [Beach Ocean Waves — wave_01](https://opengameart.org/content/beach-ocean-waves), jasinski，由 qubodup 整理 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | MP3 转码、响度调整 |
| fire.mp3 | [Fire Crackling](https://opengameart.org/content/fire-crackling), AntumDeluge | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | MP3 转码、响度调整 |
| crickets.mp3 | [Crickets Ambient Noise — loopable](https://opengameart.org/content/crickets-ambient-noise-loopable), Wolfgang_ / Ted Kerr | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | MP3 转码、响度调整 |

“coffee cooking” 原页面同时提供 CC BY 3.0 / CC BY-SA 3.0；本项目选择 CC BY 3.0，保留作品名、作者、来源、许可及修改说明。作者未为本站背书。音频许可与本项目代码许可分别适用。

播放时连续录音首尾交叠淡化；杯子音效追加 24 秒静默，避免密集重复。音频使用 FFmpeg 7.1 转为单声道 44.1 kHz、96 kbps MP3，响度目标 -24 LUFS、峰值上限 -4 dBTP。制备脚本为 `scripts/prepare-audio.py`；播放时不需要 FFmpeg、Python 或后端。

猫叫完成提示为本项目 Web Audio 合成提示音，不属于录音素材。
