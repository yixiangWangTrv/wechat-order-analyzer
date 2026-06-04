import { exec } from "node:child_process";
import { promisify } from "node:util";
import { AnalysisResult } from "./types";

const execAsync = promisify(exec);

const PROMPT = `你是一个软件外包需求分析助手。根据以下微信群消息内容，只输出严格 JSON（不要任何其他文字、不要 code block、不要解释）。

字段：
- summary: string, 一句话需求摘要
- tech_stack: string[], 可选值: 前端/后端/小程序/App/数据库/其他
- infrastructure: string[], 可选值: 服务器/域名/OSS/数据库/第三方API/SSL证书/其他
- estimated_days: number|null, 预估人天，信息不足则为 null
- budget: number|null, 预算金额（元），未提及则为 null
- difficulty: "简单"|"中等"|"复杂"|"待确认"

信息不足时 difficulty 设为"待确认"，estimated_days 设为 null。

消息内容：`;

interface ServerInfo {
  port: number;
  password: string;
}

async function discoverServer(): Promise<ServerInfo> {
  // Find opencode serve process and extract port
  const { stdout: lsofOut } = await execAsync(
    "lsof -i -P | grep opencode | grep LISTEN | head -1"
  ).catch(() => ({ stdout: "" }));

  let port: number | null = null;

  if (lsofOut) {
    // Format: "opencode 12345 user 10u IPv4 ... TCP 127.0.0.1:57257 (LISTEN)"
    const portMatch = lsofOut.match(/:(\d+)\s+\(LISTEN\)/);
    if (portMatch) port = parseInt(portMatch[1]);
  }

  if (!port) {
    // Fallback: parse from ps
    const { stdout: psOut } = await execAsync(
      "ps aux | grep 'opencode serve' | grep -v grep | head -1"
    );
    const portMatch = psOut.match(/--port\s+(\d+)/);
    if (portMatch) port = parseInt(portMatch[1]);
  }

  if (!port) throw new Error("Cannot find opencode serve process");

  // Find password from the environment of the opencode process
  // The password is passed as OPENCODE_SERVER_PASSWORD env var
  // Try to read it from the process environment
  const { stdout: pidOut } = await execAsync(
    "pgrep -f 'opencode serve' | head -1"
  );
  const pid = pidOut.trim();

  let password = process.env.OPENCODE_SERVER_PASSWORD || "";

  if (!password && pid) {
    // On macOS, read process env vars
    const { stdout: envOut } = await execAsync(
      `ps eww -p ${pid} 2>/dev/null || true`
    );
    const pwMatch = envOut.match(/OPENCODE_SERVER_PASSWORD=([^\s]+)/);
    if (pwMatch) password = pwMatch[1];
  }

  if (!password) {
    // Try reading from state file that opencode may write
    const { stdout: stateOut } = await execAsync(
      `find /tmp -maxdepth 2 -name "*.opencode*" -o -name "opencode-server*" 2>/dev/null | head -5`
    ).catch(() => ({ stdout: "" }));

    // Last resort: try no-auth (some versions may allow localhost without auth)
    // We'll try with empty password and see if it works
  }

  return { port, password };
}

let cachedServer: ServerInfo | null = null;

async function getServer(): Promise<ServerInfo> {
  if (cachedServer) {
    // Verify it's still alive
    try {
      const res = await fetch(`http://127.0.0.1:${cachedServer.port}/session`, {
        method: "GET",
        headers: { Authorization: authHeader(cachedServer.password) },
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return cachedServer;
    } catch {}
    cachedServer = null;
  }

  cachedServer = await discoverServer();
  return cachedServer;
}

function authHeader(password: string): string {
  return "Basic " + Buffer.from(`opencode:${password}`).toString("base64");
}

async function createSession(server: ServerInfo): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${server.port}/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(server.password),
    },
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  const data = (await res.json()) as any;
  return data.id;
}

async function sendMessage(server: ServerInfo, sessionId: string, text: string): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${server.port}/session/${sessionId}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(server.password),
    },
    body: JSON.stringify({
      parts: [{ type: "text", text }],
    }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  const data = (await res.json()) as any;

  // Extract text from response
  if (data.info && data.parts) {
    const textParts = data.parts.filter((p: any) => p.type === "text");
    return textParts.map((p: any) => p.text).join("\n");
  }
  return JSON.stringify(data);
}

export async function analyzeWithOpencode(content: string): Promise<AnalysisResult> {
  const fullPrompt = PROMPT + content;

  const server = await getServer();
  const sessionId = await createSession(server);
  const reply = await sendMessage(server, sessionId, fullPrompt);

  // Parse the output - strip any markdown code blocks if present
  let cleaned = reply.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Try to find JSON in the output
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in opencode output: ${cleaned.slice(0, 200)}`);
  }

  return JSON.parse(jsonMatch[0]) as AnalysisResult;
}
