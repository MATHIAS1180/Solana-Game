export const FAULTLINE_COMMIT_DOMAIN = "FAULTLINE_COMMIT_V1";
export const MAX_PLAYERS = 128;
export const MAX_WINNERS = 4;
export const ZONE_COUNT = 5;
export const RESERVE_FEE_BPS = 200;

export const ROOM_STATUS = {
  Open: 0,
  Commit: 1,
  Reveal: 2,
  Resolved: 3,
  Cancelled: 4,
  Emergency: 5,
  Closed: 6
} as const;

export const PLAYER_STATUS = {
  Empty: 0,
  Joined: 1,
  Committed: 2,
  Revealed: 3,
  CommitTimedOut: 4,
  RevealTimedOut: 5
} as const;

export const RISK_BAND = {
  Calm: 0,
  Edge: 1,
  Knife: 2
} as const;

export const RISK_LABELS = ["Calm", "Edge", "Knife"] as const;
export const ROOM_STATUS_LABELS = ["Open", "Commit", "Reveal", "Resolved", "Cancelled", "Emergency", "Closed"] as const;
export const PLAYER_STATUS_LABELS = ["Empty", "Joined", "Committed", "Revealed", "CommitTimedOut", "RevealTimedOut"] as const;
export const ZONE_LABELS = ["A", "B", "C", "D", "E"] as const;

export const RISK_MULTIPLIERS_BPS = [10000, 15500, 24000] as const;
export const RISK_FAIL_MULTIPLIERS_BPS = [10000, 2500, 0] as const;

export const ROOM_STATE_SIZE = 11423;
export const PROFILE_STATE_SIZE = 136;
export const RESERVE_STATE_SIZE = 76;

export const DEFAULT_ROOM_PRESETS = [
  {
    id: 0,
    name: "0.01 SOL",
    description: "Room systeme d'entree.",
    minPlayers: 2,
    maxPlayers: 12,
    stakeLamports: 10_000_000,
    joinWindowSlots: 220,
    commitWindowSlots: 160,
    revealWindowSlots: 160
  },
  {
    id: 1,
    name: "0.02 SOL",
    description: "Room systeme basse friction.",
    minPlayers: 2,
    maxPlayers: 12,
    stakeLamports: 20_000_000,
    joinWindowSlots: 220,
    commitWindowSlots: 160,
    revealWindowSlots: 160
  },
  {
    id: 2,
    name: "0.04 SOL",
    description: "Room systeme intermediaire.",
    minPlayers: 2,
    maxPlayers: 12,
    stakeLamports: 40_000_000,
    joinWindowSlots: 220,
    commitWindowSlots: 160,
    revealWindowSlots: 160
  },
  {
    id: 3,
    name: "0.08 SOL",
    description: "Room systeme medium.",
    minPlayers: 2,
    maxPlayers: 12,
    stakeLamports: 80_000_000,
    joinWindowSlots: 220,
    commitWindowSlots: 160,
    revealWindowSlots: 160
  },
  {
    id: 4,
    name: "0.16 SOL",
    description: "Room systeme a enjeu releve.",
    minPlayers: 2,
    maxPlayers: 12,
    stakeLamports: 160_000_000,
    joinWindowSlots: 220,
    commitWindowSlots: 160,
    revealWindowSlots: 160
  },
  {
    id: 5,
    name: "0.32 SOL",
    description: "Room systeme haute mise.",
    minPlayers: 2,
    maxPlayers: 12,
    stakeLamports: 320_000_000,
    joinWindowSlots: 220,
    commitWindowSlots: 160,
    revealWindowSlots: 160
  },
  {
    id: 6,
    name: "0.64 SOL",
    description: "Room systeme premium.",
    minPlayers: 2,
    maxPlayers: 12,
    stakeLamports: 640_000_000,
    joinWindowSlots: 220,
    commitWindowSlots: 160,
    revealWindowSlots: 160
  },
  {
    id: 7,
    name: "1 SOL",
    description: "Room systeme plafond actuel.",
    minPlayers: 2,
    maxPlayers: 12,
    stakeLamports: 1_000_000_000,
    joinWindowSlots: 260,
    commitWindowSlots: 180,
    revealWindowSlots: 180
  }
] as const;

export const AUTOMATION_HEARTBEAT_INTERVAL_MS = 15_000;

export function findDefaultRoomPreset(presetId: number) {
  return DEFAULT_ROOM_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

export function matchesDefaultRoomPreset(room: {
  presetId: number;
  stakeLamports: bigint | number;
  minPlayers: number;
  maxPlayers: number;
}) {
  const roomStake = BigInt(room.stakeLamports);

  return DEFAULT_ROOM_PRESETS.some(
    (preset) =>
      preset.id === room.presetId &&
      BigInt(preset.stakeLamports) === roomStake &&
      preset.minPlayers === room.minPlayers &&
      preset.maxPlayers === room.maxPlayers
  );
}