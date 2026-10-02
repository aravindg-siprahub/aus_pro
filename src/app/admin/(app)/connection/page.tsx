import type { Metadata } from "next";
import { loadAdmin } from "@/lib/admin/load";
import { getConnectionStatus } from "@/lib/shopify/admin/connection";
import { formatDateTime } from "@/components/admin/format";
import { RecheckButton } from "@/components/admin/RecheckButton";
import { Badge, PageTitle, Panel, ProblemPanel, Stat } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Shopify connection" };
export const dynamic = "force-dynamic";

export default async function ConnectionPage() {
  const result = await loadAdmin("connection", getConnectionStatus);

  return (
    <>
      <PageTitle title="Shopify connection" description="Checks the token exchange, permissions and catalogue live, every time this page loads." actions={<RecheckButton />} />

      {!result.ok ? (
        <>
          <div className="mb-4 flex items-center gap-2"><Badge tone="red">Not connected</Badge></div>
          <ProblemPanel problem={result.problem} compact />
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Badge tone={result.data.ok ? "green" : "amber"}>{result.data.ok ? "Connected" : "Connected · permissions missing"}</Badge>
            <span className="text-[13px] text-mute">Checked {formatDateTime(result.data.checkedAt)}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Store" value={<span className="text-[20px]">{result.data.shop.name}</span>} note={result.data.shop.domain} />
            <Stat label="Currency" value={result.data.shop.currencyCode} note={`Admin API ${result.data.apiVersion}`} />
            <Stat label="Response time" value={`${result.data.latencyMs} ms`} note="Token + shop + products" />
            <Stat
              label="Catalogue"
              value={`${result.data.catalog.storefrontReady} / ${result.data.catalog.activeProducts}`}
              note="active products ready for the storefront"
            />
          </div>

          {result.data.catalog.storefrontReady < result.data.catalog.activeProducts && (
            <p className="mt-3 rounded-lg bg-[#fbf0d9] px-4 py-3 text-[13px] text-[#6d4600]">
              Some active products aren’t shown in the storefront. Storefront products need a <strong>Size</strong> option and a product type or <code>category:</code> tag (polo, hoodie, oversized, round neck). See docs/shopify-setup.md.
            </p>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Permissions">
              <ul className="divide-y divide-line-soft text-[14px]">
                {result.data.scopes.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div>
                      <code className="text-[13px]">{s.name}</code>
                      <p className="text-[12px] text-mute">{s.required ? "Required" : "Optional · enables customers"}</p>
                    </div>
                    <Badge tone={s.granted ? "green" : s.required ? "red" : "grey"}>{s.granted ? "Granted" : s.required ? "Missing" : "Not granted"}</Badge>
                  </li>
                ))}
              </ul>
              {result.data.scopes.some((s) => !s.granted) && (
                <p className="border-t border-line-soft px-5 py-3 text-[12px] text-mute">Add missing permissions to a new app version in the Dev Dashboard, release it, then approve the update on the store.</p>
              )}
            </Panel>

            <Panel title="Access token">
              <dl className="divide-y divide-line-soft text-[14px]">
                <div className="flex justify-between gap-4 px-5 py-2.5"><dt className="text-mute">Status</dt><dd><Badge tone="green">Valid</Badge></dd></div>
                <div className="flex justify-between gap-4 px-5 py-2.5"><dt className="text-mute">Renews</dt><dd className="text-right">{result.data.tokenExpiresAt ? formatDateTime(result.data.tokenExpiresAt) : "—"}</dd></div>
                <div className="flex justify-between gap-4 px-5 py-2.5"><dt className="text-mute">Grant type</dt><dd>Client credentials</dd></div>
              </dl>
              <p className="border-t border-line-soft px-5 py-3 text-[12px] text-mute">The token lives only in server memory and is refreshed automatically. It is never sent to the browser.</p>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
