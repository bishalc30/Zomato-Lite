// This screen renders ON THE SERVER, once per request: the page HTML arrives
// with the restaurant's facts already printed in it (name, average, count,
// reviews). No browser fetch and no extra API round trip — the old client
// version made the browser download HTML, then JavaScript, then call
// /api/restaurants/[id]. All of that collapses into one request here.
//
// This project runs with Cache Components, so all data access lives inside
// <Suspense>: the page shell answers immediately, and the real facts (rendered
// at request time — never from a stale cache, thanks to `connection()`)
// stream in on the same connection.
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { loadRestaurantData } from "@/lib/restaurant-data";

const RED = "#E23744";
const GREEN = "#267E3E";

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
};

// Presentation-only: a timestamp as a short date ("25 Oct").
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// Presentation-only: one review's rating as 5 small stars — filled in the
// green accent, empty in light grey. Used in the list AND the latest card.
function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="text-sm leading-none"
          style={{ color: i <= rating ? GREEN : "#D4D4D4" }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// The stars · date line every review ends with (even ones with no text).
function MetaLine({ review }: { review: Review }) {
  return (
    <div className="mt-2.5 flex items-center gap-2">
      <StarRow rating={review.rating} />
      <span className="text-xs text-neutral-300">·</span>
      <span className="text-xs text-neutral-400">
        {formatDate(review.createdAt)}
      </span>
    </div>
  );
}

// The URL's [id] arrives as text; await it, convert it, and load every fact
// with the SAME loader the API route uses — one source of truth.
async function RestaurantScreen({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id: idParam } = await paramsPromise;
  await connection(); // never serve a cached copy of ratings/reviews
  const id = Number(idParam);
  const data = Number.isInteger(id) ? await loadRestaurantData(id) : null;

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-6 py-12">
        <p className="text-lg">There is no restaurant here.</p>
      </main>
    );
  }

  // The average is printed exactly as the backend computed it. No maths here.
  const averageText = data.averageRating ?? "—";

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 pb-6 pt-6">
      {/* Restaurant info card. The photo is the background of the WHOLE card.
          All restaurant info sits stacked at the BOTTOM-LEFT; the average
          rating sits as pure typography at the photo's top-right (next to the
          name's line, right-aligned). A gradient that is transparent until
          the bottom half keeps both readable. Image: burrito-hero.webp. */}
      <section className="relative min-h-[340px] overflow-hidden rounded-2xl shadow-md">
        <Image
          src="/burrito-hero.webp"
          alt="Two grilled burrito halves stacked on a wooden board, with melted cheese oozing out"
          fill
          priority
          sizes="560px"
          className="object-cover"
        />
        {/* Fully transparent at the top of the card; gets darker only in the
            bottom 50%, behind the stacked info. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.78) 100%)",
          }}
        />

        {/* Content layer. Bottom-left info stack; average right-aligned on
            the name's line. (The old green badge box is replaced by pure
            type: big green number + baseline "/5" + small review count.) */}
        <div className="relative flex min-h-[340px] flex-col p-5">
          <div className="mt-auto">
            <div className="flex items-end justify-between gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                {data.name}
              </h1>

              {/* Typographic average — no box, no background. A faint dark
                  glow keeps the green readable over the bright photo. */}
              <div className="flex shrink-0 flex-col items-end">
                <div className="flex items-baseline">
                  <span
                    className="text-4xl font-extrabold leading-none tracking-tight sm:text-5xl"
                    style={{ color: GREEN, textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}
                  >
                    {averageText}
                  </span>
                  <span
                    className="ml-0.5 text-lg font-semibold leading-none text-white/70"
                    style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}
                  >
                    /5
                  </span>
                </div>
                <p
                  className="mt-1.5 text-xs font-medium text-white/70"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.45)" }}
                >
                  {data.totalReviews}{" "}
                  {data.totalReviews === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>

            {/* Location */}
            <p className="mt-2 text-sm text-white/85">{data.area}</p>

            {/* Cuisine tags: semi-transparent white chips, frosted glass */}
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/40 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {data.cuisine}
              </span>
              <span className="rounded-full border border-white/40 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                Dine-in
              </span>
            </div>
          </div>
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

      {/* Latest review: kept as the highlighted card (green left accent,
          white box, pill tag) — but its body now uses the same review-text-
          then stars · date line as the list, for consistency. */}
      {data.latestReview && (
        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            Latest review
          </p>
          <div
            className="relative mt-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            style={{ borderLeft: `4px solid ${GREEN}` }}
          >
            <span
              className="absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: GREEN }}
            >
              Latest
            </span>
            {data.latestReview.comment && (
              <p className="mt-3 text-[17px] leading-relaxed text-neutral-900">
                {data.latestReview.comment}
              </p>
            )}
            <MetaLine review={data.latestReview} />
          </div>
        </section>
      )}

      {/* Earlier reviews: a clean, borderless list separated by thin
          light-grey dividers. Review text first (larger, dark), then the
          stars · date line. Reviews with no text show only that line. */}
      {data.reviews.length > 0 && (
        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            Earlier reviews
          </p>
          <ul className="mt-3 divide-y divide-neutral-200">
            {data.reviews.map((review) => (
              <li key={review.id} className="py-5 first:pt-3 last:pb-0">
                {review.comment && (
                  <p className="text-[17px] leading-relaxed text-neutral-900">
                    {review.comment}
                  </p>
                )}
                <MetaLine review={review} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sticky at the bottom of the screen, always visible while scrolling */}
      <div className="sticky bottom-4 z-10 mt-10">
        <Link
          href={`/review/${idParam}`}
          className="block w-full rounded-xl px-4 py-3.5 text-center text-base font-extrabold text-white shadow-lg transition-transform hover:scale-[1.01]"
          style={{ backgroundColor: RED }}
        >
          Write a Review
        </Link>
      </div>
    </div>
  );
}

// The shell (header, loading box) prerenders; the URL parameter and the
// database facts resolve and stream in once the request actually arrives.
export default function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[560px] px-6 py-12">
          <p className="text-neutral-400">Loading…</p>
        </main>
      }
    >
      <RestaurantScreen paramsPromise={params} />
    </Suspense>
  );
}
