#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

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

const args = parseArgs(process.argv);
const projectDir = path.resolve(args["project-dir"] || ".");
const filePattern = new RegExp(args.pattern || "^module-.*\\.html$");
const renderModePath = path.join(projectDir, "render-mode.js");

const renderModeSource = `(() => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("render")) return;

  const style = document.createElement("style");
  style.id = "render-mode-css";
  style.textContent = \`
    html,
    body {
      width: 1080px !important;
      height: 1440px !important;
      min-height: 1440px !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      display: block !important;
      background: #f3ecdd !important;
    }

    body {
      position: relative !important;
      align-items: initial !important;
      justify-content: initial !important;
      gap: 0 !important;
    }

    body > :not(.screen) {
      display: none !important;
    }

    .screen {
      position: absolute !important;
      inset: 0 !important;
      width: 1080px !important;
      height: 1440px !important;
      min-width: 1080px !important;
      max-width: none !important;
      aspect-ratio: auto !important;
      margin: 0 !important;
    }

    *,
    *::before,
    *::after {
      transition-duration: 0s !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
    }
  \`;
  document.head.appendChild(style);
})();
`;

if (!fs.existsSync(projectDir)) {
  console.error(`[error] project directory does not exist: ${projectDir}`);
  process.exit(1);
}

fs.writeFileSync(renderModePath, renderModeSource);
console.log(`[write] ${renderModePath}`);

const htmlFiles = fs
  .readdirSync(projectDir)
  .filter((file) => filePattern.test(file))
  .map((file) => path.join(projectDir, file));

for (const file of htmlFiles) {
  let source = fs.readFileSync(file, "utf8");
  if (source.includes("render-mode.js")) {
    console.log(`[skip] ${file}`);
    continue;
  }
  if (!source.includes("</head>")) {
    console.log(`[warn] missing </head>: ${file}`);
    continue;
  }
  source = source.replace("</head>", '    <script src="render-mode.js"></script>\n  </head>');
  fs.writeFileSync(file, source);
  console.log(`[patch] ${file}`);
}

console.log(`[done] render mode installed for ${htmlFiles.length} module file(s)`);
