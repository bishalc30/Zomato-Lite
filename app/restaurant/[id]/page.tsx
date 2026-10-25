"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Review = {
  id: number;
  rating: number;
  comment: string;
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

function ReviewBody({ review }: { review: Review }) {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-amber-600">{stars(review.rating)}</span>
        <span className="text-xs text-stone-400">{shortDate(review.createdAt)}</span>
      </div>
      <p className="mt-1.5 text-[15px] leading-relaxed">{review.comment}</p>
    </>
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
        <p className="text-stone-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[560px] px-6 py-12">
      {/* 1. Name, with cuisine and area underneath, muted */}
      <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
      <p className="mt-1 text-sm text-stone-500">
        {data.cuisine} · {data.area}
      </p>

      {/* 2. The average rating. This line PRINTS the number the backend
          computed (AVG(rating), rounded there). There is no calculation
          anywhere in this file. */}
      <div className="mt-8 flex items-baseline gap-3">
        <p className="text-6xl font-semibold tracking-tight text-amber-600">
          {data.averageRating ?? "—"}
        </p>
        <p className="text-sm text-stone-500">
          {data.totalReviews} {data.totalReviews === 1 ? "review" : "reviews"}
        </p>
      </div>

      {/* Empty state: nothing yet. Invite the first review. */}
      {data.totalReviews === 0 && (
        <div className="mt-8 rounded-lg border border-stone-200 p-5 text-center">
          <p className="text-[15px] font-medium">No reviews yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Nobody has eaten here in the app before. Be the first to say how it
            was.
          </p>
          <Link
            href={`/review/${id}`}
            className="mt-3 inline-block rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
          >
            Write the first review
          </Link>
        </div>
      )}

      {/* 3. The latest review — set apart, because recency is what people trust */}
      {data.latestReview && (
        <section className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Latest review
          </p>
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-5">
            <ReviewBody review={data.latestReview} />
          </div>
        </section>
      )}

      {/* 4. Older reviews below, in a plain list, newest first */}
      {data.reviews.length > 0 && (
        <section className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Earlier reviews
          </p>
          <ul className="mt-2">
            {data.reviews.map((review) => (
              <li key={review.id} className="border-b border-stone-200 py-4">
                <ReviewBody review={review} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 5. The way in to write a review */}
      <Link
        href={`/review/${id}`}
        className="mt-10 inline-block text-sm font-medium text-amber-700 underline underline-offset-4 hover:text-amber-800"
      >
        Write a review →
      </Link>
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
          <p className="text-stone-400">Loading…</p>
        </main>
      }
    >
      <RestaurantScreen />
    </Suspense>
  );
}
