export type HelpFaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type HelpFaqConfig = {
  items: HelpFaqItem[];
  updatedAt: string;
};

export const DEFAULT_HELP_FAQ: HelpFaqConfig = {
  items: [
    {
      id: "faq-booking-confirm",
      question: "I booked a car but did not receive a confirmation. What should I do?",
      answer:
        "Check your email spam folder first. If nothing arrives within 15 minutes, open My Booking with your email and booking code, or contact us from the Custom Booking section.",
      sortOrder: 0,
    },
    {
      id: "faq-payment-failed",
      question: "My online payment failed. Is my booking lost?",
      answer:
        "No. Try again with another card, or complete the deposit later from My Booking. The listing stays reserved for a short time while payment is pending.",
      sortOrder: 1,
    },
    {
      id: "faq-airport-delay",
      question: "My flight is delayed. How do I change pickup time?",
      answer:
        "Message the host as soon as you know the new arrival time. Airport delivery partners usually wait for delayed flights when you notify them in advance.",
      sortOrder: 2,
    },
  ],
  updatedAt: new Date(0).toISOString(),
};
