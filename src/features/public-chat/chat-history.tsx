"use client";

import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/chat-store";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { SidebarMenuButton, SidebarMenuItem } from "./sidebar";

export default function ChatHistory() {
  const router = useRouter();
  const params = useParams();
  const { slug, chatId } = params as { slug: string; chatId: string };

  const { chatList, deleteChatList } = useChatStore();

  const handleDeleteChat = (id: string) => {
    deleteChatList(slug, id);

    if (id === chatId) {
      router.push(`/chat/${slug}`);
    }
  };

  return (
    <>
      {chatList[slug]?.map((chat) => (
        <SidebarMenuItem key={chat.chatId} className="group/item">
          <SidebarMenuButton
            asChild
            className="relative"
            isActive={chat.chatId === chatId}
          >
            <div>
              <Link
                href={`/chat/${slug}/${chat.chatId}`}
                className="w-full truncate"
              >
                {chat.title}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover/item:block"
                onClick={() => handleDeleteChat(chat.chatId)}
              >
                X
              </Button>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}
