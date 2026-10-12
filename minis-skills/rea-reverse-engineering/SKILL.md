---
name: rea-reverse-engineering
description: 用 REA 逆向分析二进制、App、网站和运行时行为 —— 想知道某个 App/网页/软件的功能是怎么实现的、要拿证据、要照着做一个时使用。支持原生二进制、JavaScript/Electron、.NET、Android APK、WASM、EVM 字节码、固件、网站抓包等。触发词：逆向、反编译、逆向工程、看某 App 怎么实现的、扒功能、REA、rea-agents。
---

# REA 逆向工程

**REA = Reverse Engineer Anything**。一个 MCP 服务器 + CLI，让 agent 能检查**没有源码**的
二进制 / App / 网站，解释功能怎么实现、给出证据、并照着建一个类似的实现。

- 仓库：https://github.com/morluto/rea （MIT，110k★）
- npm：`rea-agents`（最新 6.4.0）
- 官网/指南：https://rea.tools/ · https://rea.tools/guides/ · https://rea.tools/showcase/

**核心价值**：不是"反编译出代码丢给你"，而是**带着证据回答"这功能怎么做的"**，
结论附带证据和局限说明。分析全程在本地，不上传。

---

## 安装状态（本机实测通过，2026-10-12）

**已装好，可直接用。**

| 项 | 状态 |
|---|---|
| Node.js | `v22.23.2` ✅（要求 22.x >=22.19） |
| npm | `10.9.1` ✅ |
| rea | `6.4.0` @ `/usr/local/bin/rea` ✅ |
| 依赖 | `apk add nodejs npm procps` ← **procps 是必须的** |
| npm 缓存 | `/var/minis/workspace/cache/npmcache` |

**如果能重来，按这个顺序装**：
```bash
apk add nodejs npm procps          # procps 必不可少，见下方"三个坑"
export npm_config_cache=/var/minis/workspace/cache/npmcache
npm install --global rea-agents
rea --version                      # 应输出 6.4.0
```

### 三个坑（都踩过并解决）

**坑 1：`ps` 不兼容 —— 必装 procps**
BusyBox 的 `ps` 不支持 `-axo` 选项。REA 启动任何子进程前都会调
`ps -axo pid=,ppid=,pgid=,uid=,stat=,command=` 做进程归属检查，
BusyBox 版直接报 `unrecognized option: x`，导致：
```
capability_unavailable: Linux process ownership inspection requires
a procps-compatible ps on REA's PATH
```
**装 `procps` 后彻底解决**。这是所有分析功能的前置条件。

**坑 2：`rea doctor` 会报 `unsupported_host`**
```
host: alpine 3.21.3 → unsupported_host
remediation: REA supports macOS 12+, Ubuntu 24.04+, Fedora 41+ ...
```
REA 官方支持列表里没有 Alpine。**这个警告可以忽略** —— 实测 JS 静态分析在 Alpine 上
跑得通（见下方验证结果）。但原生分析引擎确实装不上。

**坑 3：别跑 `npx rea-agents setup`**
setup 是给 Claude Code / Cursor / Codex 注册 MCP 用的，会改 agent 配置。
**Minis 有自己的工具系统，不需要 MCP**。直接当 CLI 用。

### 实测验证（JS 静态分析）

拿一个 8 行的 Electron 测试文件跑 `analyze-javascript-application --json`：

```
parsed_javascript_files: 1      ← AST 解析正常
visited_ast_nodes: 69
findings: 6
IPC: operations=1, literal_channels=1, main_handlers=1   ← 正确识别
parse_failures: 0
```

**结论：JS/Electron 静态分析在本机完全可用**，能正确提取 IPC handler 和 channel 名。

---

## 能分析什么（按依赖成本排序）

### 零依赖 / 纯静态（最容易跑通）

| 目标 | 返回什么 |
|---|---|
| **Go 二进制** | 内嵌编译器版本、模块、replace、build settings —— 内置静态 ELF/PE/Mach-O 检查，**不需要装 Go** |
| **.NET 程序集** | 元数据、CIL 指令、声明的原生依赖、构建对比 —— **纯静态，零依赖** |
| **JavaScript / Electron** | 模块、import、source map、路由、IPC、原生插件关系 —— 只需 Node + npm |
| **网站** | 页面结构、脚本、网络观测、截图 —— 需要 Chrome 系浏览器 |
| **保存的网络抓包** | 请求、响应、暴露的 payload、来源位置 —— 只需 HAR 文件 |

### 需要外部工具

| 目标 | 依赖 |
|---|---|
| 原生二进制 | Hopper / Ghidra / IDA 任选其一 |
| Android APK | 无头 JADX + 完整 JDK（Linux/macOS/Win x64） |
| Android 设备 | adb（模拟器或真机）—— 设备、包、进程、日志、dump、截图、APK 传输 |
| Android 资源 | Apktool |
| 固件 | Binwalk / Unblob（Linux） |
| EVM 字节码 / Linux 崩溃记录 / ELF 布局 | pwntools（Linux x64） |
| WASM | WABT 1.0.42 |
| JEB 工程 | 自己启动 JEB client，设 `REA_JEB_MCP_URL` |
| 进程行为 | Linux/macOS + 原生 PTY |

---

## 用法

### CLI（推荐在 Minis 里用）

```bash
# 分析 JS / Electron 应用（提供目录或 ASAR 的绝对路径）
npx -y rea-agents@latest analyze-javascript-application /abs/path/to/app --json

# 装成全局命令
npm install --global rea-agents
rea --help

# 更新（改得很快，新 bug 修复频繁）
rea update
```

一次性命令用 `npx rea-agents@latest <cmd>`；装了全局就用 `rea <cmd>`。

### 原生分析先配 provider

原生二进制分析需要先选 provider（Hopper / Ghidra / IDA）。大二进制要调长启动超时：
- `REA_GHIDRA_STARTUP_TIMEOUT_MS`
- `REA_HOPPER_STARTUP_TIMEOUT_MS`

细节见 CLI and Evidence 指南。

---

## 实战案例（README 里的，可作参照）

| 案例 | 做了什么 |
|---|---|
| **DX-Ball** | 追踪 sound 调用到 position-to-pan 辅助函数，把不完整伪代码还原成 C。**通过 3,205 个原始 x86 用例，复现全部 63 字节编译产物** |
| **Notion** | 追踪 Electron 剪贴板桥：renderer 的 API → preload → IPC → 主进程，检查富文本剪贴板格式 |
| **TH04** | 分析 PC-98 游戏的 16 位指令，恢复固定/瞄准角度计算，与历史编译器输出对比 |

---

## 工作流（推荐）

```
1. 装 Node + rea-agents
2. 判断目标类型 → 走静态还是原生（静态先试，零依赖）
3. CLI 分析，--json 拿结构化结果
4. 让模型基于结果解释 / 照做
```

**静态优先**：JS/Electron、.NET、Go 二进制都不需要额外引擎，能跑就先跑这些。
**原生（Hopper/Ghidra/IDA）成本最高**，而且这些是商业/重型工具，在手机沙箱里基本装不上。

---

## 边界与提醒

- **合法性**：REA 明确定位为「**合法**研究、教育、互操作、软件保存，以及**你拥有或获授权分析**的软件」。
  商业工具（IDA Pro、Hopper、JEB）需自行合法获取授权。
- **手机沙箱的实际限制**：原生分析引擎（Hopper/Ghidra/IDA/JEB）在 PRoot 里装不上或极难跑通。
  本机能实际用的是 **JS/Electron、.NET、Go 二进制、网站** 这几类。
- **Android APK 分析**需要 JADX + JDK，理论上可行但体积和内存开销大，谨慎评估。
- **别跑 `setup`**：那是给 Claude Code / Cursor / Codex 注册 MCP 用的，Minis 不需要。
- **项目更新很快**，用之前先 `rea update`。

---

## 一句话

> **已装好可用（rea 6.4.0）。JS/Electron、.NET、Go 二进制等静态目标在手机上是真能跑的；
> 原生二进制分析需要专业引擎，在 Alpine 沙箱里基本没戏。记得先装 procps。**
