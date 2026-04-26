"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    instgrm?: {
      Embeds: { process: () => void };
    };
  }
}

const SCRIPT_URL = "https://www.instagram.com/embed.js";

let scriptPromise: Promise<void> | null = null;

function ensureScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.instgrm) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      if (window.instgrm) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    document.body.appendChild(s);
  });
  return scriptPromise;
}

type Props = {
  permalink: string;
  className?: string;
};

export function InstagramEmbed({ permalink, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    ensureScript().then(() => {
      if (cancelled) return;
      window.instgrm?.Embeds.process();
    });
    return () => {
      cancelled = true;
    };
  }, [permalink]);

  return (
    <div ref={ref} className={className}>
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: 12,
          boxShadow: "0 1px 3px 0 rgba(0,0,0,0.08)",
          margin: 0,
          maxWidth: 540,
          minWidth: 280,
          padding: 0,
          width: "100%",
        }}
      >
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#0E2A8E",
            display: "block",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 14,
            padding: "16px",
            textDecoration: "none",
          }}
        >
          Ver postagem no Instagram ↗
        </a>
      </blockquote>
    </div>
  );
}
