"use client";

import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/chat-store";
import { X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { SidebarMenuButton, SidebarMenuItem } from "./sidebar";

export default function ChatHistory() {
  const router = useRouter();
  const params = useParams();
  const { slug, chatId } = params as { slug: string; chatId: string };
  const { chatList, deleteChatList } = useChatStore();

  const handleDeleteChat = (id: string) => {
    deleteChatList(slug, id);
    if (id === chatId) router.push(`/chat/${slug}`);
  };

  return (
    <>
      {chatList[slug]?.map((chat) => (
        <SwipeableItem
          key={chat.chatId}
          onDelete={() => handleDeleteChat(chat.chatId)}
        >
          <SidebarMenuItem className="group/item">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteChat(chat.chatId);
                  }}
                >
                  <X />
                </Button>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SwipeableItem>
      ))}
    </>
  );
}

function SwipeableItem({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startX.current;
    if (deltaX < 0) {
      setTranslateX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (translateX < -100) {
      onDelete();
    }
    setTranslateX(0);
    setIsSwiping(false);
  };

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="transition-transform duration-200"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
