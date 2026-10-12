# 口播成片产物契约

这个文件只在需要实现 HTML 模块、时间线预览或最终播放器时读取。普通分镜稿阶段不需要加载。

## 视觉帧规则

- 所有最终画面都是固定 3:4 竖屏帧，默认 `1080x1440`。
- `.screen` 内不能滚动；某个时间点的画面必须是固定状态。
- 长网页必须变成截图视口、裁切、推拉缩放或明确步骤状态，不能直接用可滚动 iframe。
- 每个视觉帧只保留一个主视觉来源：一张图、一段视频、一个截图或一个 HTML 页面。
- 可以在主视觉上叠加标签、描边、箭头、圈选、高亮。
- 不要在画面底部加“画面动作”解释；动作说明放在分镜稿或 cue 表里。
- 信息图优先复用原图，再做局部高亮，不要默认重画。

## Cue 表

每个 cue 都是一个语义触发点，必须绑定到口播句子。

```markdown
| Cue | 字幕 | 时间 | 口播句子 | 画面动作 |
|---|---:|---:|---|---|
| 4-3 | 21 | 00:38.7 | 以前没有 Codex 的话 | 画面切到“以前：要绕出去” |
```

不要只写 `step 1 / step 2 / step 3`。没有口播句子的 step 不可靠。

## HTML 模块

最小结构：

```html
<section class="screen step-0" id="screen">
  ...
</section>

<div class="hud">...</div>
<script src="render-mode.js"></script>
<script>
  const screen = document.getElementById("screen");

  function setStep(step) {
    screen.className = `screen step-${Math.max(0, Math.min(step, MAX_STEP))}`;
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "set-step") return;
    setStep(Number(event.data.step || 0));
  });
</script>
```

要求：

- 根节点使用 `.screen`。
- 状态由 `.step-N` 类控制。
- 监听 `postMessage({ type: "set-step", step })`。
- 同时支持 `postMessage({ type: "set-step", step, time })` 和 `window.__VIDEO_CURRENT_TIME__`；最终逐帧导出会反复 seek 到任意时间点，HTML 模块必须能从当前时间直接恢复到正确状态，不依赖自然播放过渡。
- 手动检查时可以保留 HUD；最终渲染必须通过 `render-mode.js` 隐藏。
- 最终渲染必须使用固定 `1080x1440` 画布坐标。不要在主视觉上写 `max-width: 520px`、`height: min(..., 620px)` 这类预览尺寸上限，否则放到成片里会变成“小图”。逻辑图、流程图、说明图默认使用统一主视觉区：宽约 `900px`、高约 `1040px`、水平居中，除非分镜明确要求满屏或小窗。
- 响应式 CSS 只能服务手动预览；`?render=1` 下必须回到固定尺寸和统一安全区。HTML 模块之间的主视觉大小要一致，不能每个模块各自按内容自适应。
- 最终逐帧导出时必须禁用 CSS transition / animation。状态变化由当前 `time` 或 `step` 决定，不要依赖 `.22s ease`、`requestAnimationFrame` 播放进度或真实时间累计。
- 需要手绘感高亮时，用 Rough.js；如果会增加不稳定性，用 SVG 兜底。
- Rough.js 不要每帧重画，只在 step、视口或图片尺寸变化时重画。

导出前抽检：

- 新增或修改 HTML 模块后，先用 final-player 在 `1080x1440` viewport 下抽该模块的关键帧，不只看单独 HTML 页面。
- 至少检查该模块第一步、最后一步，以及它放回时间线后的实际时间点。
- 如果一条视频里有多个 HTML module，必须从 `final-player.html` 的 scenes 枚举所有 module 逐个抽帧；不要只检查刚改过或主观认为高风险的几页。漏检某一页时，最终导出会忠实保留那一页的小字、小框或预览比例问题。
- 如果 HTML 模块相对视频/截图明显偏小、偏大、偏上、偏下，先修模块坐标和 render mode，再整条导出。

## 时间线预览

预览播放器必须有：

- 播放 / 暂停
- 和原视频/原音频同步的进度条
- 音量控制
- 倍速：`1x`、`1.25x`、`1.5x`、`2x`

倍速必须同时影响隐藏的原视频时钟和可见视频片段，保证音画同步。

## 最终播放器

场景列表结构：

```js
const scenes = [
  { id: "1", kind: "video", start: 0, end: 7.62 },
  {
    id: "2",
    kind: "html",
    src: "module-02-proof.html",
    start: 7.62,
    end: 10.82,
    maxStep: 1,
    cueSteps: [
      { at: 7.62, step: 0 },
      { at: 9.00, step: 1 }
    ]
  }
];
```

必须暴露：

```js
window.seekTo = async function seekTo(time) {
  // 加载当前场景，seek 视频或给 iframe 发送 set-step。
  return { scene: currentScene.id, kind: currentScene.kind, time, step };
};

window.finalVideo = { scenes, totalDuration };
```

基础 CSS：

```css
html,
body,
#stage {
  width: 1080px;
  height: 1440px;
  margin: 0;
  overflow: hidden;
  background: #f3ecdd;
}

#stage video,
#stage iframe {
  position: absolute;
  inset: 0;
  width: 1080px;
  height: 1440px;
  border: 0;
  background: #f3ecdd;
}
```

HTML 模块必须用 `?render=1` 加载。最终播放器不能出现控制条、HUD、审核信息或浏览器 UI。

## 验收命令

```bash
ffprobe -v error \
  -show_entries format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels \
  -of json /absolute/path/to/final.mp4
```

抽关键帧示例：

```bash
ffmpeg -y -ss 00:00:09.10 -i final.mp4 -frames:v 1 renders/final-check-009s.jpg
ffmpeg -y -ss 00:01:31.70 -i final.mp4 -frames:v 1 renders/final-check-092s.jpg
ffmpeg -y -ss 00:02:51.50 -i final.mp4 -frames:v 1 renders/final-check-172s.jpg
```
