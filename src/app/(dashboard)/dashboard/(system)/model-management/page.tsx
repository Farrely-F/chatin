import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { ModelManagement } from "@/features/models-config/model-management";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAllModels } from "@/service/model";
import {
  getEmbeddingModelIdSetting,
  getEmbeddingProviderSetting,
} from "@/service/system-settings";

export default async function ModelManagementPage() {
  const [user, models, embeddingProvider, embeddingModelId] = await Promise.all(
    [
      getCurrentUser(),
      getAllModels(),
      getEmbeddingProviderSetting(),
      getEmbeddingModelIdSetting(),
    ],
  );

  return (
    <PageLayout className="container mx-auto">
      <PageLayoutHeader className="space-y-2 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Model Management</h1>
        <p className="text-muted-foreground">Manage your LLM models</p>
      </PageLayoutHeader>
      <PageLayoutContent className="@container mx-auto">
        <ModelManagement
          userId={user?.id || ""}
          models={models}
          embeddingProvider={embeddingProvider}
          embeddingModelId={embeddingModelId}
        />
      </PageLayoutContent>
    </PageLayout>
  );
}
