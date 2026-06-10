import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <ThemeProvider>
      <AppShell>{children}</AppShell>
    </ThemeProvider>
  );
}