import type { HelpArticle, HelpCenterConfig } from "@/lib/catalog/help-center";

function article(
  id: string,
  question: string,
  answer: string,
  sortOrder: number,
  trending = false,
): HelpArticle {
  return { id, question, answer, sortOrder, trending };
}

/** Seed content — imported only from server stores, never from client components. */
export const DEFAULT_HELP_CENTER: HelpCenterConfig = {
  categories: [
    {
      id: "cat-general",
      title: "General Queries",
      sortOrder: 0,
      topics: [
        {
          id: "topic-booking",
          title: "Booking",
          sortOrder: 0,
          articles: [
            article(
              "art-supplier-terms",
              "How to check the rental conditions and terms of the supplier?",
              "Open your booking confirmation and use the supplier terms link, or check the Terms of Service page in the website footer before you pick up the car.",
              0,
              true,
            ),
            article(
              "art-no-credit-card",
              "Can I book a vehicle without a credit card?",
              "Most suppliers require a credit card in the main driver’s name for the security deposit. Debit cards are accepted only when the listing explicitly allows it.",
              1,
            ),
            article(
              "art-customer-care",
              "How can I contact customer support?",
              "Use Help → Chat with us, or the contact details in the website footer. Your booking confirmation also lists the supplier phone for pick-up day support.",
              2,
              true,
            ),
            article(
              "art-additional-driver",
              "Can a second driver be included in the rental agreement?",
              "Yes, if the supplier allows it. Add the driver before pick-up from My Booking when available, or ask the supplier desk and bring both licences.",
              3,
            ),
            article(
              "art-fuel-policy",
              "What fuel guidelines apply to rented vehicles?",
              "The fuel policy is shown on the listing and voucher (usually full-to-full). Return the car with the same fuel level to avoid refuelling fees.",
              4,
            ),
            article(
              "art-voucher",
              "What is a Rental Confirmation Voucher and do I need it to pick up my car rental?",
              "The voucher proves your booking. Keep a digital or printed copy and show it with your passport and driving licence at pick-up.",
              5,
            ),
          ],
        },
        {
          id: "topic-rental-car",
          title: "Rental Car",
          sortOrder: 1,
          articles: [
            article(
              "art-shuttle-meet",
              "What do airport shuttle transfers and the 'Meet & Greet' option include?",
              "Shuttle means a free transfer between the terminal and the rental desk. Meet & Greet means a representative meets you in arrivals with a name board.",
              0,
            ),
            article(
              "art-contact-supplier",
              "What is the best way to reach out to the car provider?",
              "Phone and chat details are in your confirmation email and in My Booking after you look up the reservation.",
              1,
            ),
            article(
              "art-booking-confirmed",
              "How do I receive confirmation for my reserved car?",
              "You receive a confirmation email with your booking number (11R…). You can also open My Booking with your email and booking code.",
              2,
            ),
            article(
              "art-grace-period",
              "What does the pickup grace period mean for my reservation?",
              "A short free window after scheduled pick-up or drop-off before late fees apply. Exact minutes depend on the supplier terms on your voucher.",
              3,
            ),
          ],
        },
      ],
    },
    {
      id: "cat-manage",
      title: "Manage Booking",
      sortOrder: 1,
      topics: [
        {
          id: "topic-amend",
          title: "Amend Your Booking",
          sortOrder: 0,
          articles: [
            article(
              "art-change-dates",
              "Is it possible to modify my return or pickup schedule?",
              "Open My Booking, request a change, or message the supplier. Price may change if days or extras are updated.",
              0,
            ),
            article(
              "art-change-flight",
              "Where can I change or add my flight arrival details?",
              "Edit the flight number from My Booking when available, or tell the supplier as soon as your flight changes so they can track delays.",
              1,
            ),
          ],
        },
        {
          id: "topic-cancel-booking",
          title: "Cancel Booking",
          sortOrder: 1,
          articles: [
            article(
              "art-how-cancel",
              "What are the steps to cancel a vehicle reservation?",
              "Use My Booking → cancel, or contact support. Free cancellation depends on the free-cancellation window shown at checkout.",
              0,
              true,
            ),
            article(
              "art-refund-cancel",
              "How is money refunded following a cancellation?",
              "Eligible refunds follow the cancellation policy on your voucher. Card refunds usually take a few business days after approval.",
              1,
              true,
            ),
          ],
        },
      ],
    },
    {
      id: "cat-payment",
      title: "Payment And Deposit",
      sortOrder: 2,
      topics: [
        {
          id: "topic-payments",
          title: "Payments",
          sortOrder: 0,
          articles: [
            article(
              "art-extra-charge",
              "What should I do if my car rental supplier charges me extra?",
              "Ask the supplier for a written breakdown, keep photos and receipts, then contact us with your booking number so we can help mediate.",
              0,
              true,
            ),
            article(
              "art-debit-card",
              "Can I pay for my online booking with a debit card?",
              "Online deposit can usually be paid by debit or credit card. The security deposit at pick-up often still needs a credit card.",
              1,
            ),
            article(
              "art-payment-failed",
              "My online payment failed. Is my booking lost?",
              "No. Retry with another card or finish the deposit from My Booking. The hold may expire if payment stays incomplete.",
              2,
            ),
          ],
        },
        {
          id: "topic-deposit",
          title: "Security Deposit",
          sortOrder: 1,
          articles: [
            article(
              "art-what-deposit",
              "What is a security deposit and why do I need to leave it?",
              "It is a temporary hold for damage, fines, or fuel. It is released after the car is returned according to the supplier’s timeline.",
              0,
            ),
            article(
              "art-deposit-amount",
              "How much is the security deposit?",
              "The amount is shown on the listing and voucher. It depends on the car class and insurance you selected.",
              1,
            ),
          ],
        },
      ],
    },
    {
      id: "cat-cancel",
      title: "Cancellation",
      sortOrder: 3,
      topics: [
        {
          id: "topic-cancellation",
          title: "Cancellation",
          sortOrder: 0,
          articles: [
            article(
              "art-free-cancel",
              "Is cancellation free?",
              "Many cars include free cancellation until a deadline shown at checkout. After that, fees may apply per the supplier policy.",
              0,
            ),
            article(
              "art-no-show",
              "What happens if I do not pick up the car?",
              "A no-show is usually treated as a late cancellation and may forfeit the deposit. Contact the supplier if you will miss pick-up.",
              1,
            ),
          ],
        },
      ],
    },
    {
      id: "cat-driver",
      title: "Driver Requirements",
      sortOrder: 4,
      topics: [
        {
          id: "topic-age",
          title: "Driver's Age",
          sortOrder: 0,
          articles: [
            article(
              "art-min-age",
              "How old do I have to be to rent a car?",
              "Minimum age is shown on each listing (often 21+). Young-driver fees may apply under 25.",
              0,
            ),
            article(
              "art-age-18",
              "Can I rent a car at 18?",
              "Only if the listing allows it. Most airport cars require at least 21 years of age.",
              1,
            ),
          ],
        },
        {
          id: "topic-license",
          title: "License Requirements",
          sortOrder: 1,
          articles: [
            article(
              "art-dl-requirements",
              "What are the Driver's License (DL) requirements to rent a car?",
              "Bring a valid full licence held for the minimum period stated on the listing. The main driver’s name must match the booking and card.",
              0,
            ),
            article(
              "art-idp",
              "Do I need an International Driving Permit (IDP)?",
              "If your licence is not in Latin characters, many suppliers require an IDP together with your national licence.",
              1,
            ),
          ],
        },
      ],
    },
    {
      id: "cat-pickup",
      title: "Pick-Up & Drop-Off",
      sortOrder: 5,
      topics: [
        {
          id: "topic-pickup",
          title: "Pick-Up",
          sortOrder: 0,
          articles: [
            article(
              "art-desk-location",
              "Where is the rental counter/desk located?",
              "Instructions are in your voucher (terminal desk, shuttle point, or Meet & Greet). Follow the airport signs for car rental.",
              0,
            ),
            article(
              "art-late-pickup",
              "Can I pick up my car rental after the scheduled time?",
              "Often yes within a grace period if you notify the supplier. Long delays may need a booking amendment.",
              1,
            ),
            article(
              "art-docs-pickup",
              "What are the documents required at the time of car rental pick-up?",
              "Passport or ID, driving licence (and IDP if required), the booking voucher, and the credit card for the deposit.",
              2,
            ),
          ],
        },
        {
          id: "topic-dropoff",
          title: "Drop-Off",
          sortOrder: 1,
          articles: [
            article(
              "art-where-return",
              "Where do I return the car rental?",
              "Return to the location on your voucher unless a one-way drop was booked. Follow on-site rental return signs.",
              0,
            ),
            article(
              "art-late-dropoff",
              "What happens if I am late to drop-off my car rental?",
              "Late return may add an extra day or late fee after the grace period. Contact the supplier if you will be late.",
              1,
            ),
            article(
              "art-early-return",
              "Will I get a refund if I return my car earlier than the scheduled time?",
              "Early return refunds are uncommon. Unused days are usually non-refundable unless the supplier policy says otherwise.",
              2,
            ),
          ],
        },
        {
          id: "topic-cross-border",
          title: "One-Way & Cross Border",
          sortOrder: 2,
          articles: [
            article(
              "art-out-of-country",
              "Can I take my rental car out of the country?",
              "Only if cross-border travel is allowed on the listing and approved by the supplier in writing, often with extra fees.",
              0,
            ),
            article(
              "art-one-way-fee",
              "Will there be extra charges if I need to take the rental car to a different country?",
              "Yes, cross-border and one-way fees may apply. Confirm before departure to avoid fines at return.",
              1,
            ),
          ],
        },
      ],
    },
  ],
  updatedAt: new Date(0).toISOString(),
};
