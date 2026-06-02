import { describe, it, expect } from "vitest";
import { parseAnalysisResponse, buildPrompt } from "../src/analyzer";

describe("buildPrompt", () => {
  it("includes content in prompt", () => {
    const prompt = buildPrompt("做一个电商小程序");
    expect(prompt).toContain("做一个电商小程序");
    expect(prompt).toContain("summary");
  });
});

describe("parseAnalysisResponse", () => {
  it("parses valid JSON response", () => {
    const raw = JSON.stringify({
      summary: "电商小程序开发",
      tech_stack: ["小程序", "后端"],
      infrastructure: ["服务器", "数据库"],
      estimated_days: 15,
      budget: 8000,
      difficulty: "中等",
    });
    const result = parseAnalysisResponse(raw);
    expect(result.summary).toBe("电商小程序开发");
    expect(result.tech_stack).toContain("小程序");
    expect(result.estimated_days).toBe(15);
  });

  it("handles JSON wrapped in markdown code block", () => {
    const raw = '```json\n{"summary":"test","tech_stack":[],"infrastructure":[],"estimated_days":null,"budget":null,"difficulty":"待确认"}\n```';
    const result = parseAnalysisResponse(raw);
    expect(result.summary).toBe("test");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseAnalysisResponse("not json")).toThrow();
  });
});
