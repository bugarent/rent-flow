const only = process.argv[2];
const urls = [
  "http://localhost:3000/en/car-rental-kutaisi-airport",
  "http://localhost:3000/ka/mankanis-daqiraveba-kutaisi-airport",
  "http://localhost:3000/airport/KUT",
  "http://localhost:3000/en/car-rental-mtskheta",
  "http://localhost:3000/de/autovermietung-kutaisi-airport",
];

for (const url of urls.filter((u) => !only || u.includes(only))) {
  const res = await fetch(url, { redirect: "manual" });
  const html = await res.text();
  const h1 = [...html.matchAll(/<h1\b/gi)].length;
  const h2 = [...html.matchAll(/<h2\b/gi)].length;
  const h3 = [...html.matchAll(/<h3\b/gi)].length;
  const faqScripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].filter((m) =>
    m[1].includes("FAQPage"),
  ).length;
  const path = new URL(url).pathname;
  const selfLinks = [...html.matchAll(/<a[^>]+href="([^"]+)"/gi)].filter((m) => m[1] === path).length;
  const brand = (html.match(/RentAirportCars/gi) || []).length;
  const self = html.includes(`href="${new URL(url).pathname}"`) || html.includes(`href="${new URL(url).pathname.toLowerCase()}"`);
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() }))
    .filter((l) => /car-rental-|mankanis-|autovermietung-|\/airport\//.test(l.href))
    .slice(0, 8);
  console.log("links", JSON.stringify(links));
  console.log(
    JSON.stringify({
      url,
      status: res.status,
      h1,
      h2,
      h3,
      faqScripts,
      selfLinks,
      brand,
      len: html.length,
      hasCars: html.includes("/cars/"),
      hasSee: /See available|Browse cars|მანქანების ნახვა|ხელმისაწვდომი/.test(html),
    }),
  );
}
