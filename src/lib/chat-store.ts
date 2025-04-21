import type { Message } from "@ai-sdk/react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMetadata {
  chatId: string;
  slug: string;
  title: string;
  createdAt: string;
}

interface ChatState {
  chatList: Record<string, ChatMetadata[]>; // slug => chats
  chatHistory: Record<string, Message[]>; // `${slug}:${chatId}` => messages

  getChatList: (slug: string) => ChatMetadata[];
  saveChatList: (slug: string, list: ChatMetadata[]) => void;
  deleteChatList: (slug: string, chatId: string) => void;

  loadChatHistory: (slug: string, chatId: string) => Message[];
  saveChatHistory: (slug: string, chatId: string, messages: Message[]) => void;
  deleteChatHistory: (slug: string, chatId: string) => void;
}

const CHAT_KEY = (slug: string, chatId: string) => `${slug}:${chatId}`;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chatList: {},
      chatHistory: {},

      getChatList: (slug) => {
        const list = get().chatList[slug] ?? [];
        return list;
      },

      saveChatList: (slug, list) => {
        set((state) => ({
          chatList: {
            ...state.chatList,
            [slug]: list,
          },
        }));
      },

      deleteChatList: (slug, chatId) => {
        const currentList = get().chatList[slug] ?? [];
        const updatedList = currentList.filter(
          (chat) => chat.chatId !== chatId,
        );

        set((state) => ({
          chatList: {
            ...state.chatList,
            [slug]: updatedList,
          },
        }));

        // Also remove chat history associated with this chatId
        const key = CHAT_KEY(slug, chatId);
        const newHistory = { ...get().chatHistory };
        delete newHistory[key];
        set({ chatHistory: newHistory });
      },

      loadChatHistory: (slug, chatId) => {
        const key = CHAT_KEY(slug, chatId);
        return get().chatHistory[key] ?? [];
      },

      saveChatHistory: (slug, chatId, messages) => {
        try {
          const json = JSON.stringify(messages);
          const maxSize = 5 * 1024 * 1024; // 5MB

          if (new Blob([json]).size < maxSize) {
            const key = CHAT_KEY(slug, chatId);
            set((state) => ({
              chatHistory: {
                ...state.chatHistory,
                [key]: messages,
              },
            }));
          } else {
            console.warn(
              "Chat history size exceeded storage limits. Skipping save.",
            );
          }
        } catch (err) {
          console.error("Failed to save chat history:", err);
        }
      },

      deleteChatHistory: (slug, chatId) => {
        const key = CHAT_KEY(slug, chatId);
        set((state) => {
          const updated = { ...state.chatHistory };
          delete updated[key];
          return { chatHistory: updated };
        });
      },
    }),
    {
      name: "chat-storage", // localStorage key
      partialize: (state) => ({
        chatList: state.chatList,
        chatHistory: state.chatHistory,
      }),
    },
  ),
);
