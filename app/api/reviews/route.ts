import { rows } from "@/lib/db";

// The backend validates in this order and stops at the first failure,
// because a request only ever needs to be told about one problem at a time.

export async function POST(request: Request) {
  // 0. The body must be readable JSON at all.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  // 1. Rating must be a whole number between 1 and 5.
  //    Number.isInteger rejects 4.5, 500, "4" (a string) and undefined alike.
  const rating = (body as { rating?: unknown }).rating;
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return Response.json(
      { error: "Rating must be a whole number between 1 and 5." },
      { status: 400 }
    );
  }

  // 2. Comment must be text with something left after trimming whitespace.
  const comment = (body as { comment?: unknown }).comment;
  if (typeof comment !== "string" || comment.trim().length === 0) {
    return Response.json(
      { error: "Comment cannot be empty." },
      { status: 400 }
    );
  }

  // 3. The restaurant must actually exist — this is the database lookup.
  //    A non-integer id fails this same check: no such restaurant exists.
  const restaurantId = (body as { restaurantId?: unknown }).restaurantId;
  if (typeof restaurantId !== "number" || !Number.isInteger(restaurantId)) {
    return Response.json(
      { error: "This restaurant does not exist." },
      { status: 400 }
    );
  }
  const matches = await rows<{ id: number }>(
    "SELECT id FROM restaurants WHERE id = $1",
    [restaurantId]
  );
  if (matches.length === 0) {
    return Response.json(
      { error: "This restaurant does not exist." },
      { status: 400 }
    );
  }

  // 4. All checks passed: write exactly one row of fact into the database.
  //    RETURNING id lets the database tell us which row it created.
  const insertedRows = await rows<{ id: number }>(
    "INSERT INTO reviews (restaurant_id, rating, comment) VALUES ($1, $2, $3) RETURNING id",
    [restaurantId, rating, comment.trim()]
  );
  const inserted = insertedRows[0];

  return Response.json(
    { success: true, reviewId: inserted.id },
    { status: 201 }
  );
}
