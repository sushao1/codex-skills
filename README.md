# Codex 技能集合

包含个人技能、两套 Codex 环境的系统技能、插件技能及 Minis 技能，保留各版本的脚本、参考资料、模板与许可文件。

- `codex/`：原版环境技能（含 `.system/`）。
- `codex-copy/`：副本环境技能（含 `.system/`）。
- `plugin-skills/`：按环境、来源及版本保留的插件技能。
- `minis-skills/`：Minis 端技能（SKILL.md 格式）。
- `manifest.json`：各文件大小与 SHA-256 校验值。

已移除私人聊天资料；通用人物建模技能保留的是工具代码和标注为示例的模板。未包含账号凭据、机器配置与插件运行环境。依赖外部工具的技能仍需安装对应插件。第三方文件沿用各自原有许可。

## minis-skills/

Minis 技能，每个目录内含一份 `SKILL.md`（YAML frontmatter + Markdown 指令），放入 Minis 的 `/var/minis/skills/` 即可生效。

| 技能 | 说明 |
|---|---|
| `context-economy` | 节省 token 的三条纪律：大文件先落盘再用 rg 查、能脚本算的绝不读进上下文、读过的存本地别重复抓 |
| `rea-reverse-engineering` | 用 REA 逆向分析二进制、App、网站与运行时行为；含 Alpine/PRoot 环境的安装要点与实测结果 |

