// The server loads the restaurant's name BEFORE the form is sent, so the
// heading is already in the HTML when it arrives — no spinner, no extra
// browser fetch to /api/restaurants/[id]. Unknown restaurants get the same
// not-here message as the restaurant page. Data access lives inside
// <Suspense> (Cache Components project): shell first, form streams after.
import { Suspense } from "react";
import { connection } from "next/server";
import { loadRestaurantName } from "@/lib/restaurant-data";
import ReviewScreen from "./review-screen";

// One database lookup (name only — no counts, no reviews), fresh every visit.
async function ReviewScreenLoader({
  paramsPromise,
}: {
  paramsPromise: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await paramsPromise;
  await connection(); // never serve a cached 404/restaurant name
  const id = Number(restaurantId);
  const name = Number.isInteger(id) ? await loadRestaurantName(id) : null;

  if (!name) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-6 py-12">
        <p className="text-lg">There is no restaurant here.</p>
      </main>
    );
  }

  // A key unique to THIS visit. If the client router ever re-serves this
  // page from its cache and then revalidates, a changed key forces React to
  // remount the form fresh — old stars, old text and "Saving…" cannot carry
  // over even in principle.
  const visitKey = crypto.randomUUID();

  return <ReviewScreen key={visitKey} restaurantId={restaurantId} restaurantName={name} />;
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[560px] px-6 py-12">
          <p className="text-neutral-400">Loading…</p>
        </main>
      }
    >
      <ReviewScreenLoader paramsPromise={params} />
    </Suspense>
  );
}
