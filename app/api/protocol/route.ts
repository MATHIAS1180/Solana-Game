import { NextResponse } from "next/server";

import { isMetagameStorageConfigured } from "@/lib/faultline/metagame-store";
import { getProtocolManifest } from "@/lib/faultline/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      protocol: {
        ...getProtocolManifest(),
        metagameStorageConfigured: isMetagameStorageConfigured()
      }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}