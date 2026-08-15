"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/**
 * Route-change indicator.
 *
 * Replaces the old full-screen black curtain, which hid the page on every
 * navigation and left nothing on screen if its animation failed. This runs
 * a slim rule across the top instead: the outgoing page stays readable,
 * and any real waiting is handled by the `loading.tsx` boundaries.
 */
export default function PageTransition() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    setState("loading");
    // `scroll-behavior: smooth` is set globally, so jump explicitly rather
    // than letting the new page glide up from the old scroll position.
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

    const toDone = setTimeout(() => setState("done"), 450);
    const toIdle = setTimeout(() => setState("idle"), 900);
    return () => {
      clearTimeout(toDone);
      clearTimeout(toIdle);
    };
  }, [pathname]);

  if (state === "idle") return null;

  return <div className="route-progress" data-state={state} aria-hidden="true" />;
}
