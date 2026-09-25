import { AuthForm } from "@/components/auth-form";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const initialError =
    params.error === "invalid_reset_link"
      ? "Þessi tengill virkar ekki lengur. Sláðu inn netfangið þitt hér fyrir neðan til að fá nýjan."
      : undefined;

  return <AuthForm mode="forgot" initialError={initialError} />;
}
