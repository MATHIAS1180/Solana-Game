import { ImageResponse } from "next/og";

import { findDefaultRoomPreset, ROOM_STATUS_LABELS } from "@/lib/faultline/constants";
import { getRoomSnapshot } from "@/lib/faultline/server-data";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

function formatStake(lamports: string | bigint | number | null | undefined) {
  if (lamports === null || lamports === undefined) {
    return "Faultline Arena";
  }

  const amount = typeof lamports === "string" ? Number(lamports) : typeof lamports === "bigint" ? Number(lamports) : lamports;
  return `${(amount / 1_000_000_000).toFixed(amount >= 1_000_000_000 ? 2 : 3)} SOL`;
}

export async function generateRoomSocialImage(roomAddress: string) {
  const snapshot = await getRoomSnapshot(roomAddress);
  const room = snapshot?.room ?? null;
  const preset = findDefaultRoomPreset(snapshot?.presetId ?? -1);
  const phase = room ? ROOM_STATUS_LABELS[room.status] : "Standby";
  const title = room ? `${formatStake(room.stakeLamports)} ${phase}` : preset ? `${preset.name} Arena` : "Faultline Arena";
  const subtitle = room
    ? `${room.playerCount}/${room.maxPlayers} players / ${room.committedCount} commits / ${room.revealedCount} reveals`
    : preset
      ? `${preset.minPlayers}-${preset.maxPlayers} players / waiting for the next live read`
      : "Live Solana commit-reveal room";
  const detail = room
    ? room.status === 0
      ? "Seats are still open. Enter before the public pressure hardens."
      : room.status === 1
        ? "Commits are locking now. The room is moving from posture to proof."
        : room.status === 2
          ? "Reveal pressure is live. Hidden reads are about to turn public."
          : "The round has settled. Share the outcome and queue the next read."
    : "A persistent Faultline Arena room on Solana, ready for the next one-transaction entry.";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #07090d 0%, #101722 42%, #181716 100%)",
          color: "#f4ede0",
          fontFamily: "sans-serif"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 15% 18%, rgba(255,109,55,0.36), transparent 24%), radial-gradient(circle at 83% 16%, rgba(125,249,255,0.22), transparent 22%), radial-gradient(circle at 74% 82%, rgba(255,209,102,0.18), transparent 24%)"
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 28,
            borderRadius: 40,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))"
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "56px",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 16, height: 16, borderRadius: 999, background: "#7df9ff", boxShadow: "0 0 30px rgba(125,249,255,0.8)" }} />
              <div style={{ fontSize: 26, letterSpacing: 8, textTransform: "uppercase", color: "#ffd166" }}>Faultline Arena</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                padding: "12px 18px",
                fontSize: 22,
                color: "rgba(244,237,224,0.84)"
              }}
            >
              {phase}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
            <div style={{ fontSize: 82, lineHeight: 0.94, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 28, lineHeight: 1.4, color: "rgba(244,237,224,0.82)" }}>{detail}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 22 }}>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", maxWidth: 820 }}>
              {[subtitle, `Room ${roomAddress.slice(0, 6)}...${roomAddress.slice(-4)}`].map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.24)",
                    padding: "14px 22px",
                    fontSize: 22,
                    color: "rgba(244,237,224,0.86)"
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "flex-end", gap: 8 }}>
              <div style={{ fontSize: 20, letterSpacing: 6, textTransform: "uppercase", color: "rgba(244,237,224,0.55)" }}>Live Solana PvP</div>
              <div style={{ fontSize: 24, color: "#7df9ff" }}>Commit private. Reveal public.</div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
