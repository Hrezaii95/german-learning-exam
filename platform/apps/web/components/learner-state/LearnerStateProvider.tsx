"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  deriveRewards,
  type DerivedRewardsView,
} from "@german-learning/learning";
import {
  createLearnerStateController,
  type LearnerStateController,
  type LearnerStateCoreSnapshot,
} from "@/lib/learner-state";

const LOADING_SNAPSHOT: LearnerStateCoreSnapshot = Object.freeze({
  status: "loading",
  hydration: null,
  error: null,
  recoveryRequired: false,
  statusMessage: "Loading local learner state.",
});

export type LearnerStateContextValue = Readonly<{
  snapshot: LearnerStateCoreSnapshot;
  rewards: DerivedRewardsView | null;
  controller: LearnerStateController | null;
}>;

const LearnerStateContext = createContext<LearnerStateContextValue | null>(null);

export function LearnerStateProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef<LearnerStateController | null>(null);
  const [snapshot, setSnapshot] = useState<LearnerStateCoreSnapshot>(LOADING_SNAPSHOT);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    let removeStorageListener: () => void = () => undefined;

    try {
      const controller = createLearnerStateController({ store: window.localStorage });
      controllerRef.current = controller;
      unsubscribe = controller.subscribe((next) => {
        if (active) setSnapshot(next);
      });
      const storageHandler = (event: StorageEvent) => {
        if (event.storageArea === window.localStorage) {
          void controller.reloadFromStorage();
        }
      };
      window.addEventListener("storage", storageHandler);
      removeStorageListener = () => window.removeEventListener("storage", storageHandler);
      void controller.initialize().then((next) => {
        if (active) setSnapshot(next);
      });
    } catch {
      setSnapshot(Object.freeze({
        status: "error",
        hydration: null,
        error: Object.freeze({
          code: "STORAGE_UNAVAILABLE",
          field: null,
          message: "Local learner storage is unavailable in this browser.",
        }),
        recoveryRequired: false,
        statusMessage: "Local learner storage is unavailable in this browser.",
      }));
    }

    return () => {
      active = false;
      unsubscribe();
      removeStorageListener();
      controllerRef.current = null;
    };
  }, []);

  const rewards = useMemo(() => {
    const state = snapshot.hydration?.state;
    if (!state) return null;
    try {
      return deriveRewards(state.events, {
        now: new Date(),
        timezone: state.settings.timezone,
      });
    } catch {
      return null;
    }
  }, [snapshot]);

  const value = useMemo<LearnerStateContextValue>(
    () => ({ snapshot, rewards, controller: controllerRef.current }),
    [snapshot, rewards],
  );

  return (
    <LearnerStateContext.Provider value={value}>
      {children}
    </LearnerStateContext.Provider>
  );
}

export function useLearnerState(): LearnerStateContextValue {
  const value = useContext(LearnerStateContext);
  if (!value) throw new Error("useLearnerState requires LearnerStateProvider");
  return value;
}

export function useOptionalLearnerState(): LearnerStateContextValue | null {
  return useContext(LearnerStateContext);
}
