import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Syne } from "next/font/google";

import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";

import { Providers } from "@/components/providers";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono"
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: "Faultline Arena | Solana PvP Strategy Game",
    template: "%s | Faultline Arena"
  },
  description:
    "Faultline Arena is a live Solana PvP strategy game where players predict crowd movement, lock a private commit, reveal the exact read later, and compete in deterministic on-chain rankings.",
  keywords: [
    "Solana strategy game",
    "Solana PvP game",
    "commit reveal game",
    "on-chain prediction game",
    "crypto strategy game",
    "crowd prediction game",
    "wallet game",
    "Faultline Arena"
  ],
  openGraph: {
    title: "Faultline Arena | Solana PvP Strategy Game",
    description:
      "Predict crowd movement, commit in one wallet flow, reveal your exact read later, and climb deterministic on-chain Solana rankings.",
    type: "website",
    locale: "en_US",
    siteName: "Faultline Arena"
  },
  twitter: {
    card: "summary_large_image",
    title: "Faultline Arena | Solana PvP Strategy Game",
    description:
      "A live Solana strategy game built around one-transaction entry, commit-reveal scoring, and deterministic PvP crowd forecasting."
  },
  category: "games"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${manrope.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-fault-basalt font-body text-fault-ash antialiased selection:bg-fault-flare/25 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}