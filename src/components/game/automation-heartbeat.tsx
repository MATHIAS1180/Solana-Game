"use client";

import { useEffect } from "react";

import { AUTOMATION_HEARTBEAT_INTERVAL_MS } from "@/lib/faultline/constants";

export function AutomationHeartbeat() {
  useEffect(() => {
    let disposed = false;
    let pending = false;

    async function pingHeartbeat() {
      if (disposed || pending || document.visibilityState === "hidden") {
        return;
      }

      pending = true;
      try {
        await fetch("/api/automation/heartbeat", {
          method: "POST",
          cache: "no-store",
          keepalive: true
        });
      } catch {
        // Ignore heartbeat failures on the client; the next cycle will retry.
      } finally {
        pending = false;
      }
    }

    void pingHeartbeat();
    const interval = window.setInterval(() => {
      void pingHeartbeat();
    }, AUTOMATION_HEARTBEAT_INTERVAL_MS);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void pingHeartbeat();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}