"use client";

import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/icons/google";
import { Atom } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import LoginForm from "./login-form";

const SSO = false;

export default function LoginView() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const [isPending, startTransition] = useTransition();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setAuthError(error);
    }
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-xl border border-white/10 p-6 shadow-md">
      <div className="space-y-2 text-center flex gap-2 items-center justify-center">
        <Atom size={20} className="size-8 text-center" />
        ChatIn
      </div>

      {authError && (
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-destructive">
          {authError}
        </div>
      )}

      <LoginForm
        startTransition={startTransition}
        setAuthError={setAuthError}
        isPending={isPending}
        callbackUrl={callbackUrl}
        SSO={SSO}
      />

      {!SSO && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-sidebar px-2 text-gray-500">
              Or continue with
            </span>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl })}
        disabled={isPending}
      >
        <GoogleIcon />
        Google
      </Button>

      {!SSO && (
        <Link
          href="/register"
          className="text-xs text-center text-gray-500 block"
        >
          Don&apos;t have an account? Sign up
        </Link>
      )}

      <p className="text-center text-muted-foreground text-xs">
        © 2025 OBRA. All rights reserved.
      </p>
    </div>
  );
}
