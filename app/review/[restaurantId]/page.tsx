"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { flushSync } from "react-dom";

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

function ReviewScreen() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;
  const router = useRouter();

  const [name, setName] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only one watchdog may exist at a time. If the user abandons a slow
  // submit (navigates away) and starts a new one, the previous timer must
  // not come back to life and touch the screen mid-flight of the new one.
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ask the backend for the restaurant's name. The frontend never invents data.
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/restaurants/${restaurantId}`);
      if (res.status === 404) {
        setMissing(true);
        return;
      }
      const data = await res.json();
      setName(data.name);
    }
    load();
  }, [restaurantId]);

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
          // OPTIONAL: send only when there is text. The backend allows its absence.
          ...(comment.trim().length > 0 ? { comment } : {}),
        }),
      });
      clearTimeout(timer);

      if (res.status === 201) {
        // Success. Reset the WHOLE form BEFORE navigating: Next's router
        // keeps this component's client state and serves the very same
        // instance back when the screen reopens. The catch: React batches
        // the reset states, and router.push can swap the screen away before
        // they commit — the router then caches "Saving…" + the old stars
        // and the reopening shows the stuck form. flushSync forces React
        // to commit the resets right now, so the cached copy wakes up
        // empty, with the button enabled and nothing in the saving state.
        flushSync(() => {
          setSubmitting(false);
          setRating(0);
          setHovered(0);
          setComment("");
          setError(null);
        });
        router.push(`/restaurant/${restaurantId}`);
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

  if (missing) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-6 py-12">
        <p className="text-lg">There is no restaurant here.</p>
      </main>
    );
  }

  const shown = hovered > 0 ? hovered : rating;
  // A rating is required; the review text is not.
  const canSubmit = rating >= 1 && !submitting;

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 pb-10 pt-8">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-5 shadow-md"
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">
          Writing a review for
        </p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight">
          {name ?? "Loading…"}
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
            Your review{" "}
            <span className="font-normal text-neutral-400">(optional)</span>
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

        {/* Grey and disabled until a star is picked. Review text NOT required. */}
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

// <Suspense> lets the page shell prerender; useParams() only answers at runtime.
export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[560px] px-6 py-12">
          <p className="text-neutral-400">Loading…</p>
        </main>
      }
    >
      <ReviewScreen />
    </Suspense>
  );
}
