"use client";

import { useEffect, useRef } from "react";

import { useWallet } from "@solana/wallet-adapter-react";

import { useToast } from "@/components/ui/toast-provider";
import { ALERT_PREFERENCES_KEY, ALERT_SEEN_KEY, parseAlertPreferences, parseSeenAlerts, markSeenAlert, type AlertPreferences } from "@/lib/faultline/alerts";
import { PLAYER_STATUS, ROOM_STATUS } from "@/lib/faultline/constants";
import type { SerializedFaultlineReserveAccount, SerializedFaultlineRoomAccount } from "@/lib/faultline/transport";
import { shortKey } from "@/lib/utils";

const ALERT_POLL_INTERVAL_MS = 20_000;

type AlertEvent = {
  id: string;
  title: string;
  description: string;
  url: string;
  tone: "success" | "info";
};

function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" as const;
  }

  return Notification.permission;
}

export function NotificationCenter() {
  const { publicKey } = useWallet();
  const toast = useToast();
  const preferencesRef = useRef<AlertPreferences>(parseAlertPreferences(null));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function loadPreferences() {
      preferencesRef.current = parseAlertPreferences(window.localStorage.getItem(ALERT_PREFERENCES_KEY));
    }

    function onStorage(event: StorageEvent) {
      if (event.key === ALERT_PREFERENCES_KEY) {
        loadPreferences();
      }
    }

    loadPreferences();
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let disposed = false;
    let pending = false;

    function hasSeen(id: string) {
      const seen = parseSeenAlerts(window.localStorage.getItem(ALERT_SEEN_KEY));
      return Boolean(seen[id]);
    }

    function remember(id: string) {
      const seen = parseSeenAlerts(window.localStorage.getItem(ALERT_SEEN_KEY));
      window.localStorage.setItem(ALERT_SEEN_KEY, JSON.stringify(markSeenAlert(seen, id)));
    }

    function emitAlert(event: AlertEvent) {
      const permission = getNotificationPermission();
      const pageVisible = document.visibilityState === "visible";

      if (!pageVisible && permission === "granted") {
        const notification = new Notification(event.title, {
          body: event.description,
          tag: event.id
        });
        notification.onclick = () => {
          window.focus();
          window.location.assign(event.url);
          notification.close();
        };
        return;
      }

      toast({
        tone: event.tone,
        title: event.title,
        description: event.description,
        durationMs: 7600
      });
    }

    async function pollAlerts() {
      if (disposed || pending) {
        return;
      }

      const preferences = preferencesRef.current;
      if (!preferences.enabled) {
        return;
      }

      pending = true;
      try {
        const events: AlertEvent[] = [];

        if (publicKey && (preferences.reveal || preferences.claim)) {
          const response = await fetch("/api/rooms", { cache: "no-store" });
          const payload = (await response.json()) as { ok?: boolean; rooms?: SerializedFaultlineRoomAccount[] };
          if (response.ok && payload.ok && payload.rooms) {
            for (const room of payload.rooms) {
              const playerIndex = room.playerKeys.findIndex((key) => key === publicKey.toBase58());
              if (playerIndex === -1) {
                continue;
              }

              if (preferences.reveal && room.status === ROOM_STATUS.Reveal && room.playerStatuses[playerIndex] === PLAYER_STATUS.Committed) {
                events.push({
                  id: `reveal:${publicKey.toBase58()}:${room.publicKey}:${room.createdSlot}`,
                  title: "Reveal window is live",
                  description: `${shortKey(room.publicKey, 6)} entered reveal. Open the room and break the seal before the clock burns out.`,
                  url: `/rooms/${room.publicKey}`,
                  tone: "info"
                });
              }

              if (preferences.claim && room.status === ROOM_STATUS.Resolved && BigInt(room.playerRewardsLamports[playerIndex]) > 0n && !room.playerClaimed[playerIndex]) {
                events.push({
                  id: `claim:${publicKey.toBase58()}:${room.publicKey}:${room.createdSlot}`,
                  title: "Reward is claimable",
                  description: `${shortKey(room.publicKey, 6)} has settled and your payout is waiting on-chain.`,
                  url: `/rooms/${room.publicKey}#room-actions`,
                  tone: "success"
                });
              }
            }
          }
        }

        if (preferences.reserve) {
          const response = await fetch("/api/reserve", { cache: "no-store" });
          const payload = (await response.json()) as { ok?: boolean; reserve?: SerializedFaultlineReserveAccount | null };
          if (response.ok && payload.ok && payload.reserve) {
            if (payload.reserve.freeAccessEnabled) {
              events.push({
                id: "reserve:free-access-enabled",
                title: "Free-access rail is active",
                description: "The reserve now reports free-access as enabled on-chain. Check the reserve console for the current posture.",
                url: "/reserve",
                tone: "info"
              });
            }

            if (BigInt(payload.reserve.freeAccessDistributedLamports) > 0n) {
              events.push({
                id: `reserve:distributed:${payload.reserve.freeAccessDistributedLamports}`,
                title: "Reserve distribution moved",
                description: "The free-access distribution counter changed. Check the reserve console for the latest public accounting.",
                url: "/reserve",
                tone: "info"
              });
            }
          }
        }

        for (const event of events) {
          if (hasSeen(event.id)) {
            continue;
          }
          remember(event.id);
          emitAlert(event);
        }
      } catch {
        // Ignore alert polling failures; the next cycle will retry.
      } finally {
        pending = false;
      }
    }

    void pollAlerts();
    const interval = window.setInterval(() => {
      void pollAlerts();
    }, ALERT_POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [publicKey, toast]);

  return null;
}
