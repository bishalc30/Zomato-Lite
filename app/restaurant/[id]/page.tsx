"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const RED = "#E23744";
const GREEN = "#267E3E";

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

// Presentation-only: a rating number as text symbols.
function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

// Presentation-only: turns a timestamp into "4m ago" style text.
function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// A review card. If a review has no text, only the rating row shows —
// no empty space.
function ReviewCard({
  review,
  highlighted,
}: {
  review: Review;
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "relative rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          : "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      }
      style={highlighted ? { borderLeft: `4px solid ${GREEN}` } : undefined}
    >
      {highlighted && (
        <span
          className="absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: GREEN }}
        >
          Latest
        </span>
      )}
      <div className="flex items-center justify-between">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-white"
          style={{ backgroundColor: GREEN }}
        >
          {review.rating}
        </span>
        <span className="text-xs text-neutral-400">
          {timeAgo(review.createdAt)}
        </span>
      </div>
      {review.comment && (
        <p className="mt-2 text-[15px] leading-relaxed">{review.comment}</p>
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

  // "LB" — initials from the name's first letters. Display logic, not maths.
  const initials = data.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  // The average is printed exactly as the backend computed it. No maths here.
  const averageText = data.averageRating ?? "—";

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 pb-6 pt-6">
      {/* Restaurant info, inside one white card with a soft shadow */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-md">
        {/* Red banner with a subtle dot pattern and big initials */}
        <div
          className="flex h-28 items-center justify-center"
          style={{
            backgroundColor: RED,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.28) 1.5px, transparent 1.5px)",
            backgroundSize: "14px 14px",
          }}
        >
          <span className="text-6xl font-extrabold tracking-tight text-white">
            {initials}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {data.name}
              </h1>
              <p className="mt-0.5 text-sm text-neutral-500">{data.area}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                  {data.cuisine}
                </span>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                  Dine-in
                </span>
              </div>
            </div>

            {/* Average rating: green badge, white bold number, "/5" below */}
            <div
              className="flex shrink-0 flex-col items-center rounded-xl px-4 py-3 text-white"
              style={{ backgroundColor: GREEN }}
            >
              <span className="text-3xl font-extrabold leading-none">
                {averageText}
              </span>
              <span className="mt-1 text-xs font-semibold opacity-80">/5</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-400">
            Based on {data.totalReviews}{" "}
            {data.totalReviews === 1 ? "review" : "reviews"}
          </p>
        </div>
      </section>

      {/* Empty state: nothing yet. Invite the first review. */}
      {data.totalReviews === 0 && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 text-center shadow-sm">
          <p className="text-[15px] font-bold">No reviews yet</p>
          <p className="mt-1 text-sm text-neutral-500">
            Nobody has eaten here in the app before. Be the first to say how it
            was.
          </p>
        </div>
      )}

      {/* Latest review: white card with a green left accent and a pill tag */}
      {data.latestReview && (
        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            Latest review
          </p>
          <div className="mt-3">
            <ReviewCard review={data.latestReview} highlighted />
          </div>
        </section>
      )}

      {/* Earlier reviews: plain white rounded cards, newest first */}
      {data.reviews.length > 0 && (
        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
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

      {/* Sticky at the bottom of the screen, always visible while scrolling */}
      <div className="sticky bottom-4 z-10 mt-10">
        <Link
          href={`/review/${id}`}
          className="block w-full rounded-xl px-4 py-3.5 text-center text-base font-extrabold text-white shadow-lg transition-transform hover:scale-[1.01]"
          style={{ backgroundColor: RED }}
        >
          Write a Review
        </Link>
      </div>
    </div>
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
