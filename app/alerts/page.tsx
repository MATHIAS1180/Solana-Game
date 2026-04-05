import type { Metadata } from "next";

import { ProgramBanner } from "@/components/game/program-banner";
import { NotificationSettingsPanel } from "@/components/game/notification-settings-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alerts",
  description: "Configure Faultline Arena browser reminders for reveal windows, claimable rewards, and reserve rail changes.",
  alternates: process.env.NEXT_PUBLIC_SITE_URL
    ? {
        canonical: "/alerts"
      }
    : undefined
};

export default function AlertsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <ProgramBanner />
      <NotificationSettingsPanel />
    </main>
  );
}
