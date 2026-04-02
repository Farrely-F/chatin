import Chat from "@/components/ui/chat";
import {
  PageLayout,
  PageLayoutContent,
} from "@/components/ui/layout/page-layout";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAgentById } from "@/service/agents";
import { getAllModels } from "@/service/model";
import { getUserOrganizations } from "@/service/organizations";
import { getAllPersonas } from "@/service/personas";
import { notFound } from "next/navigation";

export default async function PlayGroundChatPage({
  params,
}: Readonly<{
  params: Promise<{ agentId: string }>;
}>) {
  const { agentId } = await params;

  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  const [agentConfig, models, personas, organizations] = await Promise.all([
    getAgentById(agentId, user.id),
    getAllModels(),
    getAllPersonas(user.id),
    getUserOrganizations(user.id),
  ]);

  if ("error" in agentConfig) {
    notFound();
  }

  return (
    <PageLayout>
      <PageLayoutContent className="py-0">
        <Chat
          personas={personas}
          agentDetails={agentConfig}
          userId={user.id}
          models={models}
          organizations={organizations}
        />
      </PageLayoutContent>
    </PageLayout>
  );
}
