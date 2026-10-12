---
name: chengfeng-videocut-skills:口播成片
description: 口播视频成片 Skill。把文章/口播稿/SRT、剪后视频和 HTML/图片素材串成分镜稿、时间线预览和最终 1080x1440 竖版 MP4。触发词：口播成片、做分镜稿、时间线预览、合成口播视频、导出竖屏MP4
---

# 口播成片

## 官方来源

本 Skill 由 **chengfeng / AI产品自由** 原创并维护。

```text
https://github.com/Agentchengfeng/chengfeng-videocut-skills
```

官方账号：GitHub `@Agentchengfeng`；X `@chengfeng240928`；小红书 / 公众号 / B站 / 抖音 / 视频号 `AI产品自由`。

## 核心流程

这个 Skill 只解决一件事：把一条口播视频做成完整竖屏成片。

```text
+-----------------------------+
|  输入                         |
|  视频 + 字幕 + 可选素材         |
+--------------+--------------+
               |
               v
+-----------------------------+
|  1. 分镜稿                    |
|  按字幕拆段 + 决定画面来源      |
+--------------+--------------+
               |
               v
+-----------------------------+
|  2. 时间线预览                 |
|  原视频/截图/HTML 与口播对齐    |
+--------------+--------------+
               |
               v
+-----------------------------+
|  3. 合成                       |
|  导出 1080x1440 竖版 MP4       |
+--------------+--------------+
               |
               v
+-----------------------------+
|  验收                         |
|  ffprobe + 抽关键帧检查         |
+-----------------------------+
```

不要把 cue 表、HTML 模块、review player、final player、导出脚本单独讲成用户流程。它们只是“时间线预览”和“合成”里的实现细节。

## 输入

先定位这些文件：

- 主视频：`source_cut.mp4`、`*_cut.mp4` 或用户指定的剪后视频。
- 字幕：`subtitles.srt`、`video.srt` 或 `subtitles_with_time.json`。
- 可选文稿：文章、口播稿、正文草稿，只用于理解意图。
- 可选素材：`assets/` 里的截图、产品页、评论图、结果页、证明页。
- 项目规则：如果当前项目有 `AGENTS.md` 或 `README.md`，先读。

真相源优先级：

```text
实际音频 / 字幕 > 剪后视频画面 > 素材文件 > 文稿草稿
```

如果文稿和实际字幕不一致，以字幕和音频为准。

## 第 1 步：分镜稿

默认先做 HTML 分镜核对页，不先写 Markdown 表格。

常见路径：

```text
review/storyboard-audit-vN.html
```

默认基于这个模板：

```text
templates/storyboard-audit.html
```

分镜稿要让用户回答：

```text
这句话说到这里，观众眼前该看到什么？
```

每段至少写清楚：

- 时间范围
- 字幕编号
- 完整口播
- 画面任务
- 画面类型：`原视频`、`页面录屏`、`评论截图`、`信息图聚焦`、`HTML 字卡`、`操作录屏`
- 素材来源
- 镜头动作

画面选择规则：

- 真实操作、证明页、结果页、需要可信度的片段：保留原视频。
- 录屏 / 原视频片段默认按原画面展示；只有明确需要避开后续统一字幕时，才把该段标记为录屏小窗，并在底部留出字幕安全区。不要把小窗规则批量套到所有录屏段。
- 流程、机制、对比关系、缺素材片段：做 HTML 画面。
- 已有截图或信息图：优先复用，不要重画。
- 同一张图多次出现时，每次必须承担不同任务：全貌、局部聚焦、对比、结果复看。

分镜方向确认前，不要进入时间线预览。

## 第 2 步：时间线预览

分镜方向确认后，再做时间线预览。

常见路径：

```text
review/timeline-preview.html
```

默认基于这个模板：

```text
templates/timeline-preview.html
```

时间线预览要检查：

- 画面切换是否跟口播句子对齐。
- 原视频有没有被误换成 HTML。
- 被标记为录屏小窗的段落是否避开底部字幕安全区；未标记的录屏段不要被自动缩窗。
- 截图、页面、证明素材有没有用错。
- 图片素材默认保留左右边距，不要贴满 3:4 画面；需要强调完整截图时再单独缩小。
- 画面有没有挡字、裁切、留黑边。
- HTML 模块单独看没问题，但放进整条时间线后是否仍然成立。

预览页里有源视频时，必须用支持 HTTP Range 的服务打开页面，否则浏览器不能随机 seek，进度条会被拉回开头。不要用普通 `python -m http.server` 预览 MP4 时间线。默认使用：

```bash
node ~/.Codex/skills/chengfeng-videocut-skills/口播成片/scripts/serve_range_preview.cjs \
  --project-dir /absolute/path/to/project \
  --port 8767
```

必要时生成：

```text
docs/08-动画cue表-vN.md
html-modules/module-*.html
```

每个动画动作必须绑定到具体口播句，不要平均分配时间。

## 第 3 步：合成

只有用户确认时间线预览后，才能合成。

合成前创建或确认：

```text
final-player.html
```

新写 `final-player.html` 或 HTML 模块前，读取：

```text
references/artifact-contracts.md
```

如果项目里有 HTML 模块，先注入 render mode：

```bash
node ~/.claude/skills/chengfeng-videocut-skills/口播成片/scripts/write_render_mode.cjs \
  --project-dir /absolute/path/to/project
```

导出最终视频：

```bash
node ~/.claude/skills/chengfeng-videocut-skills/口播成片/scripts/export_final_video.cjs \
  --project-dir /absolute/path/to/project \
  --input-video /absolute/path/to/source_cut.mp4 \
  --duration 173.03 \
  --output renders/final-1080x1440.mp4
```

项目与默认值不同时，可传：

```text
--fps
--player
--stage
--frames-dir
--width
--height
```

## 验收

导出成功不等于成片正确。必须做两步：

1. 用 `ffprobe` 检查分辨率、帧率、时长和音频。
2. 抽 3 张以上关键帧，人工看画面是否正确。

默认期望：

```text
1080x1440
30fps
时长和剪后源视频一致
有音频
无 HUD、按钮、审核时间线、浏览器 UI
```

## 边界

适合：

- 中文口播
- 教程、产品演示、结果展示、知识讲解
- 已有剪后视频和字幕，素材可后补
- 原视频 + 截图 + HTML 解释画面混合成片

不优先解决：

- 没有视频，直接凭文稿生成成片
- 复杂多机位真人剪辑
- 需要剪辑软件工程文件的精细调色和多轨混音
- 用户没看分镜稿和时间线预览就直接要求最终发布

## 项目卫生

如果在用户写作工作区内新增或修改文件，必须同步更新项目 README 索引。

不要在这个 Skill 目录里新增 README。这个 Skill 的核心文件只保留：

```text
SKILL.md
templates/
references/
scripts/
```
