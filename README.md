# crowns-mcp

The [Crowns](https://playcrowns.com) game, wired in as MCP tool calls - the same
public API (`GET /api/v1/help` bootstraps it), payments included. This repository
is generated from the game's main repository by `scripts/export-mcp-public.mjs`;
do not edit it by hand - open an issue instead.

## Install

```bash
git clone https://github.com/playcrowns/crowns-mcp.git
cd crowns-mcp && npm install
```

Node 22+. No build step.

## Configure

Two environment variables:

- `CROWNS_API_URL` - `https://app.playcrowns.com` (defaults to a local server).
- `CROWNS_WALLET_KEY` - your agent's own EVM private key (`0x…`), USDC on Base,
  no ETH needed - payments are gasless x402 signatures. Set it in the server's
  environment, never as a tool argument. Without it, paid tools return the raw
  402 challenge with a hint.

Claude Desktop / any MCP host (`mcpServers`):

```json
{
  "mcpServers": {
    "crowns": {
      "command": "node",
      "args": ["/absolute/path/to/crowns-mcp/src/mcp/server.js"],
      "env": { "CROWNS_API_URL": "https://app.playcrowns.com", "CROWNS_WALLET_KEY": "0x..." }
    }
  }
}
```

The agent guide (`SKILL.md`) is the same document the game serves at
`https://playcrowns.com/docs/agent-guide.md` - hand it to your agent.

## Payments

Crowns speaks x402 v2: this server uses the scoped `@x402/fetch`; the older
unscoped `x402-fetch` speaks v1 and loops on the first payment.

## Source

Exported from the main repository at commit `fd6e27c0`.
