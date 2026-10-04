"use client";

import { use, useState } from "react";
import { usePreferences } from "@/components/providers/preferences-context";

function StarRow({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => onChange(star)}
            className={`min-h-10 min-w-10 text-2xl ${star <= value ? "text-yellow-400" : "text-slate-300"}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { dictionary } = usePreferences();
  const [vehicleQuality, setVehicleQuality] = useState(5);
  const [hostCommunication, setHostCommunication] = useState(5);
  const [deliveryServiceQuality, setDeliveryServiceQuality] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          vehicleQuality,
          hostCommunication,
          deliveryServiceQuality,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");
      setSubmitted(true);
      if (data.googleMapsUrl) {
        setGoogleMapsUrl(data.googleMapsUrl);
        window.setTimeout(() => {
          window.open(data.googleMapsUrl, "_blank", "noopener,noreferrer");
        }, 600);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-md">
          <h1 className="mb-2 text-2xl font-bold text-green-600">{dictionary.review.thanks}</h1>
          {googleMapsUrl ? (
            <p className="text-sm text-slate-600">
              Share the same experience on{" "}
              <a className="font-semibold text-sky-700 underline" href={googleMapsUrl} target="_blank" rel="noreferrer">
                Google Maps
              </a>
              .
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg rounded-xl border bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold">{dictionary.review.title}</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <StarRow label={dictionary.review.vehicle} value={vehicleQuality} onChange={setVehicleQuality} />
          <StarRow label={dictionary.review.host} value={hostCommunication} onChange={setHostCommunication} />
          <StarRow label={dictionary.review.delivery} value={deliveryServiceQuality} onChange={setDeliveryServiceQuality} />
          <label className="block text-sm font-semibold">
            {dictionary.review.comment}
            <textarea rows={4} className="mt-2 w-full rounded-lg border p-3" value={comment} onChange={(e) => setComment(e.target.value)} />
          </label>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-sky-600 py-3 font-bold text-white">
            {dictionary.review.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
