const productionProjectRef = "gtgqxgddlqcvspegvxzt";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  const usesProductionDatabase = url.includes(productionProjectRef);
  const isProduction = process.env.VERCEL_ENV === "production";
  const isNonProduction =
    process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";

  if (isProduction && !usesProductionDatabase) {
    throw new Error("Production is not configured with the production Supabase project.");
  }

  if (isNonProduction && usesProductionDatabase) {
    throw new Error("Non-production environments cannot use the production Supabase project.");
  }

  return { key, url };
}
