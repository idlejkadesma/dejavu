import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { bootstrapTelemetryFlag } from "../fs-safe.ts";

describe("bootstrapTelemetryFlag", () => {
  beforeEach(() => {
    delete (globalThis as any).__dejavu_telemetry_override;
  });

  afterEach(() => {
    delete (globalThis as any).__dejavu_telemetry_override;
    vi.unstubAllEnvs();
  });

  it("sets globalThis override when DEJAVU_TELEMETRY is set", () => {
    vi.stubEnv("DEJAVU_TELEMETRY", "false");
    bootstrapTelemetryFlag();
    expect((globalThis as any).__dejavu_telemetry_override).toBe("false");
  });

  it("does not set globalThis override when DEJAVU_TELEMETRY is unset", () => {
    vi.stubEnv("DEJAVU_TELEMETRY", undefined as unknown as string);
    bootstrapTelemetryFlag();
    expect((globalThis as any).__dejavu_telemetry_override).toBeUndefined();
  });

  it("passes through truthy values", () => {
    vi.stubEnv("DEJAVU_TELEMETRY", "true");
    bootstrapTelemetryFlag();
    expect((globalThis as any).__dejavu_telemetry_override).toBe("true");
  });
});
