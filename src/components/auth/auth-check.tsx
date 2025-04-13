"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

type AuthCheckProps = {
  children: ReactNode;
};

export function AuthCheck({ children }: AuthCheckProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(window.location.href)}`,
      );
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return session ? children : null;
}
