import { requireAuth } from "@/lib/auth/auth-guard";
import { getAgentBySlugForUser } from "@/service/agents";
import { generateId } from "ai";
import { redirect } from "next/navigation";

export default async function PublicChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await requireAuth(`/api/auth/signin?callbackUrl=/chat/${slug}`);

  const agent = await getAgentBySlugForUser(slug, user.id);

  if ("error" in agent || agent.status === "archived") {
    return redirect("/404");
  }

  redirect(`/chat/${slug}/${generateId()}`);
}
