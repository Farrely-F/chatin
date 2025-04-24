import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import type { User } from "next-auth";

export async function AccountDetails({ user }: { user: User }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Account Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Account ID
          </div>
          <div className="flex items-center gap-2">
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
              {user.id}
            </code>
            <CopyButton value={user.id} />
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Email
          </div>
          <Badge variant="secondary" className="font-medium">
            {user.email}
          </Badge>
        </div>

        <div>
          {/* <div className="text-sm font-medium text-muted-foreground mb-1">Rate Limits</div>
          <div className="text-sm">
            <span className="font-medium">{user.rateLimit.requests}</span> requests per{" "}
            <span className="font-medium">{user.rateLimit.period}</span>
          </div> */}
        </div>
      </CardContent>
    </Card>
  );
}
