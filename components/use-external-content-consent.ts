"use client";

import { useSyncExternalStore } from "react";
import { EXTERNAL_CONTENT_CHANGE_EVENT, EXTERNAL_CONTENT_STORAGE_KEY, externalContentRecord, readExternalContentChoice } from "@/lib/external-content-consent";

// A choice still takes effect for this page if browser storage is unavailable.
let memoryChoice: string | null | undefined;

function getChoice() {
  if (memoryChoice !== undefined) return readExternalContentChoice(memoryChoice);
  try { return readExternalContentChoice(window.localStorage.getItem(EXTERNAL_CONTENT_STORAGE_KEY)); }
  catch { return "unselected" as const; }
}
const getServerChoice = () => "unselected" as const;

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== EXTERNAL_CONTENT_STORAGE_KEY && event.key !== null) return;
    memoryChoice = undefined;
    onChange();
  };
  const onVisibility = () => {
    if (window.document.visibilityState === "visible") onChange();
  };
  window.addEventListener(EXTERNAL_CONTENT_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onChange);
  // Mobile browsers can resume a tab without a window focus event.
  window.document.addEventListener("visibilitychange", onVisibility);
  // Expiry also applies to a page left open, without waiting for navigation.
  const expiryCheck = window.setInterval(onChange, 60_000);
  return () => {
    window.removeEventListener(EXTERNAL_CONTENT_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onChange);
    window.document.removeEventListener("visibilitychange", onVisibility);
    window.clearInterval(expiryCheck);
  };
}

function saveChoice(allowed: boolean | null) {
  const record = allowed === null ? null : externalContentRecord(allowed);
  memoryChoice = record;
  let persisted = false;
  try {
    if (record === null) window.localStorage.removeItem(EXTERNAL_CONTENT_STORAGE_KEY);
    else window.localStorage.setItem(EXTERNAL_CONTENT_STORAGE_KEY, record);
    memoryChoice = undefined;
    persisted = true;
  } catch { /* Keep the explicit choice in memory rather than loading by default. */ }
  window.dispatchEvent(new Event(EXTERNAL_CONTENT_CHANGE_EVENT));
  return persisted;
}

export function useExternalContentConsent() {
  const choice = useSyncExternalStore(subscribe, getChoice, getServerChoice);
  return { choice, setAllowed: (allowed: boolean) => saveChoice(allowed), resetChoice: () => saveChoice(null) };
}
