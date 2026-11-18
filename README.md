# case-core-mcp

An MCP server that exposes the **Case Core** staff API as agent tools, built with the official [Model Context Protocol TypeScript SDK](https://www.npmjs.com/package/@modelcontextprotocol/sdk).

Case Core is an AI-native operations platform for an auto-glass business (case management, VIN intelligence, quoting, scheduling, invoicing) — source: [jonly03/rnr-workflow](https://github.com/jonly03/rnr-workflow), live staging: [rnr-case-staging-zero-to100-edu.vercel.app](https://rnr-case-staging-zero-to100-edu.vercel.app).

This server lets any MCP client work the Case Core case queue through an agent, instead of clicking through the staff UI.

## Tools

| Tool | What it does |
|---|---|
| `list_cases` | List auto-glass cases in the staff queue (optional `limit`) |
| `get_case` | Full detail for one case, including status and pricing |
| `decode_vin` | Decode a 17-character VIN to year / make / model |

## How it works

- **Transport:** stdio — connect any MCP client (Claude, the MCP Inspector, etc.) to `node dist/index.js`.
- **Auth:** the server logs in to the Case Core API with staff credentials from the environment, holds the bearer token, and re-authenticates once on a 401 before retrying. Credentials are never hardcoded — see `.env.example`.
- **Validation:** tool inputs are schema-validated with zod (e.g., VINs must be exactly 17 characters).

## Run it

Prerequisite: a running Case Core API (locally or port-forwarded).

```bash
npm install
cp .env.example .env   # then fill in your staff credentials
npm run build
npm start
```

To explore the tools interactively:

```bash
npm run inspect        # opens the MCP Inspector in your browser
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `CASE_API_URL` | `http://localhost:3001/api/v1` | Base URL of the Case Core API |
| `CASE_STAFF_EMAIL` | `staff@lab.local` | Staff login email |
| `CASE_STAFF_PASSWORD` | — (required) | Staff login password |
