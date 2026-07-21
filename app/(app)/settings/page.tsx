import { MoonStarsIcon as MoonStar } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { SignOutIcon as LogOut } from "@phosphor-icons/react/dist/ssr/SignOut";
import { TrashIcon as Trash2 } from "@phosphor-icons/react/dist/ssr/Trash";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Card, EmptyState, Field, inputClass, PageHeader } from "@/components/ui";
import { deleteCategory, saveCategory, saveProfile, signOut } from "@/lib/actions";
import { getCategories, getProfile } from "@/lib/data";

export default async function SettingsPage() {
  const [profile, categories] = await Promise.all([getProfile(), getCategories()]);

  return (
    <>
      <PageHeader title="Stillingar" />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid gap-5">
          <Card>
            <h2 className="mb-4 font-bold">Prófíll</h2>
            <form action={saveProfile} className="grid gap-4">
              <Field label="Fullt nafn">
                <input className={inputClass} name="full_name" defaultValue={profile?.full_name ?? ""} required />
              </Field>
              <Field label="Gjaldmiðill">
                <input className={inputClass} name="currency" maxLength={3} defaultValue={profile?.currency ?? "ISK"} required />
              </Field>
              <Button type="submit">Vista prófíl</Button>
            </form>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <MoonStar size={18} className="text-accent" />
              <h2 className="font-bold">Þema</h2>
            </div>
            <p className="mb-4 text-sm text-ink/60">Skiptu á milli ljósrar og dökkrar útgáfu eftir því sem hentar þér best.</p>
            <ThemeToggle />
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <LogOut size={18} className="text-coral" />
              <h2 className="font-bold">Aðgangur</h2>
            </div>
            <p className="mb-4 text-sm text-ink/60">Skráðu þig út úr appinu á þessu tæki.</p>
            <form action={signOut}>
              <Button variant="secondary">
                <LogOut size={17} />
                Skrá út
              </Button>
            </form>
          </Card>
        </div>

        <Card>
          <h2 className="mb-4 font-bold">Flokkar</h2>
          <form action={saveCategory} className="mb-5 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
            <input className={inputClass} name="name" placeholder="Heiti flokks" required />
            <select className={inputClass} name="type">
              <option value="expense">Útgjöld</option>
              <option value="income">Tekjur</option>
              <option value="both">Bæði</option>
            </select>
            <Button type="submit">
              <Plus size={17} />
              Bæta við
            </Button>
          </form>

          <div className="grid gap-2">
            {categories.length ? (
              categories.map((category) => (
                <details key={category.id} className="rounded-md border border-line/10 px-3 py-2">
                  <summary className="cursor-pointer font-semibold">
                    {category.name}{" "}
                    <span className="text-xs uppercase text-ink/45">
                      {category.type === "income" ? "tekjur" : category.type === "expense" ? "útgjöld" : "bæði"}
                      {category.is_default ? " · sjálfgefið" : ""}
                    </span>
                  </summary>
                  <form action={saveCategory} className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                    <input type="hidden" name="id" value={category.id} />
                    <input className={inputClass} name="name" defaultValue={category.name} disabled={category.is_default} required />
                    <select className={inputClass} name="type" defaultValue={category.type} disabled={category.is_default}>
                      <option value="expense">Útgjöld</option>
                      <option value="income">Tekjur</option>
                      <option value="both">Bæði</option>
                    </select>
                    <Button type="submit" variant="secondary" disabled={category.is_default}>
                      Vista
                    </Button>
                  </form>
                  {!category.is_default ? (
                    <form action={deleteCategory} className="mt-2">
                      <input type="hidden" name="id" value={category.id} />
                      <Button variant="danger" className="h-9">
                        <Trash2 size={16} />
                        Eyða
                      </Button>
                    </form>
                  ) : null}
                </details>
              ))
            ) : (
              <EmptyState>Engir flokkar fundust.</EmptyState>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
