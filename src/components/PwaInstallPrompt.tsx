"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isMobileish(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 640px)").matches) return true;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [iosTip, setIosTip] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (pathname?.startsWith("/auth")) {
      setVisible(false);
      setIosTip(false);
      setDeferred(null);
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname?.startsWith("/auth")) return;
    if (isStandalone()) return;
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore — install prompt may still appear where supported */
      });
    }
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    if (!isMobileish()) return;

    if (isIos()) {
      setIosTip(true);
      setVisible(true);
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, [pathname]);

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") dismiss();
      else setVisible(false);
    } catch {
      setVisible(false);
    }
    setDeferred(null);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1600] px-3 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] pt-2">
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl">
        <p className="text-sm font-semibold text-zinc-900">Install Reclaimed Marketplace</p>
        {iosTip ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            On iPhone or iPad, tap <span className="font-medium text-zinc-800">Share</span>, then{" "}
            <span className="font-medium text-zinc-800">Add to Home Screen</span> to open the marketplace like an app.
          </p>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            Add this site to your home screen for quicker access and a full-screen experience.
          </p>
        )}
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Not now
          </button>
          {!iosTip && deferred ? (
            <button
              type="button"
              onClick={() => void install()}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Install
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
