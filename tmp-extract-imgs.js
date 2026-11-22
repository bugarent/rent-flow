const fs = require("fs");
const h = fs.readFileSync("tmp-home.html", "utf8");
const i = h.indexOf('"categories":[');
console.log(h.slice(i, i + 1800));
console.log("\n--- airports near LCA ---");
for (const name of ["Larnaca", "Limassol", "Nicosia"]) {
  let from = 0;
  let n = 0;
  while (n < 3) {
    const at = h.indexOf(name, from);
    if (at < 0) break;
    const slice = h.slice(Math.max(0, at - 80), at + 200);
    if (slice.includes("img") || slice.includes("image") || slice.includes("uploads") || slice.includes("unsplash")) {
      console.log("\n", name, at);
      console.log(slice.replace(/\s+/g, " ").slice(0, 280));
      n++;
    }
    from = at + name.length;
  }
}
