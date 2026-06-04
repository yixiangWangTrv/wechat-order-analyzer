import http from "node:http";
import { IncomingMessage as NodeIncomingMessage } from "node:http";
import { IncomingMessage } from "./types";
import { shouldProcess } from "./filter";
import { analyzeWithOpencode } from "./opencode-analyzer";
import { writeToFeishu } from "./feishu";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3721;
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || "";

function getBody(req: NodeIncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }

  const token = req.headers["x-webhook-token"];
  if (token !== WEBHOOK_TOKEN) {
    res.writeHead(401);
    res.end("Unauthorized");
    return;
  }

  try {
    const body = await getBody(req);
    const message: IncomingMessage = JSON.parse(body);

    if (!message.content || !message.group || !message.time) {
      res.writeHead(400);
      res.end("Missing fields");
      return;
    }

    if (!shouldProcess(message.content)) {
      res.writeHead(200);
      res.end(JSON.stringify({ skipped: true }));
      return;
    }

    console.log(`[${new Date().toISOString()}] Processing: ${message.content.slice(0, 50)}...`);

    const analysis = await analyzeWithOpencode(message.content);

    await writeToFeishu(message, analysis);

    console.log(`[${new Date().toISOString()}] Done: ${analysis.summary}`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, analysis }));
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Webhook server running on http://localhost:${PORT}`);
  console.log(`   Use cloudflared tunnel to expose publicly`);
});
