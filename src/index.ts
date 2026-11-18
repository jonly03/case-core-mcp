/**
 * Case Core MCP server — exposes the Case Core staff API as agent tools.
 *
 * Built with the official Model Context Protocol TypeScript SDK. Any MCP
 * client can connect over stdio and work the Case Core case queue through
 * an agent instead of the staff UI.
 *
 * Prereq: a running Case Core API (see https://github.com/jonly03/rnr-workflow).
 *
 * Run:  npm install && npm run build && npm start
 * Try:  npm run inspect   (opens the MCP Inspector in your browser)
 *
 * Config (environment):
 *   CASE_API_URL        base URL of the Case Core API (default http://localhost:3001/api/v1)
 *   CASE_STAFF_EMAIL    staff login email
 *   CASE_STAFF_PASSWORD staff login password (required — never hardcoded)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API = process.env.CASE_API_URL ?? "http://localhost:3001/api/v1";
const EMAIL = process.env.CASE_STAFF_EMAIL ?? "staff@lab.local";
const PASS = process.env.CASE_STAFF_PASSWORD;
if (!PASS) {
  throw new Error("CASE_STAFF_PASSWORD is not set — see .env.example");
}

let token: string | null = null;

async function getToken(): Promise<string> {
  if (token) return token;
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (!res.ok) throw new Error(`staff login failed: HTTP ${res.status}`);
  const body = (await res.json()) as { token: string };
  token = body.token;
  return token;
}

async function api(path: string, init?: RequestInit): Promise<unknown> {
  const t = await getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 401) {
    token = null; // token expired — re-login once and retry
    return api(path, init);
  }
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} -> HTTP ${res.status}`);
  return res.json();
}

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: "case-core", version: "0.1.0" });

server.tool(
  "list_cases",
  "List auto-glass cases in the staff queue",
  { limit: z.number().int().positive().optional().describe("max cases to return") },
  async ({ limit }) => textResult(await api(`/cases?limit=${limit ?? 20}`))
);

server.tool(
  "get_case",
  "Get full detail for one case, including status and pricing",
  { caseId: z.string().describe("case UUID") },
  async ({ caseId }) => textResult(await api(`/cases/${caseId}`))
);

server.tool(
  "decode_vin",
  "Decode a 17-character VIN to year / make / model",
  { vin: z.string().length(17).describe("17-character VIN") },
  async ({ vin }) =>
    textResult(await api(`/vin/decode`, { method: "POST", body: JSON.stringify({ vin }) }))
);

const transport = new StdioServerTransport();
await server.connect(transport);
