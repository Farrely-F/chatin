import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { getApiKeys } from "@/service/api-key";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, Key } from "lucide-react";

import ApiKeyAction from "./api-key-action";

export async function ApiKeysList({ userId }: { userId: string }) {
  const apiKeys = await getApiKeys(userId);

  return (
    <div className="@container space-y-4">
      {apiKeys?.length === 0 ? (
        <div className="@container border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            You haven&apos;t created any API keys yet.
          </p>
        </div>
      ) : (
        apiKeys?.map((apiKey) => (
          <Card key={apiKey.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate">
                      {apiKey.name || "Unnamed Key"}
                    </span>
                    {apiKey.revoked && (
                      <Badge variant="destructive" className="ml-2">
                        Revoked
                      </Badge>
                    )}
                    {!apiKey.revoked &&
                      apiKey.expiresAt &&
                      new Date(apiKey.expiresAt) < new Date() && (
                        <Badge variant="outline" className="ml-2">
                          Expired
                        </Badge>
                      )}
                  </div>

                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      Created{" "}
                      {formatDistanceToNow(new Date(apiKey.createdAt || ""), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {apiKey.expiresAt && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {new Date(apiKey.expiresAt) > new Date() ? (
                        <span>
                          Expires{" "}
                          {formatDistanceToNow(new Date(apiKey.expiresAt), {
                            addSuffix: true,
                          })}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          Expired{" "}
                          {formatDistanceToNow(new Date(apiKey.expiresAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {apiKey?.scopes?.map((scope) => (
                        <Badge
                          key={scope}
                          variant="secondary"
                          className="text-xs"
                        >
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2 p-3 pt-0">
              {!apiKey.revoked && (
                <ApiKeyAction action="revoke" id={apiKey.id} />
              )}
              <ApiKeyAction action="delete" id={apiKey.id} />
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  );
}
