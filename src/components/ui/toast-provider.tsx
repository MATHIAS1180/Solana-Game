"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

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

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 180);
  }, []);

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
      window.setTimeout(() => {
        dismiss(id);
      }, durationMs);
    },
    [dismiss]
  );

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="arena-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} data-tone={toast.tone} data-closing={toast.closing ? "true" : "false"} className="arena-toast rounded-[1.4rem] p-4">
            <div className="arena-toast-progress" data-tone={toast.tone} style={{ animationDuration: `${toast.durationMs}ms` }} />
            <div className="flex items-start gap-3">
              <ToastIcon tone={toast.tone} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm uppercase tracking-[0.18em] text-white">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm leading-6 text-white/68">{toast.description}</p> : null}
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