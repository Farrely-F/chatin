import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { PulseCard } from "@/components/ui/pulse-card";
import DeletePersona from "@/features/personas/delete-persona";
import PersonaCreation from "@/features/personas/persona-creation";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAllPersonas } from "@/service/personas";
import { UserPenIcon, UserRound } from "lucide-react";
import Link from "next/link";

export default async function PersonasPage() {
  const user = await getCurrentUser();

  const personas = await getAllPersonas(user?.id || "");

  return (
    <PageLayout>
      <PageLayoutHeader className="flex items-center justify-between bg-white py-4 z-40">
        <h1 className="text-2xl">Personas</h1>
        <PersonaCreation userId={user?.id || ""} />
      </PageLayoutHeader>
      <PageLayoutContent>
        {personas.length === 0 ? (
          <div className="flex flex-col gap-2 border rounded-lg items-center justify-center h-[80%]">
            <UserPenIcon className="text-muted-foreground block size-18" />
            <p className="text-muted-foreground text-sm">
              Create your first persona
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4 items-stretch">
            {personas?.map((persona) => (
              <Link href={`/dashboard/personas/${persona.id}`} key={persona.id}>
                <PulseCard
                  actionButton={
                    <DeletePersona
                      userId={user?.id || ""}
                      personaId={persona.id}
                      className="absolute top-4 right-2"
                    />
                  }
                  icon={<UserRound />}
                  title={persona.name}
                  description={persona.description!}
                  variant={"blue"}
                  className="border w-full h-full"
                />
              </Link>
            ))}
          </div>
        )}
      </PageLayoutContent>
    </PageLayout>
  );
}
