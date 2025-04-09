// app/api/agents/[id]/route.ts
import { db } from "@/db";
import { agents } from "@/db/schema";
import { agentFormSchema } from "@/schema/agent-schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  //   const session = await auth();
  //   if (!session?.user) {
  //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  //   }

  // TODO: IMPLEMENT AUTH
  const userId = "user-id";

  const body = await req.json();
  const parsed = agentFormSchema.safeParse({
    ...body,
    id: params.id,
    userId: userId,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await db
      .update(agents)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(agents.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 },
    );
  }
}
