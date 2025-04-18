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
import { LoginSchema, loginSchema } from "@/schema/user-auth-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

type LoginFormProps = {
  startTransition: React.TransitionStartFunction;
  setAuthError: React.Dispatch<React.SetStateAction<string | null>>;
  isPending: boolean;
  callbackUrl: string;
  SSO?: boolean;
};

export default function LoginForm({
  startTransition,
  setAuthError,
  isPending,
  callbackUrl,
  SSO = true,
}: LoginFormProps) {
  const router = useRouter();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function handleLogin(data: LoginSchema) {
    startTransition(async () => {
      try {
        const res = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (res?.error) {
          setAuthError(res.error);
          return;
        }

        setAuthError(null);
        router.push(callbackUrl);
      } catch (error) {
        console.error(error);
        setAuthError("Cannot process your request, please try again later");
      }
    });
  }

  if (SSO) return null;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleLogin)}
        className="space-y-4 dark"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} placeholder="irvan@bdn.id" />
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

        <Button
          type="submit"
          className="w-full light"
          disabled={isPending}
          variant={"gradient"}
        >
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Form>
  );
}
