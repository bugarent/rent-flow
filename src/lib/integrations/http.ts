export type IntegrationHttpResult = {
  ok: boolean;
  status: number;
  latencyMs: number;
  contentType: string;
  bodyText: string;
  parsed: unknown;
  format: "json" | "xml" | "text" | "empty";
  error?: string;
};

function stripXmlToLooseObject(xml: string): unknown {
  // Minimal tag-to-object converter for Test Connection / simple payloads.
  const vehicles: Array<Record<string, string>> = [];
  const vehicleBlocks = xml.match(/<vehicle[\s\S]*?<\/vehicle>/gi) || [];
  for (const block of vehicleBlocks) {
    const row: Record<string, string> = {};
    const fields = ["externalId", "make", "model", "year", "category", "dailyRate", "currency", "active"];
    for (const field of fields) {
      const m = new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, "i").exec(block);
      if (m) row[field] = m[1].trim();
    }
    if (Object.keys(row).length) vehicles.push(row);
  }
  if (vehicles.length) {
    return {
      vehicles: vehicles.map((v) => ({
        ...v,
        year: Number(v.year) || 2020,
        dailyRate: v.dailyRate != null ? Number(v.dailyRate) : undefined,
        active: String(v.active ?? "true").toLowerCase() !== "false",
        photos: [],
      })),
    };
  }
  return { rawXml: true };
}

export async function integrationFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<IntegrationHttpResult> {
  const timeoutMs = init?.timeoutMs ?? 8000;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json, application/xml, text/xml, */*",
        ...(init?.headers || {}),
      },
    });
    const bodyText = await res.text();
    const contentType = res.headers.get("content-type") || "";
    const latencyMs = Date.now() - started;
    let parsed: unknown = null;
    let format: IntegrationHttpResult["format"] = "empty";

    if (!bodyText.trim()) {
      format = "empty";
    } else if (contentType.includes("json") || /^[\s]*[{[]/.test(bodyText)) {
      try {
        parsed = JSON.parse(bodyText);
        format = "json";
      } catch {
        format = "text";
        parsed = bodyText;
      }
    } else if (contentType.includes("xml") || /^[\s]*</.test(bodyText)) {
      format = "xml";
      parsed = stripXmlToLooseObject(bodyText);
    } else {
      format = "text";
      parsed = bodyText;
    }

    return {
      ok: res.ok,
      status: res.status,
      latencyMs,
      contentType,
      bodyText: bodyText.slice(0, 4000),
      parsed,
      format,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      contentType: "",
      bodyText: "",
      parsed: null,
      format: "empty",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function summarizePayload(value: unknown, max = 500): string {
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    return text.length > max ? `${text.slice(0, max)}…` : text;
  } catch {
    return String(value);
  }
}
