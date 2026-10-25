import { redirect } from "next/navigation";

// The homepage is not a screen in this product — it immediately
// hands visitors to the one restaurant we care about.
export default function Home() {
  redirect("/restaurant/1");
}
