import { describe, it, expect } from "vitest";
import { validateRequest } from "../src/index";

describe("validateRequest", () => {
  it("rejects missing token", () => {
    expect(validateRequest(null, "secret")).toBe(false);
  });

  it("rejects wrong token", () => {
    expect(validateRequest("wrong", "secret")).toBe(false);
  });

  it("accepts correct token", () => {
    expect(validateRequest("secret", "secret")).toBe(true);
  });
});
