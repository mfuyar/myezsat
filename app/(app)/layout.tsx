import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageDock from "@/components/messages/MessageDock";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      {children}
      <MessageDock />
    </>
  );
}
