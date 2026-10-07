import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clampCommissionPercent,
  commissionAmountEur,
  daysUntilRental,
  paypalIntentForPickup,
} from "@/lib/payments/paypal-commission";
import {
  PaypalApiError,
  PaypalConfigError,
  createPaypalCheckoutOrder,
} from "@/lib/payments/paypal-client";
import { roundMoney } from "@/lib/cars/reserve-pricing";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  pickupDate: z.string().trim().min(10).max(40),
  totalPrice: z.number().finite().min(0).max(1_000_000),
  description: z.string().trim().max(127).optional(),
});

function noStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Creates a PayPal Sandbox (or live, when configured) checkout order for the
 * site commission only.
 *
 * Body: { pickupDate, totalPrice, description? }
 * - days until pickup > 25 → intent CAPTURE (charge now)
 * - days until pickup ≤ 25 → intent AUTHORIZE (hold)
 * Commission percent comes from admin platform settings (0–20% of totalPrice).
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noStore({ error: "Invalid JSON" }, 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return noStore({ error: "pickupDate and totalPrice are required" }, 400);
  }

  const days = daysUntilRental(parsed.data.pickupDate);
  if (days == null) {
    return noStore({ error: "pickupDate must be a valid date (YYYY-MM-DD)" }, 400);
  }

  const settings = await getPlatformSettings();
  const commissionPercent = clampCommissionPercent(settings.depositPercent);
  const commission = commissionAmountEur(parsed.data.totalPrice, commissionPercent);
  const intent = paypalIntentForPickup(days);
  const commissionAmount = commission.toFixed(2);
  const totalPrice = roundMoney(parsed.data.totalPrice).toFixed(2);

  const summary = {
    intent,
    daysUntilRental: days,
    commissionPercent,
    commissionAmount,
    currency: "EUR",
    totalPrice,
  };

  if (commission <= 0) {
    return noStore({
      orderId: null,
      paymentRequired: false,
      status: null,
      approveUrl: null,
      ...summary,
    });
  }

  try {
    const order = await createPaypalCheckoutOrder({
      intent,
      amount: commissionAmount,
      currency: "EUR",
      description: parsed.data.description || "rentairportcars.com booking commission",
    });
    return noStore({
      orderId: order.id,
      paymentRequired: true,
      status: order.status,
      approveUrl: order.approveUrl,
      ...summary,
    });
  } catch (error) {
    if (error instanceof PaypalConfigError) {
      return noStore({ error: error.message }, 503);
    }
    if (error instanceof PaypalApiError) {
      return noStore(
        {
          error: "PayPal could not create the order",
          paypalStatus: error.status,
          paypalMessage: error.message,
          debugId: error.debugId || undefined,
        },
        502,
      );
    }
    const detail = error instanceof Error ? error.message : "PayPal request failed";
    console.error("[paypal] order create failed:", detail);
    return noStore(
      {
        error: "PayPal could not create the order",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      },
      502,
    );
  }
}
