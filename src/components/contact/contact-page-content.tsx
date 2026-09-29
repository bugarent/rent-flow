"use client";

import { useState } from "react";
import { ContactOptionsPanel } from "@/components/contact/contact-options-panel";
import { ContactMessageForm } from "@/components/contact/contact-message-form";
import { openLiveChatWidget } from "@/components/live-chat/live-chat-widget-bus";

export function ContactPageContent({
  title,
  email,
  phone,
}: {
  title: string;
  email?: string;
  phone?: string;
}) {
  const [compose, setCompose] = useState(false);

  return (
    <div className="bg-[#eef3f8]">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-16">
        {compose ? (
          <div className="mx-auto max-w-2xl">
            <ContactMessageForm onClose={() => setCompose(false)} />
          </div>
        ) : (
          <>
            <h1 className="text-center text-3xl font-extrabold text-[#0b1f4b]">{title}</h1>
            <ContactOptionsPanel
              email={email}
              phone={phone}
              onOpenCompose={() => setCompose(true)}
              onOpenLiveChat={() => openLiveChatWidget()}
              className="mt-8"
            />
          </>
        )}
      </div>
    </div>
  );
}
