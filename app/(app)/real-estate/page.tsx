import type { Metadata } from "next";
import { RealEstateOverview } from "@/components/real-estate-overview";
import { PageHeader } from "@/components/ui";
import { getRealEstateSnapshot } from "@/lib/real-estate-data";

export const metadata: Metadata = {
  title: "Fasteignir | Mín fjármál",
  description: "Íbúðaverð, lánareiknivél og fasteignayfirlit á einum stað."
};

export default async function RealEstatePage() {
  const realEstateData = await getRealEstateSnapshot();

  return (
    <>
      <PageHeader title="Fasteignir" description="Kannaðu markaðinn, reiknaðu lánið og berðu saman eignir á einum stað." />
      <RealEstateOverview data={realEstateData} />
    </>
  );
}
