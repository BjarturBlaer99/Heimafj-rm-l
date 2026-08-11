import type { Metadata } from "next";
import { RealEstateOverview } from "@/components/real-estate-overview";
import { getRealEstateSnapshot } from "@/lib/real-estate-data";

export const metadata: Metadata = {
  title: "Fasteignir | Mín fjármál",
  description: "Íbúðaverð, lánareiknivél og fasteignayfirlit á einum stað."
};

export default async function RealEstatePage() {
  const realEstateData = await getRealEstateSnapshot();

  return (
    <>
      <header className="mb-6 border-b border-line/10 pb-5">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Fasteignir</h1>
        <p className="mt-1 text-sm text-ink/55">Kannaðu markaðinn, reiknaðu lánið og berðu saman eignir á einum stað.</p>
      </header>
      <RealEstateOverview data={realEstateData} />
    </>
  );
}
