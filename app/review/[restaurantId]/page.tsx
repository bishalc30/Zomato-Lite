"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

export default function ReviewPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;
  const router = useRouter();

  const [name, setName] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const [rating, setRating] = useState(0);
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
        comment,
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

  const canSubmit = rating >= 1 && comment.trim().length > 0 && !submitting;

  return (
    <main className="mx-auto w-full max-w-[560px] px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        {name ?? "Loading…"}
      </h1>
      <p className="mt-1 text-sm text-stone-500">Write a review</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div>
          <label className="block text-sm font-medium">Your rating</label>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                className={`text-3xl leading-none transition-colors ${
                  star <= rating
                    ? "text-amber-600"
                    : "text-stone-300 hover:text-stone-400"
                }`}
              >
                &#9733;
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium">
            Your review
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Paneer burrito is unreal…"
            className="mt-2 w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-base placeholder:text-stone-400 focus:border-amber-600 focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-stone-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {submitting ? "Saving…" : "Submit"}
        </button>
      </form>
    </main>
  );
}
