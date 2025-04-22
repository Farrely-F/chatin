"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function NewChatPage() {
  const params = useParams();
  const { slug, chatId } = params as { slug: string; chatId: string };

  return (
    <Button
      variant="gradient"
      className={`light ${chatId ? "" : "opacity-50"}`}
      asChild
    >
      <Link href={chatId ? `/chat/${slug}` : ``}>New Chat</Link>
    </Button>
  );
}
