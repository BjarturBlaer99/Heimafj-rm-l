"use client";

import { useEffect } from "react";

export function ScrollReveals() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || typeof MutationObserver === "undefined" || typeof Element.prototype.animate !== "function") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const seen = new WeakSet<HTMLElement>();
    const pending = new Set<HTMLElement>();
    const animations = new Map<HTMLElement, Animation>();
    const selector = "[data-scroll-reveal]";

    function reveal(element: HTMLElement, state: "revealed" | "instant", delay = 0) {
      const animation = animations.get(element);
      if (!animation) return;
      pending.delete(element);
      observer.unobserve(element);
      if (state === "instant") {
        element.getAnimations().forEach((entrance) => {
          if ("animationName" in entrance && ["content-fade-in", "content-rise-in"].includes(String(entrance.animationName))) entrance.cancel();
        });
        animation.cancel();
        animations.delete(element);
        return;
      }
      animation.effect?.updateTiming({ delay });
      animation.play();
      void animation.finished.then(() => {
        animations.delete(element);
        animation.cancel();
      }).catch(() => { /* Focus, navigation or reduced motion may cancel a reveal. */ });
    }

    const observer = new IntersectionObserver((entries) => {
      const groups = new Map<Element | null, number>();
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (!entry.isIntersecting || !element.isConnected || !pending.has(element)) continue;
        const index = groups.get(element.parentElement) ?? 0;
        groups.set(element.parentElement, index + 1);
        reveal(element, preference.matches ? "instant" : "revealed", preference.matches ? 0 : Math.min(index * 60, 180));
      }
    }, { threshold: 0, rootMargin: "0px 0px 24px 0px" });

    function register(root: ParentNode) {
      const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));
      if (root instanceof HTMLElement && root.matches(selector)) elements.unshift(root);
      for (const element of elements) {
        if (seen.has(element)) continue;
        seen.add(element);
        if (preference.matches) continue;
        const bounds = element.getBoundingClientRect();
        const inView = bounds.bottom > 0 && bounds.top < window.innerHeight && bounds.right > 0 && bounds.left < window.innerWidth;
        if (inView || element.contains(document.activeElement)) continue;
        // CSS handles content already in view; pause offscreen entrances until
        // scrolling reveals them without changing streamed React markup.
        const animation = element.animate([{ opacity: 0, translate: "0 18px" }, {}], {
          duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards"
        });
        animation.pause();
        animation.currentTime = 0;
        animations.set(element, animation);
        pending.add(element);
        observer.observe(element);
      }
    }

    function revealAncestors(target: Element | null) {
      for (let element = target; element; element = element.parentElement) {
        if (element instanceof HTMLElement) reveal(element, "instant");
      }
    }

    function revealHash(hash = window.location.hash) {
      if (!hash) return;
      let id = hash.slice(1);
      try { id = decodeURIComponent(id); } catch { /* Keep literal malformed fragments. */ }
      revealAncestors(document.getElementById(id) ?? document.getElementsByName(id)[0] ?? null);
    }

    function onFocus(event: FocusEvent) {
      if (!(event.target instanceof Element)) return;
      revealAncestors(event.target);
      event.target.querySelectorAll<HTMLElement>(selector).forEach((element) => reveal(element, "instant"));
    }
    function onHashChange() { revealHash(); }
    function onAnchorClick(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search) revealHash(url.hash);
      } catch { /* Ignore malformed links without affecting their click handling. */ }
    }
    function onPreferenceChange() {
      if (preference.matches) animations.forEach((_animation, element) => reveal(element, "instant"));
    }

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node instanceof Element) register(node);
      }
      animations.forEach((_animation, element) => {
        if (!element.isConnected) reveal(element, "instant");
      });
      revealHash();
    });
    register(document);
    revealHash();
    mutations.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("click", onAnchorClick, true);
    window.addEventListener("hashchange", onHashChange);
    preference.addEventListener("change", onPreferenceChange);

    return () => {
      mutations.disconnect();
      observer.disconnect();
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("click", onAnchorClick, true);
      window.removeEventListener("hashchange", onHashChange);
      preference.removeEventListener("change", onPreferenceChange);
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      pending.clear();
    };
  }, []);

  return null;
}
