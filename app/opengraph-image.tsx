import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background: "linear-gradient(135deg, #0b0d12 0%, #10141b 45%, #171b22 100%)",
          color: "#f5efe5",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 14% 20%, rgba(255,107,53,0.34), transparent 26%), radial-gradient(circle at 84% 18%, rgba(125,249,255,0.22), transparent 20%), radial-gradient(circle at 76% 80%, rgba(255,209,102,0.18), transparent 26%)"
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px",
            width: "100%",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 16, height: 16, borderRadius: 999, background: "#7df9ff", boxShadow: "0 0 28px rgba(125,249,255,0.8)" }} />
            <div style={{ fontSize: 28, letterSpacing: 8, textTransform: "uppercase", color: "#ffd166" }}>Faultline Arena</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 840 }}>
            <div style={{ fontSize: 84, lineHeight: 0.92, fontWeight: 700 }}>Predict the crowd. Lock the commit. Win the reveal.</div>
            <div style={{ fontSize: 28, lineHeight: 1.45, color: "rgba(245,239,229,0.82)" }}>
              A live Solana PvP strategy game with one-transaction entry, deterministic rankings, and wallet-native commit-reveal gameplay.
            </div>
          </div>

          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[
              "One-transaction entry",
              "Commit-reveal PvP",
              "Persistent stake lobbies"
            ].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  padding: "14px 22px",
                  fontSize: 22,
                  color: "rgba(245,239,229,0.86)"
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}