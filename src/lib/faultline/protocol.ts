import { FAULTLINE_COMMIT_VERSION, FAULTLINE_COMMIT_DOMAIN, FAULTLINE_COMMIT_DOMAIN_V1, FAULTLINE_COMMIT_DOMAIN_V2 } from "@/lib/faultline/constants";
import { getEmergencyFeatureFlag, getFaultlineProgramId, getSolanaNetwork } from "@/lib/solana/cluster";

export const FAULTLINE_PROTOCOL_VERSION = "0.2.0";
export const FAULTLINE_EVENT_SCHEMA_VERSION = 1;

export function getProtocolManifest() {
  const programId = getFaultlineProgramId();

  return {
    protocolVersion: FAULTLINE_PROTOCOL_VERSION,
    eventSchemaVersion: FAULTLINE_EVENT_SCHEMA_VERSION,
    network: getSolanaNetwork(),
    programId: programId?.toBase58() ?? null,
    commitVersion: FAULTLINE_COMMIT_VERSION,
    commitDomains: {
      current: FAULTLINE_COMMIT_DOMAIN,
      legacy: FAULTLINE_COMMIT_DOMAIN_V1,
      next: FAULTLINE_COMMIT_DOMAIN_V2
    },
    reserveRouting: "reserve-pda",
    emergencyActionsEnabled: getEmergencyFeatureFlag(),
    structuredEventsEnabled: true,
    watcherApi: "/api/watch",
    leaderboardApi: "/api/leaderboard"
  } as const;
}