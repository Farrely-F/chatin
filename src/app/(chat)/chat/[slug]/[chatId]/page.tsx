import Chat from "@/features/public-chat/chat";
import { PageHeader } from "@/features/public-chat/header";
import { requireAuth } from "@/lib/auth/auth-guard";
import { getAgentBySlug } from "@/service/agents";
import { redirect } from "next/navigation";

export default async function PublicChatPage({
  params,
}: {
  params: Promise<{ slug: string; chatId: string }>;
}) {
  const { slug, chatId } = await params;

  await requireAuth(`/api/auth/signin?callbackUrl=/chat/${slug}/${chatId}`);

  const agent = await getAgentBySlug(slug);

  if ("error" in agent || agent.status === "archived") {
    return redirect("/404");
  }

  return (
    <>
      <PageHeader title={agent.name} />
      <Chat agentDetails={agent} />
    </>
  );
}
