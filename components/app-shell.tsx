import { AppFooter } from "@/components/app-footer";
import { DesktopSidebar, MobileBottomNav, TopNav } from "@/components/app-nav";
import { RefreshOnReturn } from "@/components/refresh-on-return";
import { ActionFeedbackProvider } from "@/components/action-feedback";

export function AppShell({ children, email }: { children: React.ReactNode; email?: string }) {
  return (
    <ActionFeedbackProvider>
      <div className="min-h-screen bg-paper text-ink">
        <RefreshOnReturn />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-accent focus:ring-2 focus:ring-accent">Fara í efni</a>
        <DesktopSidebar email={email} />
        <div className="flex min-h-screen min-w-0 flex-col lg:pl-[232px]">
          <header className="fade-in workspace-topbar sticky top-0 z-30 flex h-16 min-w-0 items-center px-4 sm:px-6 lg:px-8">
            <TopNav email={email} />
          </header>
          <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-6 outline-none lg:pb-8">
            <div className="app-workspace workspace-content mx-auto w-full min-w-0 max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
          </main>
          <AppFooter reserveMobileNavSpace showProductLinks={false} />
        </div>
        <MobileBottomNav />
      </div>
    </ActionFeedbackProvider>
  );
}
