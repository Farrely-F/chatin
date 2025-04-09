// app/api/agents/route.ts
import { db } from "@/db";
import { agents } from "@/db/schema";
import { agentFormSchema } from "@/schema/agent-schema";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = agentFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  //   const session = await auth(); // You can use your own method
  //   if (!session?.user) {
  //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  //   }

  // TODO: IMPLEMENT AUTH
  const userId = "user-id";

  const newAgent = {
    id: nanoid(),
    userId,
    ...parsed.data,
  };

  try {
    await db.insert(agents).values(newAgent);
    return NextResponse.json({ success: true, agent: newAgent });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 },
    );
  }
}
