#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[name] = true;
    } else {
      args[name] = next;
      i += 1;
    }
  }
  return args;
}

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    "playwright",
    "/Users/chengfeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      // Try the next known location.
    }
  }

  throw new Error("Unable to load Playwright. Install it locally or set PLAYWRIGHT_MODULE.");
}

function requireArg(args, name) {
  if (!args[name]) {
    console.error(`[error] missing required argument: --${name}`);
    process.exit(1);
  }
  return args[name];
}

async function main() {
  const args = parseArgs(process.argv);
  const projectDir = path.resolve(requireArg(args, "project-dir"));
  const inputVideo = path.resolve(requireArg(args, "input-video"));
  const player = args.player || "final-player.html";
  const playerUrl = args["player-url"] || "";
  const fps = Number(args.fps || 30);
  const width = Number(args.width || 1080);
  const height = Number(args.height || 1440);
  const stageSelector = args.stage || "#stage";
  const framesDir = path.resolve(projectDir, args["frames-dir"] || "renders/final-video-frames");
  const output = path.resolve(projectDir, args.output || "renders/final-1080x1440.mp4");
  const tempVideo = path.resolve(projectDir, args["temp-video"] || "renders/final-video-only.mp4");

  if (!fs.existsSync(projectDir)) throw new Error(`Project directory not found: ${projectDir}`);
  if (!fs.existsSync(inputVideo)) throw new Error(`Input video not found: ${inputVideo}`);

  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(0);

  const playerPath = path.join(projectDir, player);
  const targetUrl = playerUrl || `file://${playerPath}`;
  await page.goto(targetUrl, { waitUntil: "load" });

  let duration = Number(args.duration || 0);
  if (!duration) {
    duration = await page.evaluate(() => window.finalVideo?.totalDuration || 0);
  }
  if (!duration) throw new Error("Unable to determine duration. Pass --duration or expose window.finalVideo.totalDuration.");

  const stage = page.locator(stageSelector);
  const frameCount = Math.ceil(duration * fps);

  for (let i = 0; i < frameCount; i += 1) {
    const time = i / fps;
    await page.evaluate(async (t) => {
      if (typeof window.seekTo !== "function") throw new Error("final-player.html must expose window.seekTo(time)");
      await window.seekTo(t);
    }, time);

    const frameName = `frame-${String(i).padStart(5, "0")}.jpg`;
    await stage.screenshot({
      path: path.join(framesDir, frameName),
      type: "jpeg",
      quality: Number(args.quality || 92),
    });

    if (i % 150 === 0 || i === frameCount - 1) {
      const percent = (((i + 1) / frameCount) * 100).toFixed(1);
      console.log(`[frames] ${i + 1}/${frameCount} ${percent}%`);
    }
  }

  await browser.close();

  fs.rmSync(tempVideo, { force: true });
  fs.rmSync(output, { force: true });

  execFileSync("ffmpeg", [
    "-y",
    "-framerate", String(fps),
    "-i", path.join(framesDir, "frame-%05d.jpg"),
    "-c:v", "libx264",
    "-preset", args.preset || "medium",
    "-crf", String(args.crf || 18),
    "-pix_fmt", "yuv420p",
    tempVideo,
  ], { stdio: "inherit" });

  execFileSync("ffmpeg", [
    "-y",
    "-i", tempVideo,
    "-i", inputVideo,
    "-map", "0:v:0",
    "-map", "1:a:0?",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", args["audio-bitrate"] || "192k",
    "-shortest",
    output,
  ], { stdio: "inherit" });

  console.log(`[done] ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
