"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RegisterSchema, registerSchema } from "@/schema/user-auth-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Atom } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

export default function RegisterView() {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  function handleLogin(data: RegisterSchema) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
          }),
        });

        const res = await response.json();

        if (!response.ok) {
          setAuthError(res.error || "Something went wrong");
          return;
        }

        setAuthError(null);
        router.push("/login");
      } catch (error) {
        console.error(error);
        setAuthError("Cannot process your request, please try again later");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-xl border p-6 shadow-md">
      <div className="space-y-2 text-center flex gap-2 items-center justify-center">
        <Atom size={20} className="size-8 text-center" />
        ChatIn
      </div>

      {authError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-destructive">
          {authError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="irvan baihaqi" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="irvan@bdn.id" type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" placeholder="••••••••" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" placeholder="••••••••" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
            variant={"gradient"}
          >
            <span className="relative z-10 isolate">
              {isPending ? "Registering Account..." : "Register"}
            </span>
          </Button>
        </form>
      </Form>

      {/* <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl })}
        disabled={isPending}
      >
        <GoogleIcon />
        Google
      </Button> */}

      <Link href="/login" className="text-xs text-center text-gray-500 block">
        Already have an account? Sign in
      </Link>
    </div>
  );
}
