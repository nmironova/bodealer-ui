import { requireSession } from "./lib/auth/request";
import { redirect } from "next/navigation";

export default async function HomePage() {
  await requireSession();
  redirect("/dashboard");
}
