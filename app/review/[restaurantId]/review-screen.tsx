"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const RED = "#E23744";
const GREEN = "#267E3E";

// Spec table for the green pill under the stars.
const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Average",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

// The interactive form. Its name and restaurant id arrive from the server
// as props — no fetch on this screen at all.
export default function ReviewScreen({
  restaurantId,
  restaurantName,
}: {
  restaurantId: string;
  restaurantName: string;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only one watchdog may exist at a time. If the user abandons a slow
  // submit (navigates away) and starts a new one, the previous timer must
  // not come back to life and touch the screen mid-flight of the new one.
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If the screen ever unmounts while a submit is pending, disarm the
  // watchdog so it cannot fire into a gone screen.
  useEffect(() => {
    return () => {
      if (watchdogRef.current !== null) {
        clearTimeout(watchdogRef.current);
      }
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    // Ten-second watchdog: when nothing has arrived in 10 s, abandon the
    // request, show the timeout message and give the button back — no
    // matter what the pending fetch does (or fails to do) afterwards.
    if (watchdogRef.current !== null) {
      // Disarm any watchdog left behind by an abandoned earlier submit.
      clearTimeout(watchdogRef.current);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      setError(
        "Saving took too long and was stopped after 10 seconds. Please try again."
      );
      setSubmitting(false);
    }, 10000);
    watchdogRef.current = timer;

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          restaurantId: Number(restaurantId),
          rating,
          // REQUIRED as of the product decision to make written reviews
          // mandatory: this screen can never submit without text, because
          // the button stays disabled until a rating AND text exist.
          comment,
        }),
      });
      clearTimeout(timer);

      if (res.status === 201) {
        // Success: navigate the BROWSER (not the client router) to the
        // restaurant page. That page is server-rendered, so its HTML already
        // contains the fresh facts — one round trip, no "Loading…" waiting
        // on extra fetches. A full navigation also means the review form is
        // a brand-new document when it's next opened: no cached component
        // instance can ever wake up with old stars, old text or "Saving…".
        // (With client-router transitions + streamed pages, the router can
        // cache this screen's mid-flight state, which is exactly the old
        // stuck-form bug resurfacing through a different door.)
        window.location.assign(`/restaurant/${restaurantId}`);
        return;
      }

      // Any other answer: show the backend's own message when it has one.
      // (Its words stay authoritative; ours only covers a body-less reply.)
      let data: { error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // The reply had no JSON on it — the generic message below covers that.
      }
      setError(
        data?.error ??
          "Could not save your review right now. Please try again."
      );
      // The backend refused — wake the button so the user can retry.
      setSubmitting(false);
    } catch (err) {
      // The request itself failed — dropped connection, bad proxy, same.
      clearTimeout(timer);
      // If the watchdog already fired, it owns the message and the button;
      // arriving here means the abandoned request finally died (or the
      // user's clock was unlucky). Don't overwrite its message.
      if (!controller.signal.aborted) {
        setError(
          "Could not reach the server. Please check your connection and try again."
        );
        setSubmitting(false);
      }
    }
  }

  const shown = hovered > 0 ? hovered : rating;
  // A rating AND at least one non-space character of review text are both
  // required before Submit unlocks.
  const hasRating = rating >= 1;
  const hasText = comment.trim().length > 0;
  const canSubmit = hasRating && hasText && !submitting;

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 pb-10 pt-8">
      {/* Back to the restaurant. A plain link (not browser history) so it
          works even when this page is opened directly. Grey, dark on hover. */}
      <Link
        href={`/restaurant/${restaurantId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition-colors hover:text-neutral-700"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-5 shadow-md"
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">
          Writing a review for
        </p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight">
          {restaurantName}
        </h1>

        <div className="mt-7">
          <label className="block text-sm font-bold">Rate it</label>
          <div
            className="mt-3 flex gap-2"
            onMouseLeave={() => setHovered(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const selected = star <= shown;
              return (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  className="flex h-16 flex-1 items-center justify-center rounded-xl border transition-colors duration-100"
                  style={
                    selected
                      ? { backgroundColor: "#EAF6EB", borderColor: GREEN }
                      : { backgroundColor: "#FFFFFF", borderColor: "#D4D4D4" }
                  }
                >
                  <span
                    className="text-3xl leading-none"
                    style={{ color: selected ? GREEN : "#9CA3AF" }}
                  >
                    &#9733;
                  </span>
                </button>
              );
            })}
          </div>

          {/* Green pill label for the selected (or hovered) rating */}
          {shown > 0 && (
            <div className="mt-3">
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ backgroundColor: GREEN }}
              >
                {shown} · {RATING_LABELS[shown]}
              </span>
            </div>
          )}
        </div>

        <div className="mt-7">
          <label htmlFor="comment" className="block text-sm font-bold">
            Your review
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="How was the food, the service, the vibe?"
            className="mt-2 w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base placeholder:text-neutral-400 focus:border-[#E23744] focus:outline-none"
          />
          {/* Character counter, bottom right */}
          <p className="mt-1 text-right text-xs text-neutral-400">
            {comment.length}/500
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Grey and disabled until a star is picked AND review text exists. */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 w-full rounded-xl px-4 py-3.5 text-base font-extrabold text-white transition-colors disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500 hover:brightness-110"
          style={canSubmit ? { backgroundColor: RED } : undefined}
        >
          {submitting ? "Saving…" : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
