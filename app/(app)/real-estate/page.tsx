import type { Metadata } from "next";
import { Suspense } from "react";
import { DataSectionLoading } from "@/components/data-section-loading";
import { RealEstateOverview } from "@/components/real-estate-overview";
import { PageHeader } from "@/components/ui";
import { getRealEstateSnapshot } from "@/lib/real-estate-data";

export const metadata: Metadata = {
  title: "Fasteignir | Mín fjármál",
  description: "Skoðaðu þróun íbúðaverðs og áætlaðar greiðslur af húsnæðisláni."
};

async function RealEstateDataSection() {
  const realEstateData = await getRealEstateSnapshot();
  return <RealEstateOverview data={realEstateData} />;
}

export default function RealEstatePage() {
  return (
    <>
      <PageHeader title="Fasteignir" description="Fylgstu með íbúðaverði og reiknaðu áætlaðar greiðslur af húsnæðisláni." />
      <Suspense fallback={<DataSectionLoading label="Sæki fasteignagögn…" chart />}>
        <RealEstateDataSection />
      </Suspense>
    </>
  );
}
