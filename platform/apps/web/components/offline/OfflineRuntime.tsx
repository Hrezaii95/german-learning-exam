"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  OFFLINE_COPY,
  SERVICE_WORKER_PATH,
  SKIP_WAITING_MESSAGE,
} from "@/lib/offline/policy";
import {
  registerOfflineWorker,
  supportsServiceWorker,
  type OfflineWorker,
  type OfflineWorkerContainer,
} from "@/lib/offline/register";
import {
  withPagesBaseAssetPath,
  withPagesBasePath,
} from "@/lib/content/pages-base-path";

/**
 * The browser half of the offline policy: it installs the worker, tells the
 * learner when a new version is waiting, and says out loud when something they
 * asked for is genuinely not available.
 *
 * Three rules shape this component.
 *
 * 1. It can never break the app. Every browser capability is feature-detected
 *    and every promise has a rejection handler; a browser with no service
 *    worker, a locked-down profile, or a failed registration simply gets the
 *    ordinary online app with no error surfaced to the learner.
 *
 * 2. It never swaps the app out from under someone. A waiting worker stays
 *    waiting until the learner presses "Reload now" — the reload is only ever
 *    triggered by that click, never by `controllerchange` on its own, which
 *    also fires on the very first install when the worker claims the page.
 *
 * 3. It never pretends. When a sound fails to load while the device is
 *    offline, it says the recording is not saved yet and what to do about it,
 *    rather than leaving a dead play button.
 *
 * Registration is production-only: in `next dev` a cache-first worker would
 * happily serve yesterday's hot-reloaded chunks.
 */
export function OfflineRuntime() {
  const [isOffline, setIsOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [mediaNotice, setMediaNotice] = useState("");

  const waitingWorker = useRef<OfflineWorker | null>(null);
  const reloadRequested = useRef(false);

  /* --- connection state ------------------------------------------------- */
  useEffect(() => {
    // Starts `false` so the server-rendered markup and the first client render
    // agree; the real value lands immediately after mount.
    const sync = () => setIsOffline(!window.navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  /* --- service worker registration -------------------------------------- */
  useEffect(() => {
    // A cache-first worker in `next dev` would serve yesterday's hot-reloaded
    // chunks, so the worker is a production-build concern only.
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!supportsServiceWorker(window.navigator)) return;

    const browserContainer = window.navigator.serviceWorker;
    let cancelled = false;

    const onControllerChange = () => {
      // This also fires the first time a worker claims the page. Reloading
      // then would be an unexplained jump, so only a learner-requested update
      // ever reloads.
      if (!reloadRequested.current) return;
      window.location.reload();
    };
    browserContainer.addEventListener("controllerchange", onControllerChange);

    // The one place browser objects are adapted onto the DOM-free types the
    // registration logic (and its tests) are written against.
    const container: OfflineWorkerContainer = {
      get controller() {
        return browserContainer.controller;
      },
      register: (scriptUrl, options) =>
        browserContainer.register(scriptUrl, options),
    };

    void registerOfflineWorker(container, {
      scriptUrl: withPagesBaseAssetPath(SERVICE_WORKER_PATH),
      scope: withPagesBasePath("/"),
      isCancelled: () => cancelled,
      onUpdateReady: (worker) => {
        waitingWorker.current = worker;
        setUpdateReady(true);
      },
      onUnavailable: (reason) => {
        // Unsupported, blocked by browser settings, or served from a context
        // where workers are not allowed. Offline support is the only casualty.
        console.warn("[offline] service worker unavailable", reason);
      },
    });

    return () => {
      cancelled = true;
      browserContainer.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  /* --- media that is neither reachable nor saved ------------------------- */
  useEffect(() => {
    // Media load failures do not bubble, so the listener has to capture.
    const onError = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLMediaElement)) return;
      if (window.navigator.onLine) return;
      setMediaNotice(OFFLINE_COPY.mediaOffline);
    };
    document.addEventListener("error", onError, true);
    return () => document.removeEventListener("error", onError, true);
  }, []);

  // A message about a missing recording is only true while offline; once the
  // connection is back it would be stale advice.
  useEffect(() => {
    if (!isOffline) setMediaNotice("");
  }, [isOffline]);

  const applyUpdate = useCallback(() => {
    const worker = waitingWorker.current;
    if (!worker) {
      window.location.reload();
      return;
    }
    reloadRequested.current = true;
    worker.postMessage(SKIP_WAITING_MESSAGE);
  }, []);

  const showUpdate = updateReady && !updateDismissed;

  return (
    <div className="offline-runtime">
      {/* Rendered from first paint so assistive technology is already
          watching it when the first message arrives (WCAG 4.1.3). */}
      <div
        role="status"
        aria-live="polite"
        className={mediaNotice ? "offline-runtime__notice" : "live-region--idle"}
      >
        {mediaNotice}
      </div>

      {isOffline ? (
        <div className="offline-runtime__card" data-variant="offline">
          <p className="offline-runtime__title">
            <span className="offline-runtime__dot" aria-hidden="true" />
            {OFFLINE_COPY.offlineTitle}
          </p>
          <p className="offline-runtime__body">{OFFLINE_COPY.offlineBody}</p>
        </div>
      ) : null}

      {showUpdate ? (
        <div className="offline-runtime__card" data-variant="update">
          <p className="offline-runtime__title">{OFFLINE_COPY.updateTitle}</p>
          <p className="offline-runtime__body">{OFFLINE_COPY.updateBody}</p>
          <div className="offline-runtime__actions">
            <button type="button" className="btn btn-primary" onClick={applyUpdate}>
              {OFFLINE_COPY.updateAction}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setUpdateDismissed(true)}
            >
              {OFFLINE_COPY.updateDismiss}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
