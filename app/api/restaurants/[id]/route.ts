import { loadRestaurantData } from "@/lib/restaurant-data";

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

  // One shared loader builds the full screen-shaped answer (restaurant
  // row, computed COUNT/AVG, latest review, the rest). Same source of
  // truth the server-rendered page uses, so both always agree.
  const data = await loadRestaurantData(id);
  if (!data) {
    return Response.json(
      { error: "Restaurant not found." },
      { status: 404 }
    );
  }
  return Response.json(data);
}
