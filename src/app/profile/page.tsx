import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/auth-guard";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default async function ProfilePage() {
  const user = await requireAuth();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>

      <div className="rounded-lg border p-6 shadow-sm">
        <div className="mb-6 space-y-1">
          <h2 className="text-xl font-semibold">User Information</h2>
          <p className="text-sm text-gray-500">Your personal account details</p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-1">
            <p className="text-sm font-medium text-gray-500">Name</p>
            <p>{user.name || "Not provided"}</p>
          </div>

          <div className="grid gap-1">
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p>{user.email}</p>
          </div>

          <div className="grid gap-1">
            <p className="text-sm font-medium text-gray-500">User ID</p>
            <p className="font-mono text-sm">{user.id}</p>
          </div>
        </div>

        <div className="mt-8">
          <form
            action={async () => {
              "use server";
              await signOut({ redirect: true, callbackUrl: "/login" });
            }}
          >
            <Button type="submit" variant="destructive">
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
