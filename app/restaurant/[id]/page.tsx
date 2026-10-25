"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Zomato-style red accent, reused everywhere on this theme.
const RED = "#E23744";

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
};

type RestaurantData = {
  name: string;
  cuisine: string;
  area: string;
  averageRating: number | null;
  totalReviews: number;
  latestReview: Review | null;
  reviews: Review[];
};

// Turns a rating into text symbols — pure presentation, no arithmetic.
function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function ReviewCard({
  review,
  label,
  highlighted,
}: {
  review: Review;
  label?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "rounded-xl border p-4"
          : "rounded-xl border border-neutral-200 bg-white p-4"
      }
      style={
        highlighted
          ? { borderColor: RED, backgroundColor: "#FFF7F7" }
          : undefined
      }
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm" style={{ color: RED }}>
          {stars(review.rating)}
        </span>
        <span className="text-xs text-neutral-400">
          {shortDate(review.createdAt)}
        </span>
      </div>
      {review.comment && (
        <p className="mt-2 text-[15px] leading-relaxed">{review.comment}</p>
      )}
      {label && (
        <p
          className="mt-2 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: RED }}
        >
          {label}
        </p>
      )}
    </div>
  );
}

function RestaurantScreen() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [data, setData] = useState<RestaurantData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");

  // The screen calls the API and renders what it gets. That is all it is.
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/restaurants/${id}`);
      if (res.status === 404) {
        setStatus("notfound");
        return;
      }
      const json = await res.json();
      setData(json);
      setStatus("ready");
    }
    load();
  }, [id]);

  if (status === "notfound") {
    return (
      <main className="mx-auto w-full max-w-[560px] px-6 py-12">
        <p className="text-lg">There is no restaurant here.</p>
      </main>
    );
  }

  if (status === "loading" || !data) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-6 py-12">
        <p className="text-neutral-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[560px] px-6 py-10">
      {/* Header block: name, location, average — clearly prominent */}
      <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {data.cuisine} · {data.area}
      </p>

      {/* The average rating. This line PRINTS the number the backend
          computed (AVG(rating), rounded there). There is no calculation
          anywhere in this file. */}
      <div className="mt-4 flex items-baseline gap-3">
        <p className="text-5xl font-bold tracking-tight" style={{ color: RED }}>
          {data.averageRating ?? "—"}
        </p>
        <p className="text-sm text-neutral-500">
          {data.totalReviews} {data.totalReviews === 1 ? "review" : "reviews"}
        </p>
      </div>

      {/* Empty state: nothing yet. Invite the first review. */}
      {data.totalReviews === 0 && (
        <div className="mt-8 rounded-xl border border-neutral-200 p-5 text-center">
          <p className="text-[15px] font-semibold">No reviews yet</p>
          <p className="mt-1 text-sm text-neutral-500">
            Nobody has eaten here in the app before. Be the first to say how it
            was.
          </p>
        </div>
      )}

      {/* The way in to write a review — filled red, unmissable */}
      <Link
        href={`/review/${id}`}
        className="mt-6 block w-full rounded-xl px-4 py-3.5 text-center text-base font-semibold text-white transition-transform hover:scale-[1.01]"
        style={{ backgroundColor: RED }}
      >
        Write a Review
      </Link>

      {/* Latest review, set apart — because recency is what people trust */}
      {data.latestReview && (
        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Latest review
          </p>
          <div className="mt-3">
            <ReviewCard review={data.latestReview} highlighted label="Latest" />
          </div>
        </section>
      )}

      {/* Older reviews below, clean cards, newest first */}
      {data.reviews.length > 0 && (
        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Earlier reviews
          </p>
          <ul className="mt-3 space-y-3">
            {data.reviews.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

// Wrap the screen in <Suspense>: the page shell can prerender without knowing
// the URL parameter, and the real content streams in once useParams() can answer.
export default function RestaurantPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[560px] px-6 py-12">
          <p className="text-neutral-400">Loading…</p>
        </main>
      }
    >
      <RestaurantScreen />
    </Suspense>
  );
}
