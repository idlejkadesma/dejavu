/**
 * Tests for PostHog identity stitching in the TS MemoryClient.
 *
 * Covers $identify firing, idempotency via pair markers, and the node/browser
 * gate. Mocks fs and fetch; never touches the real ~/.dejavu/config.json.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { MemoryClient } from "../dejavu";
import { telemetry } from "../telemetry";
import {
  getOrCreateDeja VuUserId,
  isDeja VuAliased,
  markDeja VuAliased,
  readDeja VuAnonIds,
} from "../config";
import { TEST_API_KEY } from "./helpers";
import { setupMockFetch, installConsoleSuppression } from "./setup";

installConsoleSuppression();

function setupMockFetchWithPostHog(): jest.Mock {
  return setupMockFetch(
    new Map([["us.i.posthog.com", { status: 200, body: "ok" }]]),
  );
}

// ─── config.ts (node-only fs read/write) ──────────────────────

describe("config.ts — readDeja VuAnonIds / markDeja VuAliased", () => {
  let tmpHome: string;
  const originalDeja VuDir = process.env.DEJAVU_DIR;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "dejavu-ts-test-"));
    process.env.DEJAVU_DIR = tmpHome;
  });

  afterEach(() => {
    if (fs.existsSync(tmpHome)) {
      fs.rmSync(tmpHome, { recursive: true, force: true });
    }
    if (originalDeja VuDir === undefined) {
      delete process.env.DEJAVU_DIR;
    } else {
      process.env.DEJAVU_DIR = originalDeja VuDir;
    }
  });

  test("returns null when config file does not exist", async () => {
    expect(await readDeja VuAnonIds()).toBeNull();
  });

  test("reads OSS user_id only", async () => {
    fs.writeFileSync(
      path.join(tmpHome, "config.json"),
      JSON.stringify({ user_id: "oss-uuid" }),
    );
    const ids = await readDeja VuAnonIds();
    expect(ids).toEqual({
      oss: "oss-uuid",
      cli: undefined,
      aliasedPairs: [],
    });
  });

  test("reads CLI anonymous_id and aliased_pairs", async () => {
    fs.writeFileSync(
      path.join(tmpHome, "config.json"),
      JSON.stringify({
        telemetry: { anonymous_id: "cli-anon", aliased_pairs: ["pair-marker"] },
      }),
    );
    const ids = await readDeja VuAnonIds();
    expect(ids).toEqual({
      oss: undefined,
      cli: "cli-anon",
      aliasedPairs: ["pair-marker"],
    });
  });

  test("getOrCreateDeja VuUserId creates and reuses shared SDK user_id", async () => {
    const first = await getOrCreateDeja VuUserId();
    const second = await getOrCreateDeja VuUserId();
    expect(first).toBeTruthy();
    expect(second).toBe(first);
    const written = JSON.parse(
      fs.readFileSync(path.join(tmpHome, "config.json"), "utf8"),
    );
    expect(written.user_id).toBe(first);
  });

  test("returns null on malformed JSON", async () => {
    fs.writeFileSync(path.join(tmpHome, "config.json"), "{not json");
    expect(await readDeja VuAnonIds()).toBeNull();
  });

  test("markDeja VuAliased preserves other fields", async () => {
    fs.writeFileSync(
      path.join(tmpHome, "config.json"),
      JSON.stringify({
        user_id: "oss-uuid",
        telemetry: { anonymous_id: "cli-anon" },
      }),
    );
    await markDeja VuAliased("oss-uuid", "user@example.com");
    const written = JSON.parse(
      fs.readFileSync(path.join(tmpHome, "config.json"), "utf8"),
    );
    expect(written.user_id).toBe("oss-uuid");
    expect(written.telemetry.anonymous_id).toBe("cli-anon");
    expect(written.telemetry.aliased_pairs).toHaveLength(1);
    expect(await isDeja VuAliased("oss-uuid", "user@example.com")).toBe(true);
  });

  test("markDeja VuAliased creates telemetry section when missing", async () => {
    fs.writeFileSync(
      path.join(tmpHome, "config.json"),
      JSON.stringify({ user_id: "oss-uuid" }),
    );
    await markDeja VuAliased("oss-uuid", "user@example.com");
    const written = JSON.parse(
      fs.readFileSync(path.join(tmpHome, "config.json"), "utf8"),
    );
    expect(written.telemetry.aliased_pairs).toHaveLength(1);
  });

  test("markDeja VuAliased tracks each pair independently", async () => {
    fs.writeFileSync(
      path.join(tmpHome, "config.json"),
      JSON.stringify({ user_id: "oss-uuid" }),
    );
    await markDeja VuAliased("oss-uuid", "user@example.com");
    expect(await isDeja VuAliased("oss-uuid", "user@example.com")).toBe(true);
    expect(await isDeja VuAliased("other-uuid", "user@example.com")).toBe(false);
    expect(await isDeja VuAliased("oss-uuid", "other@example.com")).toBe(false);
  });

  test("markDeja VuAliased does not throw when target dir is unwritable", async () => {
    // Point at a path that cannot be written to (a file-as-dir collision).
    fs.writeFileSync(path.join(tmpHome, "blocker"), "x");
    process.env.DEJAVU_DIR = path.join(tmpHome, "blocker"); // file used as dir
    await expect(
      markDeja VuAliased("oss-uuid", "user@example.com"),
    ).resolves.toBeUndefined();
  });
});

// ─── telemetry.captureIdentify ───────────────────────────────

describe("telemetry.captureIdentify", () => {
  test("fires $identify with $anon_distinct_id", async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "ok",
    })) as unknown as typeof fetch;
    global.fetch = fetchMock as any;

    await telemetry.captureIdentify("anon-uuid", "user@example.com");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = (fetchMock as jest.Mock).mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.event).toBe("$identify");
    expect(payload.distinct_id).toBe("user@example.com");
    expect(payload.properties.$anon_distinct_id).toBe("anon-uuid");
    expect(payload.properties.$process_person_profile).toBeUndefined();
  });

  test("skips when anon equals email", async () => {
    const fetchMock = jest.fn() as unknown as typeof fetch;
    global.fetch = fetchMock as any;
    await telemetry.captureIdentify("user@example.com", "user@example.com");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("skips when either input is empty", async () => {
    const fetchMock = jest.fn() as unknown as typeof fetch;
    global.fetch = fetchMock as any;
    await telemetry.captureIdentify("", "user@example.com");
    await telemetry.captureIdentify("anon", "");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─── MemoryClient init aliasing ──────────────────────────────

describe("MemoryClient — _maybeAliasAnonToEmail", () => {
  let tmpHome: string;
  const originalDeja VuDir = process.env.DEJAVU_DIR;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "dejavu-ts-init-"));
    process.env.DEJAVU_DIR = tmpHome;
  });

  afterEach(() => {
    if (fs.existsSync(tmpHome)) {
      fs.rmSync(tmpHome, { recursive: true, force: true });
    }
    if (originalDeja VuDir === undefined) {
      delete process.env.DEJAVU_DIR;
    } else {
      process.env.DEJAVU_DIR = originalDeja VuDir;
    }
  });

  // Construct a non-initialised client so we can call _maybeAliasAnonToEmail
  // in isolation (the real constructor's _initializeClient also fires it).
  function makeStubClient(telemetryId: string): MemoryClient {
    const client = Object.create(MemoryClient.prototype) as MemoryClient;
    (client as any).apiKey = TEST_API_KEY;
    (client as any).host = "https://api.dejavu.ai";
    (client as any).telemetryId = telemetryId;
    return client;
  }

  test("fires $identify on first init and persists pair marker", async () => {
    fs.writeFileSync(
      path.join(tmpHome, "config.json"),
      JSON.stringify({ user_id: "oss-uuid" }),
    );
    const fetchMock = setupMockFetchWithPostHog();

    const client = makeStubClient("test@example.com");
    await (client as any)._maybeAliasAnonToEmail();

    const identifyCalls = (fetchMock.mock.calls as any[]).filter(
      ([, init]: [string, RequestInit]) => {
        if (!init?.body) return false;
        return JSON.parse(init.body as string).event === "$identify";
      },
    );
    expect(identifyCalls.length).toBe(1);
    const body = JSON.parse(identifyCalls[0][1].body);
    expect(body.distinct_id).toBe("test@example.com");
    expect(body.properties.$anon_distinct_id).toBe("oss-uuid");

    const written = JSON.parse(
      fs.readFileSync(path.join(tmpHome, "config.json"), "utf8"),
    );
    expect(written.telemetry.aliased_pairs).toHaveLength(1);
  });

  test("platform-first init creates shared anon ID and identifies it", async () => {
    const fetchMock = setupMockFetchWithPostHog();

    const client = makeStubClient("test@example.com");
    await (client as any)._maybeAliasAnonToEmail();

    const written = JSON.parse(
      fs.readFileSync(path.join(tmpHome, "config.json"), "utf8"),
    );
    expect(written.user_id).toBeTruthy();
    expect(written.telemetry.aliased_pairs).toHaveLength(1);

    const identifyCalls = (fetchMock.mock.calls as any[]).filter(
      ([, init]: [string, RequestInit]) => {
        if (!init?.body) return false;
        return JSON.parse(init.body as string).event === "$identify";
      },
    );
    expect(identifyCalls.length).toBe(1);
    const body = JSON.parse(identifyCalls[0][1].body);
    expect(body.distinct_id).toBe("test@example.com");
    expect(body.properties.$anon_distinct_id).toBe(written.user_id);
  });

  test("second init does not refire $identify", async () => {
    fs.writeFileSync(
      path.join(tmpHome, "config.json"),
      JSON.stringify({
        user_id: "oss-uuid",
        telemetry: {},
      }),
    );
    await markDeja VuAliased("oss-uuid", "test@example.com");
    const fetchMock = setupMockFetchWithPostHog();

    const client = makeStubClient("test@example.com");
    await (client as any)._maybeAliasAnonToEmail();

    const identifyCalls = (fetchMock.mock.calls as any[]).filter(
      ([, init]: [string, RequestInit]) => {
        if (!init?.body) return false;
        return JSON.parse(init.body as string).event === "$identify";
      },
    );
    expect(identifyCalls.length).toBe(0);
  });

  test("fires $identify for both OSS and CLI anon ids", async () => {
    fs.writeFileSync(
      path.join(tmpHome, "config.json"),
      JSON.stringify({
        user_id: "oss-uuid",
        telemetry: { anonymous_id: "cli-anon" },
      }),
    );
    const fetchMock = setupMockFetchWithPostHog();

    const client = makeStubClient("test@example.com");
    await (client as any)._maybeAliasAnonToEmail();

    const identifyCalls = (fetchMock.mock.calls as any[]).filter(
      ([, init]: [string, RequestInit]) => {
        if (!init?.body) return false;
        return JSON.parse(init.body as string).event === "$identify";
      },
    );
    expect(identifyCalls.length).toBe(2);
    const anonIds = identifyCalls.map(
      (c: [string, RequestInit]) =>
        JSON.parse(c[1].body as string).properties.$anon_distinct_id,
    );
    expect(anonIds).toContain("oss-uuid");
    expect(anonIds).toContain("cli-anon");

    const written = JSON.parse(
      fs.readFileSync(path.join(tmpHome, "config.json"), "utf8"),
    );
    expect(written.telemetry.aliased_pairs).toHaveLength(2);
  });

  test("noop when telemetryId is not an email", async () => {
    fs.writeFileSync(
      path.join(tmpHome, "config.json"),
      JSON.stringify({ user_id: "oss-uuid" }),
    );
    const fetchMock = setupMockFetch();

    const client = makeStubClient("not-an-email");
    await (client as any)._maybeAliasAnonToEmail();

    const identifyCalls = (fetchMock.mock.calls as any[]).filter(
      ([, init]: [string, RequestInit]) => {
        if (!init?.body) return false;
        return JSON.parse(init.body as string).event === "$identify";
      },
    );
    expect(identifyCalls.length).toBe(0);
  });

  test("does not throw when config read fails", async () => {
    fs.writeFileSync(path.join(tmpHome, "config.json"), "{not json");
    setupMockFetch();

    const client = makeStubClient("test@example.com");
    await expect(
      (client as any)._maybeAliasAnonToEmail(),
    ).resolves.toBeUndefined();
  });

  test("noop when telemetry disabled — no fs read, no fs write, no events", async () => {
    fs.writeFileSync(
      path.join(tmpHome, "config.json"),
      JSON.stringify({ user_id: "oss-uuid" }),
    );
    const fetchMock = setupMockFetch();

    jest.resetModules();
    const original = process.env.DEJAVU_TELEMETRY;
    process.env.DEJAVU_TELEMETRY = "false";
    try {
      const { MemoryClient: ColdClient } = await import("../dejavu");
      const client = Object.create(ColdClient.prototype);
      client.apiKey = TEST_API_KEY;
      client.host = "https://api.dejavu.ai";
      client.telemetryId = "test@example.com";
      await client._maybeAliasAnonToEmail();
    } finally {
      if (original === undefined) delete process.env.DEJAVU_TELEMETRY;
      else process.env.DEJAVU_TELEMETRY = original;
      jest.resetModules();
    }

    const identifyCalls = (fetchMock.mock.calls as any[]).filter(
      ([, init]: [string, RequestInit]) => {
        if (!init?.body) return false;
        return JSON.parse(init.body as string).event === "$identify";
      },
    );
    expect(identifyCalls.length).toBe(0);

    const written = JSON.parse(
      fs.readFileSync(path.join(tmpHome, "config.json"), "utf8"),
    );
    expect(written.telemetry?.aliased_pairs).toBeUndefined();
  });
});

// ─── Browser env path (no process.versions.node) ─────────────

describe("config.ts in browser-like environment", () => {
  test("readDeja VuAnonIds returns null when not Node", async () => {
    const originalProcess = global.process;
    // @ts-expect-error force-undefining global to simulate a browser
    delete global.process;
    try {
      jest.resetModules();
      const { readDeja VuAnonIds: browserRead } = await import("../config");
      expect(await browserRead()).toBeNull();
    } finally {
      global.process = originalProcess;
      jest.resetModules();
    }
  });
});
