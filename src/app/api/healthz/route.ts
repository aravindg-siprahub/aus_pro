/** Liveness for the host's health check: answers as long as the server is running. Touches nothing external. */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
