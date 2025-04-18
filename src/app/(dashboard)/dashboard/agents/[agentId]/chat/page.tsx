import Chat from "@/components/ui/chat";
import {
  PageLayout,
  PageLayoutContent,
} from "@/components/ui/layout/page-layout";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAgentById } from "@/service/agents";
import { notFound } from "next/navigation";

export default async function PlayGroundChatPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  const agentConfig = await getAgentById(agentId, user.id);

  if ("error" in agentConfig) {
    notFound();
  }

  return (
    <PageLayout>
      <PageLayoutContent className="py-0">
        <Chat agentDetails={agentConfig} userId={user.id} />
      </PageLayoutContent>
    </PageLayout>
  );
}
