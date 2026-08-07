import { AuthForm } from "@/components/auth-form";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const initialError =
    params.error === "invalid_reset_link"
      ? "Endurstillingartengillinn er ógildur eða útrunninn. Biddu um nýjan tengil."
      : undefined;

  return <AuthForm mode="forgot" initialError={initialError} />;
}
