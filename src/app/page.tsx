import { redirect } from "next/navigation";

export default function Home() {
  redirect("/exit?tag_id=door_main&user_id=usr_123");
}
