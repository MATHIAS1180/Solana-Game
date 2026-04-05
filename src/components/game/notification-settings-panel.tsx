"use client";

import { useEffect, useState } from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import { Bell, BellRing, CheckCircle2, ShieldAlert } from "lucide-react";

import { useToast } from "@/components/ui/toast-provider";
import { ALERT_PREFERENCES_KEY, DEFAULT_ALERT_PREFERENCES, parseAlertPreferences, serializeAlertPreferences, type AlertPreferences } from "@/lib/faultline/alerts";
import { listStoredPayloadsForWallet } from "@/lib/faultline/storage";

function getPermissionState() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" as const;
  }

  return Notification.permission;
}

export function NotificationSettingsPanel() {
  const { publicKey } = useWallet();
  const toast = useToast();
  const [preferences, setPreferences] = useState<AlertPreferences>(DEFAULT_ALERT_PREFERENCES);
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">("unsupported");
  const [activePayloadCount, setActivePayloadCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPreferences(parseAlertPreferences(window.localStorage.getItem(ALERT_PREFERENCES_KEY)));
    setPermissionState(getPermissionState());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ALERT_PREFERENCES_KEY, serializeAlertPreferences(preferences));
  }, [preferences]);

  useEffect(() => {
    let disposed = false;

    async function loadPayloadCount() {
      if (!publicKey) {
        setActivePayloadCount(0);
        return;
      }

      try {
        const records = await listStoredPayloadsForWallet(publicKey.toBase58());
        if (!disposed) {
          setActivePayloadCount(records.length);
        }
      } catch {
        if (!disposed) {
          setActivePayloadCount(0);
        }
      }
    }

    void loadPayloadCount();

    return () => {
      disposed = true;
    };
  }, [publicKey]);

  async function requestPermission() {
    if (!("Notification" in window)) {
      toast({
        tone: "error",
        title: "Browser notifications unavailable",
        description: "This browser does not expose the Notification API."
      });
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermissionState(nextPermission);

    toast({
      tone: nextPermission === "granted" ? "success" : "info",
      title: nextPermission === "granted" ? "Browser notifications enabled" : "Notifications not fully enabled",
      description:
        nextPermission === "granted"
          ? "Reveal and claim reminders can now reach you even when the tab is not focused."
          : "In-app toasts still work while the tab is open, but background browser notifications are not allowed.",
      durationMs: 7200
    });
  }

  function updatePreferences(next: Partial<AlertPreferences>) {
    setPreferences((current) => ({
      ...current,
      ...next
    }));
  }

  return (
    <div className="space-y-8">
      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">Alert Center</p>
        <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">Useful reminders, not spam.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
          Faultline can now watch the live board in the browser and warn you when reveal opens, when a reward becomes claimable, or when the reserve rail changes in a meaningful public way.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="fault-card rounded-[2rem] p-6 sm:p-8">
          <p className="arena-kicker">Permission</p>
          <h2 className="mt-3 font-display text-2xl text-white">Browser delivery posture.</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="arena-stat rounded-3xl p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Permission</p>
              <p className="mt-3 text-xl text-white">{permissionState}</p>
            </div>
            <div className="arena-stat rounded-3xl p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Watcher</p>
              <p className="mt-3 text-xl text-white">{preferences.enabled ? "Armed" : "Off"}</p>
            </div>
            <div className="arena-stat rounded-3xl p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Local reveal keys</p>
              <p className="mt-3 text-xl text-white">{activePayloadCount}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={requestPermission} className="arena-primary w-full px-5 py-3 text-xs uppercase tracking-[0.2em] sm:w-auto">
              <BellRing className="size-4" />
              Request browser permission
            </button>
            <button
              type="button"
              onClick={() => updatePreferences({ enabled: !preferences.enabled })}
              className="arena-secondary w-full sm:w-auto"
            >
              <Bell className="size-4" />
              {preferences.enabled ? "Disable reminders" : "Enable reminders"}
            </button>
          </div>
        </div>

        <div className="fault-card rounded-[2rem] p-6 sm:p-8">
          <p className="arena-kicker">Delivery Model</p>
          <h2 className="mt-3 font-display text-2xl text-white">What these reminders can actually do today.</h2>
          <div className="mt-6 space-y-3 text-sm leading-7 text-white/72">
            <div className="arena-surface rounded-2xl p-4">
              <p className="text-white">When the tab is open, reminders show up as in-app toasts.</p>
            </div>
            <div className="arena-surface rounded-2xl p-4">
              <p className="text-white">If browser permission is granted, the same watcher can fire real browser notifications while the tab is in the background.</p>
            </div>
            <div className="arena-surface rounded-2xl p-4">
              <p className="text-white">No email, Telegram, or push backend exists yet. This is a wallet-native browser watcher designed to help you not miss reveal or claim windows.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">Alert Types</p>
        <h2 className="mt-3 font-display text-2xl text-white">Choose what is worth interrupting you for.</h2>
        <div className="mt-6 space-y-4">
          {[
            {
              key: "reveal" as const,
              title: "Reveal windows",
              description: "Warn me when a room containing my wallet enters reveal while my seat is still sealed."
            },
            {
              key: "claim" as const,
              title: "Claimable rewards",
              description: "Warn me when a resolved room contains an unpaid reward for my wallet."
            },
            {
              key: "reserve" as const,
              title: "Reserve and free-access rail",
              description: "Warn me when the reserve reports free-access activation or a visible change in public distribution counters."
            }
          ].map((item) => (
            <label key={item.key} className="arena-surface flex items-start gap-4 rounded-2xl p-4 text-sm leading-7 text-white/74">
              <input
                type="checkbox"
                checked={preferences[item.key]}
                disabled={!preferences.enabled}
                onChange={(event) => updatePreferences({ [item.key]: event.target.checked } as Partial<AlertPreferences>)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-[#ffd166]"
              />
              <span>
                <span className="block font-display text-lg text-white">{item.title}</span>
                <span className="mt-1 block text-white/62">{item.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8 text-sm leading-7 text-white/72">
        <p className="inline-flex items-center gap-2 text-fault-flare">
          <ShieldAlert className="size-4" />
          The watcher reads public room and reserve APIs plus your connected wallet. It does not grant remote control over your wallet or reveal payload.
        </p>
        {!publicKey ? <p className="mt-4 text-white/62">Connect a wallet if you want reveal and claim reminders to become wallet-specific.</p> : null}
        {publicKey ? <p className="mt-4 text-white/62">This browser currently sees {activePayloadCount} locally stored reveal payload{activePayloadCount === 1 ? "" : "s"} for the connected wallet.</p> : null}
      </section>
    </div>
  );
}
