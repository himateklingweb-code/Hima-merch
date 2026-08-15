"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function PageTransition() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "drop" | "lift">("lift");
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      setPhase("lift");
      return;
    }
    setPhase("drop");
    const t = setTimeout(() => setPhase("lift"), 340);
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
        pointerEvents: "none",
        transformOrigin: phase === "drop" ? "bottom" : "top",
        animation:
          phase === "drop"
            ? "curtainDrop .32s cubic-bezier(.76,0,.24,1) forwards"
            : "curtainLift .68s cubic-bezier(.76,0,.24,1) forwards",
      }}
      onAnimationEnd={() => {
        if (phase === "lift") setPhase("idle");
      }}
    />
  );
}
