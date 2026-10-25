import { sql } from "@/lib/db";

export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/restaurants/[id]'>
) {
  // The [id] in the URL arrives as text ("1"), never as a number —
  // URLs are always strings. Convert it, and if it was never a number
  // (e.g. /api/restaurants/abc) there is no such restaurant → 404.
  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return Response.json(
      { error: "Restaurant not found." },
      { status: 404 }
    );
  }

  // 1. Does the restaurant exist?
  const [restaurant] = await sql.query(
    "SELECT name, cuisine, area FROM restaurants WHERE id = $1",
    [id]
  );
  if (!restaurant) {
    return Response.json(
      { error: "Restaurant not found." },
      { status: 404 }
    );
  }

  // 2. The answers (never stored!): COUNT and AVG over the facts.
  //    AVG returns null when there are no rows — exactly the contract:
  //    averageRating null, totalReviews 0, latestReview null, reviews [].
  const [stats] = await sql.query(
    "SELECT COUNT(*)::int AS total, AVG(rating) AS average FROM reviews WHERE restaurant_id = $1",
    [id]
  );
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
  const rows = await sql.query(
    "SELECT id, rating, comment, created_at FROM reviews WHERE restaurant_id = $1 ORDER BY created_at DESC, id DESC",
    [id]
  );

  const toReview = (row: {
    id: number;
    rating: number;
    comment: string;
    created_at: Date | string;
  }) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
  });

  // 4. Shape the response like the screen: restaurant, big rating,
  //    the latest review alone, then the rest. The latest is *excluded*
  //    from the list below so it is never printed twice.
  return Response.json({
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    area: restaurant.area,
    averageRating,
    totalReviews,
    latestReview: rows.length > 0 ? toReview(rows[0]) : null,
    reviews: rows.slice(1).map(toReview),
  });
}
