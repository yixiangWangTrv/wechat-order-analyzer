import { describe, it, expect } from "vitest";
import { shouldProcess } from "../src/filter";

describe("shouldProcess", () => {
  it("rejects system messages", () => {
    expect(shouldProcess("你撤回了一条消息")).toBe(false);
  });

  it("rejects image-only messages", () => {
    expect(shouldProcess("[图片]")).toBe(false);
  });

  it("rejects pure emoji", () => {
    expect(shouldProcess("[动画表情]")).toBe(false);
  });

  it("accepts normal requirement text", () => {
    expect(shouldProcess("需要做一个小程序，电商类，预算8000")).toBe(true);
  });

  it("accepts text with image placeholder", () => {
    expect(shouldProcess("需要做个官网 [图片]")).toBe(true);
  });

  it("rejects grouped notification", () => {
    expect(shouldProcess("[有3条新消息]")).toBe(false);
  });
});
