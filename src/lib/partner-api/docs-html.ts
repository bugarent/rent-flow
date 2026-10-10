function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function block(code: string) {
  return `<pre><code>${esc(code.trim())}</code></pre>`;
}

export function partnerApiDocsHtml(origin: string) {
  const base = `${origin}/api/v1/partner`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Partner API v1 · RentAirportCars</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; background: #eef2f7; }
  header { background: #3d2a6d; color: #fff; padding: 20px 16px; }
  header h1 { margin: 0; font-size: 20px; }
  header p { margin: 4px 0 0; color: rgba(255,255,255,.8); font-size: 14px; }
  main { max-width: 880px; margin: 0 auto; padding: 16px; }
  section { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
  h2 { font-size: 16px; margin: 0 0 8px; color: #0b1f4b; }
  h3 { font-size: 14px; margin: 14px 0 6px; }
  pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12.5px; line-height: 1.5; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  p code, li code, td code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 13px; word-break: break-word; }
  .verb { display: inline-block; min-width: 46px; text-align: center; font-weight: 700; font-size: 12px; border-radius: 6px; padding: 2px 6px; margin-right: 6px; color: #fff; }
  .get { background: #0284c7; } .post { background: #16a34a; } .put { background: #d97706; }
  .path { font-family: ui-monospace, monospace; font-size: 13.5px; word-break: break-all; }
  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
  th, td { text-align: left; border-bottom: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
  th { color: #475569; font-weight: 600; }
</style>
</head>
<body>
<header>
  <h1>Partner API v1</h1>
  <p>Connect your channel manager: push availability and rates, receive bookings by webhook.</p>
</header>
<main>
<section>
  <h2>Authentication</h2>
  <p>Generate a key in the Partner Portal → Integration → Import. Send it with every request, in either header:</p>
  ${block(`X-API-KEY: rac_live_xxxxxxxxxxxxxxxx
# or
Authorization: Bearer rac_live_xxxxxxxxxxxxxxxx`)}
  <p>Base URL: <code>${esc(base)}</code>. Requests and responses are JSON; prices are in EUR. Limit: 120 requests per minute per key. Generating a new key revokes the old one.</p>
  <p>Errors look like <code>{"error":{"code":"invalid_range","message":"..."}}</code> with status 400, 401, 404, 409, 429 or 500.</p>
</section>

<section>
  <h2><span class="verb get">GET</span><span class="path">/vehicles</span></h2>
  <p>Lists your vehicles with their <code>id</code>, optional <code>external_id</code>, status and current rates.</p>
  ${block(`curl ${base}/vehicles -H "X-API-KEY: $KEY"`)}
</section>

<section>
  <h2><span class="verb post">POST</span><span class="path">/vehicles</span></h2>
  <p>Creates a vehicle as a <b>draft</b>. Add photos, documents and pickup locations in the Partner Portal, then submit it for review. It is not visible to customers before approval.</p>
  ${block(`curl -X POST ${base}/vehicles \\
  -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \\
  -d '{
    "external_id": "CM-1042",
    "make": "Toyota",
    "model": "Prius",
    "year": 2019,
    "registration_number": "AA123BB",
    "transmission": "AUTOMATIC",
    "fuel_type": "HYBRID",
    "seats": 5,
    "doors": 4,
    "daily_rate_eur": 35,
    "deposit_eur": 100
  }'`)}
  <div class="table-wrap"><table>
    <tr><th>Field</th><th>Notes</th></tr>
    <tr><td><code>make</code>, <code>model</code>, <code>year</code></td><td>Required.</td></tr>
    <tr><td><code>external_id</code></td><td>Your own id. Usable in place of <code>{id}</code> in every URL below.</td></tr>
    <tr><td><code>transmission</code></td><td><code>AUTOMATIC</code> or <code>MANUAL</code>.</td></tr>
    <tr><td><code>fuel_type</code></td><td><code>PETROL</code>, <code>DIESEL</code>, <code>HYBRID</code>, <code>ELECTRIC</code>, <code>LPG</code>.</td></tr>
  </table></div>
</section>

<section>
  <h2><span class="verb put">PUT</span><span class="path">/vehicles/{id}/availability</span></h2>
  <p>Replaces the full list of dates when the car is busy elsewhere. Send every busy range each time; an empty list frees all dates you pushed before. Customers cannot book these dates on our site. <code>YYYY-MM-DD</code> blocks whole days; ISO timestamps are used as given.</p>
  ${block(`curl -X PUT ${base}/vehicles/CM-1042/availability \\
  -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \\
  -d '{
    "blocked": [
      { "start_date": "2026-11-02", "end_date": "2026-11-05", "reference": "BK-77812" },
      { "start_date": "2026-11-20T10:00:00Z", "end_date": "2026-11-22T18:00:00Z" }
    ]
  }'`)}
  <p>The response lists <code>conflicts_with_site_bookings</code> — ranges that overlap a booking already made on our site, so you can resolve them.</p>
  <p><span class="verb get">GET</span> on the same URL returns the ranges currently stored.</p>
</section>

<section>
  <h2><span class="verb put">PUT</span><span class="path">/vehicles/{id}/rates</span></h2>
  <p>Updates prices right away, without sending the listing back to review. Send any of the fields.</p>
  ${block(`curl -X PUT ${base}/vehicles/CM-1042/rates \\
  -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \\
  -d '{
    "daily_rate_eur": 40,
    "deposit_eur": 100,
    "rate_tiers": [
      { "from_days": 1, "to_days": 3, "price_eur": 40 },
      { "from_days": 4, "to_days": 7, "price_eur": 36 },
      { "from_days": 8, "to_days": null, "price_eur": 32 }
    ]
  }'`)}
  <p><code>rate_tiers</code> are daily prices by rental length; <code>to_days: null</code> means “and longer”.</p>
</section>

<section>
  <h2>Webhooks</h2>
  <p>Save a Webhook URL (https) in the portal. We send a <code>POST</code> when a booking for one of your cars is created, confirmed, changed or cancelled.</p>
  <div class="table-wrap"><table>
    <tr><th>Header</th><th>Meaning</th></tr>
    <tr><td><code>X-RAC-Event</code></td><td><code>booking.created</code>, <code>booking.confirmed</code>, <code>booking.updated</code>, <code>booking.cancelled</code>, <code>webhook.test</code></td></tr>
    <tr><td><code>X-RAC-Timestamp</code></td><td>Unix seconds.</td></tr>
    <tr><td><code>X-RAC-Signature</code></td><td><code>sha256=</code> HMAC of <code>{timestamp}.{raw body}</code> with your webhook secret.</td></tr>
  </table></div>
  ${block(`{
  "id": "4f1c…",
  "event": "booking.confirmed",
  "created_at": "2026-10-10T09:15:00.000Z",
  "data": {
    "booking_id": "…",
    "reference": "RAC-10234",
    "status": "CONFIRMED",
    "vehicle_id": "…",
    "vehicle_external_id": "CM-1042",
    "start_date": "2026-11-02T10:00:00.000Z",
    "end_date": "2026-11-05T10:00:00.000Z",
    "pickup_location": "TBS",
    "dropoff_location": "TBS",
    "customer": { "first_name": "Nino", "last_name": "B.", "email": "…", "phone": "…" },
    "total_price": 150,
    "paid_online": 23.18,
    "due_at_pickup": 127.5,
    "currency": "EUR"
  }
}`)}
  <h3>Verify the signature (Node.js)</h3>
  ${block(`const crypto = require("crypto");
const expected = "sha256=" + crypto
  .createHmac("sha256", WEBHOOK_SECRET)
  .update(req.headers["x-rac-timestamp"] + "." + rawBody)
  .digest("hex");
const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers["x-rac-signature"]));`)}
  <p>Answer with any 2xx status within 8 seconds.</p>
</section>

<section>
  <h2>iCal import (no code)</h2>
  <p>If your channel manager only exports an iCal (.ics) link, paste it on the car in Partner Portal → Integration → Import. We read it every 15 minutes and block those dates.</p>
</section>
</main>
</body>
</html>`;
}
