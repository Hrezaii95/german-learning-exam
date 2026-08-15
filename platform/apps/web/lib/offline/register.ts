/**
 * Service-worker registration, expressed without the DOM.
 *
 * The interesting behaviour here is all failure behaviour — what happens when
 * the browser has no worker support, when registration is refused, when a
 * worker is already parked from a previous visit, when the state change is a
 * first install rather than an update. None of that is testable through a
 * React component without a full browser, and all of it must be right, so it
 * lives here behind structural types the tests can supply fakes for.
 *
 * `components/offline/OfflineRuntime.tsx` adapts the real browser objects onto
 * these types; nothing in this file touches a global.
 *
 * The one hard rule: this must never throw. Offline support is an enhancement,
 * and a learner whose browser refuses service workers gets the ordinary app.
 */

/** The parts of `ServiceWorker` this app uses. */
export type OfflineWorker = {
  readonly state: string;
  addEventListener(type: "statechange", listener: () => void): void;
  postMessage(message: unknown): void;
};

/** The parts of `ServiceWorkerRegistration` this app uses. */
export type OfflineWorkerRegistration = {
  readonly installing: OfflineWorker | null;
  readonly waiting: OfflineWorker | null;
  addEventListener(type: "updatefound", listener: () => void): void;
};

/** The parts of `ServiceWorkerContainer` this app uses. */
export type OfflineWorkerContainer = {
  /**
   * The worker currently controlling this page, or null when none is. This is
   * the signal that separates a first install from an update, so it is read at
   * the moment of the state change rather than captured up front.
   */
  readonly controller: unknown;
  register(
    scriptUrl: string,
    options: { scope: string; updateViaCache: "none" },
  ): Promise<OfflineWorkerRegistration>;
};

export type OfflineRegistrationOptions = Readonly<{
  scriptUrl: string;
  scope: string;
  /** A worker has finished downloading and is waiting for the learner to say go. */
  onUpdateReady: (worker: OfflineWorker) => void;
  /** Registration could not happen. The app carries on online-only. */
  onUnavailable?: (reason: unknown) => void;
  /** Set once the effect is torn down, so a late callback is dropped. */
  isCancelled?: () => boolean;
}>;

/**
 * Feature detection, kept separate so the caller can skip the import cost and
 * so "does this browser support it" is a testable question of its own.
 */
export function supportsServiceWorker(
  navigatorLike: { serviceWorker?: unknown } | null | undefined,
): boolean {
  return Boolean(navigatorLike && "serviceWorker" in navigatorLike);
}

/**
 * Register the worker and report an update when — and only when — one is
 * genuinely waiting to replace a worker that is already running this page.
 *
 * Returns the registration, or `null` if anything at all went wrong. Callers
 * are expected to treat `null` as "no offline support today", not as an error
 * worth showing anyone.
 */
export async function registerOfflineWorker(
  container: OfflineWorkerContainer,
  options: OfflineRegistrationOptions,
): Promise<OfflineWorkerRegistration | null> {
  const cancelled = () => options.isCancelled?.() === true;

  let registration: OfflineWorkerRegistration;
  try {
    registration = await container.register(options.scriptUrl, {
      scope: options.scope,
      // The worker script must never come from the HTTP cache, or a learner
      // can sit on a superseded worker until the browser decides otherwise.
      updateViaCache: "none",
    });
  } catch (reason) {
    options.onUnavailable?.(reason);
    return null;
  }

  if (cancelled()) return registration;

  const promote = (worker: OfflineWorker | null) => {
    if (!worker || cancelled()) return;
    options.onUpdateReady(worker);
  };

  // Downloaded during an earlier visit and parked ever since.
  if (registration.waiting && container.controller) {
    promote(registration.waiting);
  }

  try {
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        // `controller` is null while the very first worker installs. Treating
        // that as an update would offer to reload a page that has nothing to
        // reload into.
        if (installing.state === "installed" && container.controller) {
          promote(installing);
        }
      });
    });
  } catch (reason) {
    options.onUnavailable?.(reason);
  }

  return registration;
}
