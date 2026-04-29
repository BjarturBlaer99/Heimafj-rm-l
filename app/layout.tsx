import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fjármál",
  description: "Örugg persónuleg fjármálaumsjón með Supabase"
};

const themeScript = `
(() => {
  const storageKey = "finance-theme";
  const stored = window.localStorage.getItem(storageKey);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = stored === "dark" || stored === "light" ? stored : (prefersDark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="is" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
