import { partnerApiDocsHtml } from "@/lib/partner-api/docs-html";

export function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return new Response(partnerApiDocsHtml(origin), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
