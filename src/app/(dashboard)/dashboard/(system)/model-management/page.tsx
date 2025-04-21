import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { ModelManagement } from "@/features/models-config/model-management";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAllModels } from "@/service/model";

export default async function ModelManagementPage() {
  const user = await getCurrentUser();
  const models = await getAllModels();

  return (
    <PageLayout className="container mx-auto">
      <PageLayoutHeader className="space-y-2 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Model Management</h1>
        <p className="text-muted-foreground">Manage your LLM models</p>
      </PageLayoutHeader>
      <PageLayoutContent>
        <ModelManagement userId={user?.id || ""} models={models} />
      </PageLayoutContent>
    </PageLayout>
  );
}
