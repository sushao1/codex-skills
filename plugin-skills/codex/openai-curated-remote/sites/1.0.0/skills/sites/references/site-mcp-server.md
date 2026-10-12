# Site MCP server

Build an MCP server that exposes the Site's operations as tools for ChatGPT, Codex, or another supported caller.

## Expose Tools

Add `"mcp"` to `.openai/hosting.json`'s `capabilities`, preserving existing entries. Expose a stateless HTTP `POST /mcp` endpoint supporting initialization, tool discovery, and tool calls. Use the Site's Worker runtime; no local stdio server is needed.

Sites handles connection authentication and OAuth. Use its [request identity](identity-and-secrets.md#request-identity) and enforce the product's access rules on data-bearing calls, returning HTTP 401 or 403 when unauthorized. Keep discovery free of private data. Preserve user-specific authorization even when another supported access path can reach the Site: [service access](identity-and-secrets.md#service-access) does not create a user identity or consent to access that user's connected apps.

## Publish and Connect

Publish through the shared [workflow](../SKILL.md#workflow). Sites provisions the App and private plugin; reuse them on updates instead of creating another App or configuring a local MCP connection.

For a new Site plugin, or an installation/reconnection request:

1. Call `get_site` with `include_mcp_connection: true` and retain its returned plugin ID.
2. Call `plugin_management.suggest_plugins` with `{"plugin_ids": ["<returned plugin ID>"]}` to show installation UI.
3. After the user connects, verify a tool call, preferring a read-only operation. Reuse a working connection on later edits.

If the plugin is already installed or installation UI cannot be shown, direct the user to **Plugins > Personal > Created by you** to open it and choose **Install** or **Connect** as needed. Do not use `codex mcp add` or `codex mcp login` for this platform-managed connection.

A successful deployment establishes hosting; an actual tool call establishes the remote connection works. Report an outstanding connection separately from a published Site.
