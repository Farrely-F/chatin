import Chat from "@/components/ui/public-chat/chat";
import { PageHeader } from "@/components/ui/public-chat/header";
import { getAgentBySlug } from "@/service/agents";
import { redirect } from "next/navigation";

export default async function PublicChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
