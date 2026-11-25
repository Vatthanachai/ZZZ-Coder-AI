import * as NodeAssert from "node:assert/strict";
import * as NodeTest from "node:test";

import { startZZZServer } from "./server.ts";

NodeTest.describe("zzz-server", () => {
  NodeTest.it(
    "registers environments, enforces bearer auth, lists MCP endpoints, and redeems single-use pairing codes",
    async () => {
      const token = "test-zzz-server-secret";
      const running = await startZZZServer({
        host: "127.0.0.1",
        port: 0,
        token,
        dbPath: ":memory:",
      });
      try {
        const healthRes = await fetch(`${running.url}/health`);
        NodeAssert.equal(healthRes.status, 200);
        NodeAssert.deepEqual(await healthRes.json(), {
          ok: true,
          service: "zzz-server",
          environments: 0,
          online: 0,
        });

        const unauthRes = await fetch(`${running.url}/v1/environments`);
        NodeAssert.equal(unauthRes.status, 401);

        const authHeaders = {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        };

        const registerRes = await fetch(`${running.url}/v1/environments/register`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            id: "env-macbook",
            label: "Drake's MacBook Air",
            endpoints: ["http://10.0.0.2:13773", "http://192.168.1.50:13773"],
            mcpUrl: "http://10.0.0.2:13773/mcp",
            e2eeFingerprint: "D409-667F-3A3C-B4D7",
            platform: "darwin",
            version: "0.1.11",
          }),
        });
        NodeAssert.equal(registerRes.status, 200);
        const registered = (await registerRes.json()) as {
          environment: { id: string; online: boolean; mcpUrl: string };
        };
        NodeAssert.equal(registered.environment.id, "env-macbook");
        NodeAssert.equal(registered.environment.online, true);
        NodeAssert.equal(registered.environment.mcpUrl, "http://10.0.0.2:13773/mcp");

        const mcpRes = await fetch(`${running.url}/v1/mcp/endpoints`, { headers: authHeaders });
        NodeAssert.equal(mcpRes.status, 200);
        const mcpJson = (await mcpRes.json()) as {
          endpoints: Array<{ environmentId: string; mcpUrl: string }>;
        };
        NodeAssert.equal(mcpJson.endpoints.length, 1);
        NodeAssert.equal(mcpJson.endpoints[0]!.mcpUrl, "http://10.0.0.2:13773/mcp");

        const pairRes = await fetch(`${running.url}/v1/environments/env-macbook/pairing`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ scopes: ["mcp", "rpc"] }),
        });
        NodeAssert.equal(pairRes.status, 200);
        const pairing = (await pairRes.json()) as { code: string };
        NodeAssert.match(pairing.code, /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);

        const redeemRes = await fetch(`${running.url}/v1/pairing/redeem`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: pairing.code }),
        });
        NodeAssert.equal(redeemRes.status, 200);
        const redeemed = (await redeemRes.json()) as {
          environment: { id: string; e2eeFingerprint: string };
          scopes: string[];
        };
        NodeAssert.equal(redeemed.environment.id, "env-macbook");
        NodeAssert.equal(redeemed.environment.e2eeFingerprint, "D409-667F-3A3C-B4D7");
        NodeAssert.deepEqual(redeemed.scopes, ["mcp", "rpc"]);

        // Single-use pairing code cannot be redeemed twice
        const replayRes = await fetch(`${running.url}/v1/pairing/redeem`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: pairing.code }),
        });
        NodeAssert.equal(replayRes.status, 404);

        const deleteRes = await fetch(`${running.url}/v1/environments/env-macbook`, {
          method: "DELETE",
          headers: authHeaders,
        });
        NodeAssert.equal(deleteRes.status, 200);
      } finally {
        await running.close();
      }
    },
  );
});
