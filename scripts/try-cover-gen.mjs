import { writeFileSync } from "node:fs";

const prompt = encodeURIComponent(
  "Professional catalog studio photograph of a 2019 Mitsubishi Outlander SUV, silver metallic paint, three-quarter front view, white seamless studio background, soft commercial lighting, no people, no text, no watermark, no license plate",
);
const url = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=768&nologo=true&model=flux`;
console.log("start");
const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
const bytes = Buffer.from(await response.arrayBuffer());
writeFileSync("scripts/cover-gen.jpg", bytes);
console.log(response.status, response.headers.get("content-type"), bytes.length);
