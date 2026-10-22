"use client";
import { AccountMenu } from "./AccountMenu";
import { AccountSyncPanel } from "./AccountSyncPanel";

/** Replaces Lane 1's foundation stub when the owner combines the two slices. */
export function AccountSlot() {
  return <div><AccountMenu compact /><AccountSyncPanel compact /></div>;
}
