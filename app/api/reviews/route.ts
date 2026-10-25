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

  // 2. A written review is REQUIRED as of the product decision to make
  //    it mandatory — a rating alone is no longer enough for NEW reviews.
  //    (The database still keeps old rating-only rows exactly as they are;
  //    nothing about the schema or stored data changes.)
  //    First shape: it must be text if it arrives at all. Then content:
  //    after trimming spaces it must still have at least one character.
  const commentValue = (body as { comment?: unknown }).comment;
  if (commentValue === undefined || commentValue === null) {
    return Response.json(
      { error: "Please write a short review — a rating alone isn't enough." },
      { status: 400 }
    );
  }
  if (typeof commentValue !== "string") {
    return Response.json(
      { error: "Please write your review using letters." },
      { status: 400 }
    );
  }
  const comment = commentValue.trim();
  if (comment.length === 0) {
    return Response.json(
      { error: "Please write a short review — a rating alone isn't enough." },
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
    [restaurantId, rating, comment]
  );
  const inserted = insertedRows[0];

  return Response.json(
    { success: true, reviewId: inserted.id },
    { status: 201 }
  );
}
