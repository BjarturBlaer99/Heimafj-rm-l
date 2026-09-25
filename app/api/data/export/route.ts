import { createClient } from "@/lib/supabase/server";
import { readAllPages } from "@/lib/read-all";
import { transactionsCsv } from "@/lib/data-export";
import { normalizeSavingsPreferences } from "@/lib/savings-preferences";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
  if (error || !data.user) return Response.json({ error: "Skráðu þig inn til að sækja gögnin þín." }, { status: 401, headers });
  const user = data.user;
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv") return Response.json({ error: "Veldu CSV- eða JSON-snið." }, { status: 400, headers });
  try {
    const tables = format === "csv" ? ["transactions"] : ["profiles", "categories", "transactions", "budgets", "bills", "bill_payments", "savings_goals", "savings_contributions", "savings_buckets", "savings_bucket_entries"];
    const entries = await Promise.all(tables.map(async (table) => [table, await readAllPages<Record<string, unknown>>((from, to) => supabase.from(table).select("*").eq(table === "profiles" ? "id" : "user_id", user.id).order("id").range(from, to))] as const));
    const records = Object.fromEntries(entries);
    const body = format === "csv" ? transactionsCsv(records.transactions) : JSON.stringify({ exported_at: new Date().toISOString(), currency: "ISK", account: { id: user.id, email: user.email, created_at: user.created_at, privacy_notice_version: typeof user.user_metadata?.privacy_notice_version === "string" ? user.user_metadata.privacy_notice_version : null, deletion_request: user.user_metadata?.account_deletion_request ?? null, savings_preferences: normalizeSavingsPreferences(user.user_metadata?.savings_preferences) }, data: records }, null, 2);
    return new Response(body, { headers: { ...headers, "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="min-fjarmal-${new Date().toISOString().slice(0, 10)}.${format}"` } });
  } catch {
    return Response.json({ error: "Ekki tókst að sækja öll gögnin, svo niðurhalið var stöðvað. Reyndu aftur." }, { status: 503, headers });
  }
}
