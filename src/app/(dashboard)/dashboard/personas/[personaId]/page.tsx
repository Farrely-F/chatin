import { AnimatedCard } from "@/components/ui/animated-card";
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { VerticalSeparator } from "@/components/ui/separator";
import PersonaDetailsView from "@/features/personas/persona-details";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAllAgents } from "@/service/agents";
import { getPersonaById } from "@/service/personas";
import { notFound } from "next/navigation";

export default async function PersonaPage({
  params,
}: {
  params: Promise<{ personaId: string }>;
}) {
  const { personaId } = await params;

  const user = await getCurrentUser();
  const personaDetails = await getPersonaById(personaId, user?.id || "");
  const agents = (await getAllAgents(user?.id || "")) || [];

  if ("error" in personaDetails) {
    notFound();
  }

  return (
    <PageLayout>
      <PageLayoutHeader>
        <div className="flex flex-wrap gap-2 items-center">
          <h1 className="text-2xl">{personaDetails.name}</h1>
          <VerticalSeparator className="hidden sm:block" />
          <p className="text-xs text-muted-foreground">
            Created :
            <br />
            {personaDetails.createdAt?.toDateString()}
          </p>
        </div>
      </PageLayoutHeader>
      <PageLayoutContent>
        {personaDetails.description && (
          <AnimatedCard
            title="Persona Description"
            description={personaDetails.description || ""}
          />
        )}
        <PersonaDetailsView
          personaDetails={personaDetails}
          userId={user?.id || ""}
          agents={agents}
        />
      </PageLayoutContent>
    </PageLayout>
  );
}
