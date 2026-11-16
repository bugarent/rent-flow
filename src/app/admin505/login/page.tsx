import { after } from "next/server";
import { ensureTestAdmin } from "@/lib/auth/ensure-test-admin";
import { AdminLoginScreen } from "@/components/admin/admin-login-screen";

export default function AdminOperationsLoginPage() {
  after(() => {
    ensureTestAdmin().catch((error) => console.error("ensureTestAdmin failed", error));
  });

  return <AdminLoginScreen />;
}
