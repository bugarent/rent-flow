import { ensureTestAdmin } from "@/lib/auth/ensure-test-admin";
import { AdminLoginScreen } from "@/components/admin/admin-login-screen";

export default async function AdminOperationsLoginPage() {
  try {
    await ensureTestAdmin();
  } catch (error) {
    console.error("ensureTestAdmin failed", error);
  }

  return <AdminLoginScreen />;
}
