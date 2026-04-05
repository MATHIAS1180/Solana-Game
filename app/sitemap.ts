import type { MetadataRoute } from "next";

import { getVisibleRoomsSnapshot } from "@/lib/faultline/server-data";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteUrl}/rooms`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9
    }
  ];

  try {
    const snapshot = await getVisibleRoomsSnapshot();
    routes.push(
      ...snapshot.rooms.map((room) => ({
        url: `${siteUrl}/rooms/${room.publicKey}`,
        lastModified: new Date(),
        changeFrequency: "hourly" as const,
        priority: 0.7
      }))
    );
  } catch {
    // Keep the static sitemap entries if live room discovery fails.
  }

  return routes;
}