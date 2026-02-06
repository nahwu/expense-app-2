import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardClient from "@/app/dashboard/dashboard-client";
import { authOptions } from "@/lib/auth-options";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <DashboardClient userEmail={session.user.email ?? "Signed In User"} />;
}

