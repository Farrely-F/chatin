import { AnimatedCard } from "@/components/ui/animated-card";
import DashboardLayout from "@/components/ui/layout/dashboard-layout";
import { getCurrentUser } from "@/lib/auth/auth";
import { getUserStatistics } from "@/service/dashboard-report";

export default async function DashboardPage() {
  const session = await getCurrentUser();

  const report = await getUserStatistics(session?.id || "");

  return (
    <DashboardLayout>
      <div className="py-4 mb-2">
        <h1 className="text-3xl">Welcome, {session?.name}</h1>
        <p className="text-muted-foreground">
          take a look on your brief summary:
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <AnimatedCard
          withArrow
          title="Created Agents:"
          className="min-h-40"
          navigateTo="/dashboard/agents"
        >
          <div className="flex items-end justify-end h-full pb-10">
            <p className="text-muted-foreground font-bold text-3xl mt-auto">
              {report?.totalAgents}
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard title="Most used LLM Provider:" className="min-h-40">
          <div className="flex items-end justify-end h-full pb-10">
            <p className="text-muted-foreground font-bold text-3xl mt-auto capitalize">
              {report?.mostUsedModel?.modelProvider || "None"}
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard
          title=""
          className="min-h-40 col-span-2"
          description="ChatIn is an innovative AI-powered chat platform that enables seamless communication between users and customizable AI agents. Create, manage and interact with intelligent chatbots tailored to your specific needs."
        ></AnimatedCard>
      </div>
    </DashboardLayout>
  );
}
