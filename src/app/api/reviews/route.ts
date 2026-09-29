import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/sessions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, vehicleQuality, hostCommunication, deliveryServiceQuality, carCondition, ownerCommunication, deliveryQuality, comment } = body;

    const existingReview = await prisma.review.findUnique({ where: { bookingId } });
    if (existingReview) {
      return NextResponse.json({ error: "This booking already has a review" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { car: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const vq = Number(vehicleQuality ?? carCondition);
    const hc = Number(hostCommunication ?? ownerCommunication);
    const dq = Number(deliveryServiceQuality ?? deliveryQuality);
    if ([vq, hc, dq].some((n) => n < 1 || n > 5)) {
      return NextResponse.json({ error: "Ratings must be between 1 and 5" }, { status: 400 });
    }

    const averageRating = (vq + hc + dq) / 3;
    const review = await prisma.review.create({
      data: {
        bookingId,
        carId: booking.carId,
        partnerId: booking.car.partnerId,
        authorId: booking.customerId,
        vehicleQuality: vq,
        hostCommunication: hc,
        deliveryServiceQuality: dq,
        averageRating,
        comment: comment ?? "",
        status: "PENDING",
        googleMapsPromptedAt: vq === 5 && hc === 5 && dq === 5 ? new Date() : null,
      },
    });

    const settings = await prisma.platformSetting.findUnique({ where: { id: "default" } });
    const promptGoogle = vq === 5 && hc === 5 && dq === 5;

    return NextResponse.json({
      success: true,
      review: { id: review.id, averageRating, status: review.status },
      googleMapsUrl: promptGoogle ? settings?.googleMapsUrl ?? null : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { id, status } = await req.json();
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const review = await prisma.review.update({ where: { id }, data: { status } });
  return NextResponse.json({ id: review.id, status: review.status });
}
