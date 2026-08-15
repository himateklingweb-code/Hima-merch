"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Target {
  key: string;
  value: number;
  label: string;
  color?: string;
}

export default function StatsCounter({ targets }: { targets: Target[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(targets.map((t) => [t.key, 0]))
  );
  const countedRef = useRef(false);

  const runCounts = useCallback(() => {
    if (countedRef.current) return;
    countedRef.current = true;
    const t0 = performance.now();
    const dur = 1500;
    const map = Object.fromEntries(targets.map((t) => [t.key, t.value]));

    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const c: Record<string, number> = {};
      for (const k in map) c[k] = Math.round(map[k] * e);
      setCounts(c);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [targets]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      runCounts();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) runCounts();
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [runCounts]);

  return (
    <div
      ref={ref}
      className="stats-grid"
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "54px clamp(16px,3vw,40px)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
        gap: 2,
      }}
    >
      {targets.map((t, i) => (
        <div
          key={t.key}
          className="scroll-reveal"
          style={{
            padding: "0 26px",
            borderRight:
              i < targets.length - 1
                ? "1px solid rgba(32,30,29,.14)"
                : undefined,
            "--cover": `${26 + i * 4}%`,
          } as React.CSSProperties}
        >
          <div
            style={{
              fontSize: "clamp(40px,4.4vw,64px)",
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: "-.03em",
              fontFeatureSettings: "'tnum'",
              color: t.color,
            }}
          >
            {(counts[t.key] ?? 0).toLocaleString("id-ID")}
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              letterSpacing: ".18em",
              textTransform: "uppercase" as const,
              color: "#605d5d",
            }}
          >
            {t.label}
          </div>
        </div>
      ))}
    </div>
  );
}
