import type { Metadata } from "next";
import { Suspense } from "react";
import { DataSectionLoading } from "@/components/data-section-loading";
import { RealEstateOverview } from "@/components/real-estate-overview";
import { PageHeader } from "@/components/ui";
import { getRealEstateSnapshot } from "@/lib/real-estate-data";

export const metadata: Metadata = {
  title: "Fasteignir | Mín fjármál",
  description: "Íbúðaverð, lánareiknivél og fasteignayfirlit á einum stað."
};

async function RealEstateDataSection() {
  const realEstateData = await getRealEstateSnapshot();
  return <RealEstateOverview data={realEstateData} />;
}

export default function RealEstatePage() {
  return (
    <>
      <PageHeader title="Fasteignir" description="Kannaðu markaðinn, reiknaðu lánið og berðu saman eignir á einum stað." />
      <Suspense fallback={<DataSectionLoading label="Hleð fasteignagögnum…" chart />}>
        <RealEstateDataSection />
      </Suspense>
    </>
  );
}
