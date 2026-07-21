import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mín fjármál",
  description: "Persónulegt fjármálayfirlit á íslensku"
};

const themeScript = `
(() => {
  const storageKey = "finance-theme-metallic";
  const stored = window.localStorage.getItem(storageKey);
  const theme = stored === "dark" || stored === "light" ? stored : "light";
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
