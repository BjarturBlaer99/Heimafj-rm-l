import type { Metadata } from "next";
import { DemoApp } from "@/components/demo-app";

export const metadata: Metadata = {
  title: "Sýningarútgáfa | Mín fjármál",
  description: "Skoðaðu Mín fjármál með sýnigögnum án þess að stofna aðgang."
};

export default function DemoPage() {
  return <DemoApp />;
}
