import { after } from "next/server";

/**
 * Run work only after the HTTP response has closed.
 * The open window is not held for email, Telegram, or other follow-up.
 * The returned promise is what keeps the server alive until the send finishes.
 */
export function runAfterResponse(task: () => Promise<unknown>) {
  after(() =>
    Promise.resolve()
      .then(task)
      .catch((error) => {
        console.warn("[after-response] task failed", error);
      }),
  );
}
