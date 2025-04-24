"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <ProgressProvider
        options={{
          showSpinner: false,
        }}
        color="#8B5A6A"
        shallowRouting={false}
      >
        {children}
      </ProgressProvider>
    </SessionProvider>
  );
}
