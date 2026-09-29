import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  deleteLocalCustomer,
  findLocalCustomerById,
  suspendLocalCustomer,
  unsuspendLocalCustomer,
} from "@/lib/auth/local-customer-store";
import {
  removeCustomerBan,
  upsertCustomerBan,
} from "@/lib/server/customer-bans-store";

async function requireAdmin() {
  const session = await getAdminSession();
  return Boolean(session?.user);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").toLowerCase();

  if (action !== "block" && action !== "unblock") {
    return NextResponse.json({ error: "action must be block or unblock" }, { status: 400 });
  }

  try {
    let email = "";
    let phone = "";
    let source: "db" | "local" = "db";

    try {
      const user = await prisma.user.findFirst({
        where: { id, role: "CUSTOMER" },
        select: { id: true, email: true, phone: true, status: true },
      });
      if (user) {
        email = user.email;
        phone = user.phone || "";
        if (action === "block") {
          await prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
          await upsertCustomerBan({
            email,
            phone,
            customerId: user.id,
            reason: "Blocked by admin",
          });
        } else {
          await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } });
          await removeCustomerBan({ email, phone });
        }
        return NextResponse.json({
          ok: true,
          action,
          status: action === "block" ? "SUSPENDED" : "ACTIVE",
          source: "db",
        });
      }
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
    }

    const local = findLocalCustomerById(id);
    if (!local) return NextResponse.json({ error: "Not found" }, { status: 404 });
    source = "local";
    email = local.email;
    phone = local.phone || "";

    if (action === "block") {
      suspendLocalCustomer(id);
      await upsertCustomerBan({
        email,
        phone,
        customerId: id,
        reason: "Blocked by admin",
      });
      return NextResponse.json({ ok: true, action, status: "SUSPENDED", source });
    }

    unsuspendLocalCustomer(id);
    await removeCustomerBan({ email, phone });
    return NextResponse.json({ ok: true, action, status: "ACTIVE", source });
  } catch (error) {
    console.error("[admin/customers PATCH]", error);
    return NextResponse.json({ error: "Could not update customer" }, { status: 500 });
  }
}

/** Prefer hard delete; on FK conflict soft-delete. Ban is only via PATCH block. */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    try {
      const user = await prisma.user.findFirst({
        where: { id, role: "CUSTOMER" },
        select: { id: true, email: true, phone: true },
      });
      if (user) {
        try {
          await prisma.user.delete({ where: { id: user.id } });
        } catch {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              status: "SUSPENDED",
              email: `deleted+${user.id.slice(0, 8)}@invalid.local`,
              phone: "",
            },
          });
        }
        return NextResponse.json({ ok: true, source: "db" });
      }
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
    }

    const local = findLocalCustomerById(id);
    if (!local) return NextResponse.json({ error: "Not found" }, { status: 404 });
    deleteLocalCustomer(id);
    return NextResponse.json({ ok: true, source: "local" });
  } catch (error) {
    console.error("[admin/customers DELETE]", error);
    return NextResponse.json({ error: "Could not delete customer" }, { status: 500 });
  }
}
