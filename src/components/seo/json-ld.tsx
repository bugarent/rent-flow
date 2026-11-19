export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const payload = (Array.isArray(data) ? data : [data]).filter((item) => item != null);
  return (
    <>
      {payload.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
