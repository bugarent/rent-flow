"use client";

import { useEffect } from "react";

/**
 * Root error boundary — must not import app layout chrome.
 * Styles are inline so this works even if CSS fails to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest || error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#0b1f4b", margin: 0 }}>
            rentairportcars.com
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "16px 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#475569", margin: 0 }}>
            A server error occurred. Please try again in a moment.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 12, fontFamily: "monospace" }}>
              Ref: {error.digest}
            </p>
          ) : null}
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: 44,
                padding: "0 20px",
                borderRadius: 12,
                border: "none",
                background: "#0b1f4b",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                minHeight: 44,
                padding: "0 20px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0b1f4b",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
