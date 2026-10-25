"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: Number(restaurantId),
        rating,
        // OPTIONAL: send only when there is text. The backend allows its absence.
        ...(comment.trim().length > 0 ? { comment } : {}),
      }),
    });

    if (res.status === 400) {
      // Show the backend's own message. It owns the rules; we just display them.
      const data = await res.json();
      setError(data.error);
      setSubmitting(false);
      return;
    }

    // Success: the backend saved the fact. Now the screen hands
    // control to the restaurant page, which will fetch it fresh.
    router.push(`/restaurant/${restaurantId}`);
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
