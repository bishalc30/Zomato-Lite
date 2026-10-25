import { rows } from "@/lib/db";

// What the restaurant screen needs. The API route and the server-rendered
// pages both call the loaders below, so the screen's shape is defined ONCE
// and can never drift between "/api/restaurants/1" and "/restaurant/1".
export type Review = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type RestaurantData = {
  name: string;
  cuisine: string;
  area: string;
  averageRating: number | null;
  totalReviews: number;
  latestReview: Review | null;
  reviews: Review[];
};

// All the facts for one restaurant, shaped exactly like the screen:
// headline info, the computed rating answers, the latest review alone,
// then the rest. Returns null when the restaurant does not exist.
export async function loadRestaurantData(
  id: number
): Promise<RestaurantData | null> {
  // 1. Does the restaurant exist?
  const restaurantRows = await rows<{ name: string; cuisine: string; area: string }>(
    "SELECT name, cuisine, area FROM restaurants WHERE id = $1",
    [id]
  );
  const restaurant = restaurantRows[0];
  if (!restaurant) {
    return null;
  }

  // 2. The answers (never stored!): COUNT and AVG over the facts.
  //    AVG returns null when there are no rows — exactly the contract:
  //    averageRating null, totalReviews 0, latestReview null, reviews [].
  const statsRows = await rows<{ total: number; average: string | null }>(
    "SELECT COUNT(*)::int AS total, AVG(rating) AS average FROM reviews WHERE restaurant_id = $1",
    [id]
  );
  const stats = statsRows[0];
  const totalReviews: number = stats.total;
  // AVG comes back as Postgres "numeric" text (e.g. "4.33333"); parse and
  // round to one decimal place here in the backend, so the frontend never does maths.
  const averageRating =
    stats.average === null
      ? null
      : Math.round(Number(stats.average) * 10) / 10;

  // 3. All reviews, newest first. created_at DESC is "recency";
  //    id DESC only breaks ties when two reviews share the exact same timestamp,
  //    so the order is always predictable.
  const reviewRows = await rows<{
    id: number;
    rating: number;
    comment: string;
    created_at: string | Date;
  }>(
    "SELECT id, rating, comment, created_at FROM reviews WHERE restaurant_id = $1 ORDER BY created_at DESC, id DESC",
    [id]
  );

  const toReview = (row: {
    id: number;
    rating: number;
    comment: string;
    created_at: string | Date;
  }) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
  });

  // 4. Shape it like the screen. The latest is *excluded* from the list
  //    below so it is never printed twice.
  return {
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    area: restaurant.area,
    averageRating,
    totalReviews,
    latestReview: reviewRows.length > 0 ? toReview(reviewRows[0]) : null,
    reviews: reviewRows.slice(1).map(toReview),
  };
}

// The review screen only needs the restaurant's name (and to know whether
// the restaurant exists at all) — no counts, no reviews. One lookup instead
// of three, so opening the form is as light as it can be.
export async function loadRestaurantName(
  id: number
): Promise<string | null> {
  const restaurantRows = await rows<{ name: string }>(
    "SELECT name FROM restaurants WHERE id = $1",
    [id]
  );
  return restaurantRows[0]?.name ?? null;
}
