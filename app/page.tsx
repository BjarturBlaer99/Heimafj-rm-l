import type { Metadata } from "next";
import { DemoApp } from "@/components/demo-app";

export const metadata: Metadata = {
  title: "Mín fjármál | Sýningarútgáfa",
  description: "Skoðaðu Mín fjármál með sýnigögnum án þess að stofna aðgang."
};

export default function HomePage() {
  return <DemoApp />;
}
