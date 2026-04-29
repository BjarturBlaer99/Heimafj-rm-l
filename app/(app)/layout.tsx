import { AppShell } from "@/components/app-shell";
import { getAuthed } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getAuthed();
  return <AppShell email={user.email}>{children}</AppShell>;
}
