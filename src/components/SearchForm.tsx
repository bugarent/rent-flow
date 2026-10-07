"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { earliestPickupLocalInput, pickupInstantTooSoon } from "@/lib/bookings/lead-time";
import { DateInput } from "@/components/ui/date-input";

export default function SearchForm() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    if (pickupInstantTooSoon(new Date(startDate))) return;
    router.push(`/cars?startDate=${startDate}&endDate=${endDate}`);
  };

  return (
    <form onSubmit={handleSearch} className="bg-white p-6 rounded-xl shadow-md flex flex-col md:flex-row gap-4 items-center">
      <div className="flex flex-col w-full">
        <label className="text-sm font-semibold mb-1 text-gray-700">Pickup Date & Time</label>
        <DateInput
          type="datetime-local"
          value={startDate}
          min={earliestPickupLocalInput()}
          onChange={(e) => {
            const min = earliestPickupLocalInput();
            setStartDate(e.target.value < min ? min : e.target.value);
          }}
          className="p-3 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="flex flex-col w-full">
        <label className="text-sm font-semibold mb-1 text-gray-700">Drop-off Date & Time</label>
        <DateInput
          type="datetime-local"
          value={endDate}
          min={startDate || earliestPickupLocalInput()}
          onChange={(e) => {
            const min = startDate || earliestPickupLocalInput();
            setEndDate(e.target.value < min ? min : e.target.value);
          }}
          className="p-3 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition mt-auto"
      >
        Search Cars
      </button>
    </form>
  );
}