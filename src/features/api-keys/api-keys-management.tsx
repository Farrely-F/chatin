import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/auth";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ApiKeysList } from "./api-keys-list";
import { CreateApiKeyForm } from "./create-api-key";
import { EndpointInfo } from "./endpoint-info";

export default async function ApiKeysManagement() {
  const user = await getCurrentUser();

  if (!user) {
    return notFound();
  }

  return (
    <>
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <div className="w-full">
            <EndpointInfo user={user} />
          </div>
        </TabsContent>
        <TabsContent value="api-keys" className="space-y-4">
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold mb-4">Create New API Key</h2>
              <CreateApiKeyForm userId={user?.id} />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Your API Keys</h2>
              <Suspense fallback={<ApiKeysListSkeleton />}>
                <ApiKeysList userId={user?.id} />
              </Suspense>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function ApiKeysListSkeleton() {
  return (
    <div className="space-y-3">
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
    </div>
  );
}
