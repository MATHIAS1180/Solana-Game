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
const metadataBase = new URL(siteUrl || "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  applicationName: "Faultline Arena",
  title: {
    default: "Faultline Arena - Solana PvP Strategy Game",
    template: "%s - Faultline Arena"
  },
  alternates: {
    canonical: "/"
  },
  description:
    "Read the crowd. Lock your prediction. Win on skill. The on-chain PvP strategy game where human decisions determine every result. No RNG. No oracle.",
  keywords: [
    "Solana PvP game",
    "on-chain prediction game",
    "crypto strategy game",
    "commit reveal game",
    "Solana gaming",
    "blockchain strategy game",
    "Faultline Arena"
  ],
  authors: [{ name: "Faultline Arena" }],
  creator: "Faultline Arena",
  openGraph: {
    title: "Faultline Arena - Solana PvP Strategy Game",
    description: "Read the crowd. Lock your prediction. Win on skill.",
    type: "website",
    locale: "en_US",
    siteName: "Faultline Arena",
    url: siteUrl || "http://localhost:3000"
  },
  twitter: {
    card: "summary_large_image",
    title: "Faultline Arena - Solana PvP Strategy Game",
    description: "Read the crowd. Lock your prediction. Win on skill.",
    site: "@FaultlineArena"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  category: "games",
  manifest: "/site.webmanifest"
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