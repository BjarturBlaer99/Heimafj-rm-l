import { AuthForm } from "@/components/auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const initialError =
    params.error === "invalid_auth_link"
      ? "Tengillinn er ógildur eða útrunninn. Biddu um nýjan endurstillingartengil."
      : undefined;

  return <AuthForm mode="login" initialError={initialError} />;
}
