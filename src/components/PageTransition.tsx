"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function PageTransition() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "cover" | "lift">("lift");
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      setPhase("lift");
      return;
    }
    setPhase("cover");
    window.scrollTo(0, 0);
    const t = setTimeout(() => setPhase("lift"), 120);
    return () => clearTimeout(t);
  }, [pathname]);

  if (phase === "idle") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#201e1d",
        pointerEvents: phase === "cover" ? "all" : "none",
        transformOrigin: "top",
        ...(phase === "cover"
          ? { opacity: 1 }
          : { animation: "curtainLift .62s cubic-bezier(.76,0,.24,1) forwards" }),
      }}
      onAnimationEnd={() => {
        if (phase === "lift") setPhase("idle");
      }}
    />
  );
}
