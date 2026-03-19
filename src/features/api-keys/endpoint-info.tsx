import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllAgentsByUserId } from "@/service/agents";
import type { User } from "next-auth";
import { headers } from "next/headers";

const DEFAULT_LOCAL_URL = "http://localhost:3000";
const CHAT_RESPONSE_METHODS = ["stream", "text"] as const;

type ChatResponseMethod = (typeof CHAT_RESPONSE_METHODS)[number];

function getBaseUrlFromHeaders(inputHeaders: Headers) {
  const forwardedProto = inputHeaders.get("x-forwarded-proto");
  const forwardedHost = inputHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? inputHeaders.get("host");

  if (!host) {
    return DEFAULT_LOCAL_URL;
  }

  const protocol =
    forwardedProto ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

function getChatFetchPreview({
  baseUrl,
  userId,
  responseMethod,
}: {
  baseUrl: string;
  userId: string;
  responseMethod: ChatResponseMethod;
}) {
  if (responseMethod === "stream") {
    return `
const response = await fetch('${baseUrl}/api/v1/agents/:agentId/public/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        parts: [
          { type: 'text', text: 'Hello, AI agent!' }
        ]
      }
    ],
    user_id: '${userId}'
  })
});

if (!response.ok) {
  throw new Error('Streaming request failed');
}

// Stream response via response.body (ReadableStream)
const reader = response.body?.getReader();
`;
  }

  return `
const response = await fetch('${baseUrl}/api/v1/agents/:agentId/public/chat/text', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        parts: [
          { type: 'text', text: 'Hello, AI agent!' }
        ]
      }
    ],
    user_id: '${userId}'
  })
});

if (!response.ok) {
  throw new Error('Text request failed');
}

const data = await response.json();
console.log(data.messages);
`;
}

function getChatCurlPreview({
  baseUrl,
  userId,
  responseMethod,
}: {
  baseUrl: string;
  userId: string;
  responseMethod: ChatResponseMethod;
}) {
  return String.raw`
curl -X POST "${baseUrl}/api/v1/agents/:agentId/public/chat/${responseMethod}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "parts": [
          { "type": "text", "text": "Hello, AI agent!" }
        ]
      }
    ],
    "user_id": "${userId}"
  }'
`;
}

function getAgentChatCurlPreview({
  baseUrl,
  userId,
  agentId,
  responseMethod,
}: {
  baseUrl: string;
  userId: string;
  agentId: string;
  responseMethod: ChatResponseMethod;
}) {
  return String.raw`
curl -X POST "${baseUrl}/api/v1/agents/${agentId}/public/chat/${responseMethod}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "parts": [
          { "type": "text", "text": "Hello, AI agent!" }
        ]
      }
    ],
    "user_id": "${userId}"
  }'
`;
}

export async function EndpointInfo({ user }: Readonly<{ user: User }>) {
  const requestHeaders = await headers();
  const baseUrl = getBaseUrlFromHeaders(requestHeaders);
  const agents = await getAllAgentsByUserId(user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Endpoints</CardTitle>
      </CardHeader>
      <CardContent className="@container">
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
            <Tabs defaultValue="stream" className="gap-0">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Response Method
                </div>
                <TabsList className="h-14 p-2 w-full max-w-xs rounded-none rounded-t-xl -mb-2 pb-4">
                  <TabsTrigger value="stream">Stream</TabsTrigger>
                  <TabsTrigger value="text">Text</TabsTrigger>
                </TabsList>
              </div>

              {CHAT_RESPONSE_METHODS.map((responseMethod) => (
                <TabsContent
                  key={responseMethod}
                  value={responseMethod}
                  className="space-y-4 border rounded-lg p-4 bg-background"
                >
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Chat Endpoint
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="overflow-x-auto">
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm whitespace-nowrap">
                          {baseUrl}/api/v1/agents/:agentId/public/chat/
                          {responseMethod}
                        </code>
                      </div>
                      <CopyButton
                        value={`${baseUrl}/api/v1/agents/:agentId/public/chat/${responseMethod}`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Example Request (UIMessage Format)
                    </div>
                    <CodeBlock
                      language="javascript"
                      value={getChatFetchPreview({
                        baseUrl,
                        userId: user.id,
                        responseMethod,
                      })}
                    />
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      cURL Preview
                    </div>
                    <CodeBlock
                      language="bash"
                      value={getChatCurlPreview({
                        baseUrl,
                        userId: user.id,
                        responseMethod,
                      })}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              All Agents
            </p>
            <div className="flex items-center gap-2">
              <div className="overflow-x-auto">
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                  {baseUrl}/api/v1/agents
                </code>
              </div>
              <CopyButton value={`${baseUrl}/api/v1/agents`} />
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                cURL Preview
              </div>
              <CodeBlock
                language="bash"
                value={String.raw`
curl -X GET "${baseUrl}/api/v1/agents" \
  -H "Authorization: Bearer YOUR_API_KEY"
`}
              />
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
                            {baseUrl}/api/v1/agents/{agent.id}
                          </code>
                          <CopyButton
                            value={`${baseUrl}/api/v1/agents/${agent.id}`}
                          />
                        </div>

                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Chat cURL by Response Method
                          </p>
                          <Tabs defaultValue="stream">
                            <TabsList className="h-8">
                              <TabsTrigger value="stream">Stream</TabsTrigger>
                              <TabsTrigger value="text">Text</TabsTrigger>
                            </TabsList>

                            {CHAT_RESPONSE_METHODS.map((responseMethod) => {
                              const agentChatCurlPreview =
                                getAgentChatCurlPreview({
                                  baseUrl,
                                  userId: user.id,
                                  agentId: agent.id,
                                  responseMethod,
                                });

                              return (
                                <TabsContent
                                  key={`${agent.id}-${responseMethod}`}
                                  value={responseMethod}
                                >
                                  <CodeBlock
                                    language="bash"
                                    value={agentChatCurlPreview}
                                  />
                                </TabsContent>
                              );
                            })}
                          </Tabs>
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
