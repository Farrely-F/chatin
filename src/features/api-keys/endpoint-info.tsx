import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllAgentsByUserId } from "@/service/agents";
import type { User } from "next-auth";

export async function EndpointInfo({ user }: { user: User }) {
  const agents = await getAllAgentsByUserId(user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Endpoints</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
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
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
              {user.email}
            </code>
          </div>
        </div>

        <Tabs defaultValue="chat">
          <TabsList className="mb-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Chat Endpoint
              </div>
              <div className="flex items-center gap-2">
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                  https://{`{{host}}`}/api/v1/:agentId/public/chat/
                  {"<stream/text>"}
                </code>
                <CopyButton value="https://api.yourdomain.com/v1/chat" />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Example Request
              </div>
              <CodeBlock
                language="javascript"
                value={`
// Response method is stream/text
fetch('https://{{host}}/api/v1/agents/:agentId/public/chat/:responseMethod', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello, AI agent!' }
    ],
    user_id: '${user.id}'
  })
})
`}
              />
            </div>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              All Agents
            </p>
            <div className="flex items-center gap-2">
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                https://api.yourdomain.com/v1/agents
              </code>
              <CopyButton value={"https://api.yourdomain.com/v1/agents"} />
            </div>

            <ScrollArea>
              {Array.isArray(agents) && agents.length > 0 ? (
                <>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Your Agents
                  </div>
                  <div className="space-y-3">
                    {agents?.map((agent) => (
                      <div
                        key={agent.id}
                        className="bg-gray-100 rounded-md p-3"
                      >
                        <div className="font-medium mb-1">{agent.name}</div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {agent.description}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-xs">Agent ID:</p>
                          <code className="relative rounded border bg-sidebar/5 px-[0.3rem] py-[0.2rem] font-mono text-xs">
                            {agent.id}
                          </code>
                          <CopyButton value={agent.id} />
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs">Endpoint:</p>
                          <code className="relative rounded border bg-sidebar/5 px-[0.3rem] py-[0.2rem] font-mono text-xs">
                            https://{`{{host}}`}/api/v1/agents/{agent.id}
                          </code>
                          <CopyButton
                            value={`https://api.yourdomain.com/v1/agents/${agent.id}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  You haven&apos;t created any agents yet.
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
