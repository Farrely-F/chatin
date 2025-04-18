"use client";

import { Atom } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import RegisterForm from "./register-form";

export default function RegisterView() {
  const [authError, setAuthError] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-xl border border-white/10 p-6 shadow-md">
      <div className="space-y-2 text-center flex gap-2 items-center justify-center">
        <Atom size={20} className="size-8 text-center" />
        ChatIn
      </div>
      {authError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-destructive">
          {authError}
        </div>
      )}
      <RegisterForm setAuthError={setAuthError} />
      <Link href="/login" className="text-xs text-center text-gray-500 block">
        Already have an account? Sign in
      </Link>
    </div>
  );
}
