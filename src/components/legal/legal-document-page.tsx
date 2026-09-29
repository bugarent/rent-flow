export function LegalDocumentPage({
  title,
  body,
  fileUrl,
  openFileLabel = "Open file",
}: {
  title: string;
  body: string;
  fileUrl?: string;
  openFileLabel?: string;
}) {
  const href = String(fileUrl || "").trim();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-extrabold text-[#0b1f4b]">{title}</h1>
      {body ? (
        <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
          {body}
        </div>
      ) : null}
      {href ? (
        <p className="mt-6">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-900"
          >
            {openFileLabel}
          </a>
        </p>
      ) : null}
    </div>
  );
}
