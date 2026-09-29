export function isPdfUrl(url: string): boolean {
  return /\.pdf(?:$|[?#])/i.test(url.trim());
}

export function insuranceFileName(url: string): string {
  try {
    const path = url.split("?")[0] ?? url;
    const name = path.split("/").pop();
    return name && name.length ? decodeURIComponent(name) : "document.pdf";
  } catch {
    return "document.pdf";
  }
}

export function isAllowedInsuranceFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (
    type === "image/jpeg" ||
    type === "image/png" ||
    type === "image/gif" ||
    type === "image/webp" ||
    type === "application/pdf" ||
    type === "application/x-pdf"
  ) {
    return true;
  }
  return /\.(png|jpe?g|gif|webp|pdf)$/i.test(file.name);
}
