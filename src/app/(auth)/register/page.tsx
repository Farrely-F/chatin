import RegisterView from "@/features/auth/register";
import { redirect } from "next/navigation";

export default function RegisterPage() {
  // Redirect if SSO is enabled
  redirect("/login");

  return (
    <div className="dark text-foreground bg-sidebar flex min-h-screen items-center justify-center">
      <RegisterView />
    </div>
  );
}
