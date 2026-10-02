import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { getAccessToken } from "@/lib/shopify/token";
import { getShopifyConfig } from "@/lib/shopify/config";
import { shopifyGraphQL } from "@/lib/shopify/client";
import { ShopifyError } from "@/lib/shopify/errors";
import { FAKE, captureLogs, isGraphQL, isTokenCall, json, mockFetch, setTestEnv, tokenResponse } from "./_mock";

let restore: () => void = () => {};
let logs: ReturnType<typeof captureLogs>;

beforeEach(() => {
  setTestEnv();
  logs = captureLogs();
});
afterEach(() => {
  restore();
  logs.restore();
});

const QUERY = "query { shop { name } }";

test("token: exchanges client credentials once and caches the result", async () => {
  const m = mockFetch(() => tokenResponse());
  restore = m.restore;
  const cfg = getShopifyConfig();
  const [a, b] = await Promise.all([getAccessToken(cfg), getAccessToken(cfg)]); // concurrent callers share one request
  const c = await getAccessToken(cfg);
  assert.equal(a, FAKE.token);
  assert.equal(b, FAKE.token);
  assert.equal(c, FAKE.token);
  assert.equal(m.calls.length, 1);
  const call = m.calls[0];
  assert.equal(call.url, `https://${FAKE.domain}/admin/oauth/access_token`);
  assert.equal(call.method, "POST");
  assert.equal(call.headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(call.body);
  assert.equal(body.get("grant_type"), "client_credentials");
  assert.equal(body.get("client_id"), FAKE.clientId);
  assert.equal(body.get("client_secret"), FAKE.clientSecret);
});

test("token: renews when close to expiry", async () => {
  const m = mockFetch(() => tokenResponse(60)); // 60s left is inside the 5 minute refresh margin
  restore = m.restore;
  const cfg = getShopifyConfig();
  await getAccessToken(cfg);
  await getAccessToken(cfg);
  assert.equal(m.calls.length, 2);
});

test("token: rejected credentials fail once, safely, without echoing secrets", async () => {
  const m = mockFetch(() => json({ error: "invalid_client", error_description: `bad ${FAKE.clientSecret}` }, 400));
  restore = m.restore;
  await assert.rejects(getAccessToken(getShopifyConfig()), (e: unknown) => {
    assert.ok(e instanceof ShopifyError);
    assert.equal(e.kind, "auth");
    assert.ok(!e.userMessage.includes(FAKE.clientSecret));
    assert.ok(!e.message.includes(FAKE.clientSecret));
    return true;
  });
  assert.equal(m.calls.length, 1, "a 4xx is not retried");
});

test("token: transient 503 is retried", async () => {
  const m = mockFetch((_c, n) => (n === 1 ? json({}, 503) : tokenResponse()));
  restore = m.restore;
  assert.equal(await getAccessToken(getShopifyConfig()), FAKE.token);
  assert.equal(m.calls.length, 2);
});

test("graphql: sends version path, token header and variables; returns data", async () => {
  const m = mockFetch((c) => (isTokenCall(c) ? tokenResponse() : json({ data: { shop: { name: "Test" } } })));
  restore = m.restore;
  const data = await shopifyGraphQL<{ shop: { name: string } }>(QUERY, { a: 1 }, { operation: "t", idempotent: true });
  assert.equal(data.shop.name, "Test");
  const call = m.calls.find(isGraphQL)!;
  assert.match(call.url, new RegExp(`^https://${FAKE.domain}/admin/api/\\d{4}-\\d{2}/graphql\\.json$`));
  assert.equal(call.headers["x-shopify-access-token"], FAKE.token);
  assert.deepEqual(JSON.parse(call.body).variables, { a: 1 });
});

test("graphql: THROTTLED is retried, even for mutations (the request never ran)", async () => {
  let gqlCalls = 0;
  const m = mockFetch((c) => {
    if (isTokenCall(c)) return tokenResponse();
    gqlCalls++;
    return gqlCalls === 1
      ? json({ errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }] })
      : json({ data: { ok: true } });
  });
  restore = m.restore;
  const data = await shopifyGraphQL<{ ok: boolean }>("mutation { x }", {}, { operation: "t", idempotent: false });
  assert.equal(data.ok, true);
  assert.equal(gqlCalls, 2);
});

test("graphql: HTTP 429 honours retry and succeeds", async () => {
  let n = 0;
  const m = mockFetch((c) => {
    if (isTokenCall(c)) return tokenResponse();
    return ++n === 1 ? json({}, 429, { "Retry-After": "0.01" }) : json({ data: { ok: true } });
  });
  restore = m.restore;
  assert.deepEqual(await shopifyGraphQL(QUERY, {}, { operation: "t", idempotent: false }), { ok: true });
});

test("graphql: a 500 is retried for reads but never for mutations", async () => {
  let reads = 0;
  let m = mockFetch((c) => (isTokenCall(c) ? tokenResponse() : ++reads === 1 ? json({}, 500) : json({ data: { ok: 1 } })));
  restore = m.restore;
  await shopifyGraphQL(QUERY, {}, { operation: "read", idempotent: true });
  assert.equal(reads, 2);
  m.restore();

  setTestEnv();
  let writes = 0;
  m = mockFetch((c) => (isTokenCall(c) ? tokenResponse() : (writes++, json({}, 500))));
  restore = m.restore;
  await assert.rejects(shopifyGraphQL("mutation { x }", {}, { operation: "write", idempotent: false }), /HTTP 500/);
  assert.equal(writes, 1, "a mutation that may have run must not be repeated");
});

test("graphql: a 401 refreshes the token once and retries", async () => {
  let tokens = 0;
  let n = 0;
  const m = mockFetch((c) => {
    if (isTokenCall(c)) return (tokens++, tokenResponse());
    return ++n === 1 ? json({}, 401) : json({ data: { ok: true } });
  });
  restore = m.restore;
  await shopifyGraphQL(QUERY, {}, { operation: "t", idempotent: true });
  assert.equal(tokens, 2);
});

test("graphql: a missing scope (403) surfaces as a safe auth error", async () => {
  const m = mockFetch((c) => (isTokenCall(c) ? tokenResponse() : json({ errors: "forbidden" }, 403)));
  restore = m.restore;
  await assert.rejects(shopifyGraphQL(QUERY, {}, { operation: "t", idempotent: true }), (e: unknown) => e instanceof ShopifyError && e.kind === "auth");
});

test("graphql: GraphQL errors become a safe error and are logged without secrets", async () => {
  const m = mockFetch((c) =>
    isTokenCall(c)
      ? tokenResponse()
      : json({ errors: [{ message: `Internal failure. token=${FAKE.token}`, extensions: { code: "INTERNAL_SERVER_ERROR" } }] }),
  );
  restore = m.restore;
  await assert.rejects(shopifyGraphQL(QUERY, {}, { operation: "t", idempotent: true }), (e: unknown) => {
    assert.ok(e instanceof ShopifyError);
    assert.equal(e.kind, "graphql");
    assert.ok(!e.userMessage.includes(FAKE.token));
    return true;
  });
  const all = logs.lines.join("\n");
  assert.ok(all.includes("graphql.errors"), "the failure is logged");
  assert.ok(!all.includes(FAKE.token), "access token must be scrubbed from logs");
  assert.ok(!all.includes(FAKE.clientSecret), "client secret must never be logged");
});

test("graphql: ACCESS_DENIED names the missing permission for the admin, without leaking anything", async () => {
  const m = mockFetch((c) =>
    isTokenCall(c)
      ? tokenResponse()
      : json({ errors: [{ message: `Access denied for customers field. Required access: \`read_customers\` access scope. ${FAKE.token}`, extensions: { code: "ACCESS_DENIED" } }] }),
  );
  restore = m.restore;
  await assert.rejects(shopifyGraphQL(QUERY, {}, { operation: "t", idempotent: true }), (e: unknown) => {
    assert.ok(e instanceof ShopifyError);
    assert.equal(e.kind, "auth");
    assert.equal(e.reason, "missing_scope");
    assert.equal(e.scope, "read_customers");
    assert.ok(!e.userMessage.includes("read_customers"), "visitors never see permission names");
    assert.ok(!e.message.includes(FAKE.token));
    return true;
  });
  assert.ok(!logs.lines.join("\n").includes(FAKE.token));
});

test("graphql: timeouts are reported as timeouts; reads retry, mutations don't", async () => {
  const timeout = () => Object.assign(new Error("timed out"), { name: "TimeoutError" });
  let reads = 0;
  let m = mockFetch((c) => (isTokenCall(c) ? tokenResponse() : ++reads === 1 ? timeout() : json({ data: { ok: 1 } })));
  restore = m.restore;
  await shopifyGraphQL(QUERY, {}, { operation: "read", idempotent: true });
  assert.equal(reads, 2);
  m.restore();

  setTestEnv();
  let writes = 0;
  m = mockFetch((c) => (isTokenCall(c) ? tokenResponse() : (writes++, timeout())));
  restore = m.restore;
  await assert.rejects(
    shopifyGraphQL("mutation { x }", {}, { operation: "write", idempotent: false }),
    (e: unknown) => e instanceof ShopifyError && e.kind === "timeout",
  );
  assert.equal(writes, 1);
});

test("logs never contain the client secret or access token across a full request", async () => {
  const m = mockFetch((c) => (isTokenCall(c) ? tokenResponse() : json({ data: { ok: true } })));
  restore = m.restore;
  await shopifyGraphQL(QUERY, {}, { operation: "t", idempotent: true });
  const all = logs.lines.join("\n");
  assert.ok(all.length > 0);
  assert.ok(!all.includes(FAKE.clientSecret));
  assert.ok(!all.includes(FAKE.token));
});
