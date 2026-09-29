import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { readPreferences } from "@/lib/server/preferences";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  const page = getPageSeo("register", locale);
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: "/register",
    locale,
    keywords: page.keywords,
  });
}

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<div className="mx-auto h-64 max-w-lg animate-pulse rounded-2xl bg-white" />}>
        <AuthCard />
      </Suspense>
    </div>
  );
}
