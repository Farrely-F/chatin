import { Input } from "@/components/ui/input";
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import ApiKeysManagement from "@/features/api-keys/api-keys-management";
import { getCurrentUser } from "@/lib/auth/auth";

export default async function ApiKeysPage() {
  const user = await getCurrentUser();

  return (
    <PageLayout>
      <PageLayoutHeader className="space-y-2 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Developer Options</h1>
        <p className="text-muted-foreground">Manage your credentials</p>
      </PageLayoutHeader>
      <PageLayoutContent className="container mx-auto space-y-4">
        <ApiKeysManagement />
      </PageLayoutContent>
    </PageLayout>
  );
}
