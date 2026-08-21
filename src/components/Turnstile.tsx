"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile — the "no bot" check on the email login/signup form.
 *
 * It only renders when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, and Supabase
 * verifies the token server-side (Authentication → Attack Protection). Google
 * sign-in is left out on purpose: Google already blocks bots, and its OAuth
 * endpoint does not take a captcha token.
 */
declare global {
  interface Window {
    // The Turnstile script attaches this global once it loads.
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export default function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey: string;
  /** Fires with the token on success, or null when it expires or errors. */
  onToken: (token: string | null) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    let cancelled = false;

    const render = () => {
      if (cancelled || !holder.current || !window.turnstile || widgetId.current)
        return;
      widgetId.current = window.turnstile.render(holder.current, {
        sitekey: siteKey,
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      let script = document.querySelector<HTMLScriptElement>(
        'script[data-turnstile="1"]'
      );
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = "1";
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* widget already gone */
        }
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  return <div ref={holder} className="mt-1" />;
}
