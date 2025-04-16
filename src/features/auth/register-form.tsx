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
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

type RegisterFormProps = {
  setAuthError: React.Dispatch<React.SetStateAction<string | null>>;
};

export default function RegisterForm({ setAuthError }: RegisterFormProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

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
          className="w-full light"
          disabled={isPending}
          variant={"gradient"}
        >
          <span className="relative z-10 isolate">
            {isPending ? "Registering Account..." : "Register"}
          </span>
        </Button>
      </form>
    </Form>
  );
}
