"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastRecord = ToastInput & {
  id: number;
  tone: ToastTone;
  durationMs: number;
  closing: boolean;
};

const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return <CheckCircle2 className="size-5 text-fault-signal" />;
  }

  if (tone === "error") {
    return <AlertTriangle className="size-5 text-fault-ember" />;
  }

  return <Info className="size-5 text-fault-flare" />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const counterRef = useRef(0);
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [hoveredToastId, setHoveredToastId] = useState<number | null>(null);
  const timersRef = useRef(new Map<number, number>());
  const startedAtRef = useRef(new Map<number, number>());
  const remainingRef = useRef(new Map<number, number>());

  const clearTimer = useCallback((id: number) => {
    const timeoutId = timersRef.current.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timersRef.current.delete(id);
    }
  }, []);

  const scheduleDismiss = useCallback(
    (id: number, delay: number) => {
      clearTimer(id);
      startedAtRef.current.set(id, Date.now());
      remainingRef.current.set(id, delay);
      const timeoutId = window.setTimeout(() => {
        dismiss(id);
      }, delay);
      timersRef.current.set(id, timeoutId);
    },
    [clearTimer]
  );

  const dismiss = useCallback((id: number) => {
    clearTimer(id);
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      startedAtRef.current.delete(id);
      remainingRef.current.delete(id);
    }, 180);
  }, [clearTimer]);

  const pauseDismiss = useCallback(
    (id: number) => {
      clearTimer(id);
      const startedAt = startedAtRef.current.get(id) ?? Date.now();
      const remaining = remainingRef.current.get(id) ?? 0;
      const nextRemaining = Math.max(0, remaining - (Date.now() - startedAt));
      remainingRef.current.set(id, nextRemaining);
      setHoveredToastId(id);
    },
    [clearTimer]
  );

  const resumeDismiss = useCallback(
    (id: number) => {
      const remaining = remainingRef.current.get(id) ?? 0;
      if (remaining > 0) {
        scheduleDismiss(id, remaining);
      }
      setHoveredToastId((current) => (current === id ? null : current));
    },
    [scheduleDismiss]
  );

  const notify = useCallback(
    (input: ToastInput) => {
      counterRef.current += 1;
      const id = counterRef.current;
      const durationMs = input.durationMs ?? (input.tone === "error" ? 6200 : input.tone === "success" ? 5200 : 4200);
      const nextToast: ToastRecord = {
        id,
        tone: input.tone ?? "info",
        title: input.title,
        description: input.description,
        durationMs,
        closing: false
      };

      setToasts((current) => [...current, nextToast]);
      scheduleDismiss(id, durationMs);
    },
    [scheduleDismiss]
  );

  useEffect(() => {
    return () => {
      for (const timeoutId of timersRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      timersRef.current.clear();
      startedAtRef.current.clear();
      remainingRef.current.clear();
    };
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="arena-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            data-tone={toast.tone}
            data-closing={toast.closing ? "true" : "false"}
            className="arena-toast rounded-[1.4rem] p-4"
            onMouseEnter={() => pauseDismiss(toast.id)}
            onMouseLeave={() => resumeDismiss(toast.id)}
          >
            <div
              className="arena-toast-progress"
              data-tone={toast.tone}
              style={{
                animationDuration: `${toast.durationMs}ms`,
                animationPlayState: hoveredToastId === toast.id ? "paused" : "running"
              }}
            />
            <div className="flex items-start gap-3">
              <ToastIcon tone={toast.tone} />
              <div className="min-w-0 flex-1">
                <p className="arena-toast-title font-display text-sm uppercase tracking-[0.18em] text-white">{toast.title}</p>
                {toast.description ? <p className="arena-toast-copy mt-1 text-sm leading-6 text-white/68">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="inline-flex rounded-full border border-white/10 p-2 text-white/55 transition hover:border-white/20 hover:text-white"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}