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
    name: "Duel",
    description: "Lecture frontale a 2 joueurs.",
    minPlayers: 2,
    maxPlayers: 2,
    stakeLamports: 25_000_000,
    joinWindowSlots: 150,
    commitWindowSlots: 120,
    revealWindowSlots: 120
  },
  {
    id: 1,
    name: "Pulse",
    description: "Format grand public, meta lisible.",
    minPlayers: 5,
    maxPlayers: 12,
    stakeLamports: 50_000_000,
    joinWindowSlots: 220,
    commitWindowSlots: 160,
    revealWindowSlots: 160
  },
  {
    id: 2,
    name: "Swarm",
    description: "Room dense pour streamer et spectateurs.",
    minPlayers: 12,
    maxPlayers: 32,
    stakeLamports: 75_000_000,
    joinWindowSlots: 300,
    commitWindowSlots: 180,
    revealWindowSlots: 180
  },
  {
    id: 3,
    name: "Faultline Max",
    description: "Haute densite, haut jackpot, haute lecture de foule.",
    minPlayers: 25,
    maxPlayers: 128,
    stakeLamports: 100_000_000,
    joinWindowSlots: 500,
    commitWindowSlots: 220,
    revealWindowSlots: 220
  }
] as const;