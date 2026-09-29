/**
 * ISO 3166-1 alpha-2 countries for admin filters and partner selection.
 * English labels only — financials / ops tooling does not need full i18n here.
 */
export type WorldCountry = { iso2: string; name: string; region: string };

export const WORLD_COUNTRIES: WorldCountry[] = [
  // Europe
  { iso2: "AL", name: "Albania", region: "Europe" },
  { iso2: "AD", name: "Andorra", region: "Europe" },
  { iso2: "AT", name: "Austria", region: "Europe" },
  { iso2: "BY", name: "Belarus", region: "Europe" },
  { iso2: "BE", name: "Belgium", region: "Europe" },
  { iso2: "BA", name: "Bosnia and Herzegovina", region: "Europe" },
  { iso2: "BG", name: "Bulgaria", region: "Europe" },
  { iso2: "HR", name: "Croatia", region: "Europe" },
  { iso2: "CY", name: "Cyprus", region: "Europe" },
  { iso2: "CZ", name: "Czechia", region: "Europe" },
  { iso2: "DK", name: "Denmark", region: "Europe" },
  { iso2: "EE", name: "Estonia", region: "Europe" },
  { iso2: "FI", name: "Finland", region: "Europe" },
  { iso2: "FR", name: "France", region: "Europe" },
  { iso2: "DE", name: "Germany", region: "Europe" },
  { iso2: "GR", name: "Greece", region: "Europe" },
  { iso2: "HU", name: "Hungary", region: "Europe" },
  { iso2: "IS", name: "Iceland", region: "Europe" },
  { iso2: "IE", name: "Ireland", region: "Europe" },
  { iso2: "IT", name: "Italy", region: "Europe" },
  { iso2: "XK", name: "Kosovo", region: "Europe" },
  { iso2: "LV", name: "Latvia", region: "Europe" },
  { iso2: "LI", name: "Liechtenstein", region: "Europe" },
  { iso2: "LT", name: "Lithuania", region: "Europe" },
  { iso2: "LU", name: "Luxembourg", region: "Europe" },
  { iso2: "MT", name: "Malta", region: "Europe" },
  { iso2: "MD", name: "Moldova", region: "Europe" },
  { iso2: "MC", name: "Monaco", region: "Europe" },
  { iso2: "ME", name: "Montenegro", region: "Europe" },
  { iso2: "NL", name: "Netherlands", region: "Europe" },
  { iso2: "MK", name: "North Macedonia", region: "Europe" },
  { iso2: "NO", name: "Norway", region: "Europe" },
  { iso2: "PL", name: "Poland", region: "Europe" },
  { iso2: "PT", name: "Portugal", region: "Europe" },
  { iso2: "RO", name: "Romania", region: "Europe" },
  { iso2: "RU", name: "Russia", region: "Europe / CIS" },
  { iso2: "SM", name: "San Marino", region: "Europe" },
  { iso2: "RS", name: "Serbia", region: "Europe" },
  { iso2: "SK", name: "Slovakia", region: "Europe" },
  { iso2: "SI", name: "Slovenia", region: "Europe" },
  { iso2: "ES", name: "Spain", region: "Europe" },
  { iso2: "SE", name: "Sweden", region: "Europe" },
  { iso2: "CH", name: "Switzerland", region: "Europe" },
  { iso2: "UA", name: "Ukraine", region: "Europe / CIS" },
  { iso2: "GB", name: "United Kingdom", region: "Europe" },
  { iso2: "VA", name: "Vatican City", region: "Europe" },

  // Caucasus / CIS / Central Asia
  { iso2: "AM", name: "Armenia", region: "Caucasus / CIS" },
  { iso2: "AZ", name: "Azerbaijan", region: "Caucasus / CIS" },
  { iso2: "GE", name: "Georgia", region: "Caucasus / CIS" },
  { iso2: "KZ", name: "Kazakhstan", region: "Central Asia / CIS" },
  { iso2: "KG", name: "Kyrgyzstan", region: "Central Asia / CIS" },
  { iso2: "TJ", name: "Tajikistan", region: "Central Asia / CIS" },
  { iso2: "TM", name: "Turkmenistan", region: "Central Asia / CIS" },
  { iso2: "UZ", name: "Uzbekistan", region: "Central Asia / CIS" },

  // Middle East
  { iso2: "BH", name: "Bahrain", region: "Middle East" },
  { iso2: "EG", name: "Egypt", region: "Middle East" },
  { iso2: "IR", name: "Iran", region: "Middle East" },
  { iso2: "IQ", name: "Iraq", region: "Middle East" },
  { iso2: "IL", name: "Israel", region: "Middle East" },
  { iso2: "JO", name: "Jordan", region: "Middle East" },
  { iso2: "KW", name: "Kuwait", region: "Middle East" },
  { iso2: "LB", name: "Lebanon", region: "Middle East" },
  { iso2: "OM", name: "Oman", region: "Middle East" },
  { iso2: "PS", name: "Palestine", region: "Middle East" },
  { iso2: "QA", name: "Qatar", region: "Middle East" },
  { iso2: "SA", name: "Saudi Arabia", region: "Middle East" },
  { iso2: "SY", name: "Syria", region: "Middle East" },
  { iso2: "TR", name: "Turkey", region: "Middle East / Europe" },
  { iso2: "AE", name: "United Arab Emirates", region: "Middle East" },
  { iso2: "YE", name: "Yemen", region: "Middle East" },

  // North America
  { iso2: "CA", name: "Canada", region: "North America" },
  { iso2: "MX", name: "Mexico", region: "North America" },
  { iso2: "US", name: "United States", region: "North America" },

  // Central America & Caribbean
  { iso2: "AG", name: "Antigua and Barbuda", region: "Caribbean" },
  { iso2: "BS", name: "Bahamas", region: "Caribbean" },
  { iso2: "BB", name: "Barbados", region: "Caribbean" },
  { iso2: "BZ", name: "Belize", region: "Central America" },
  { iso2: "CR", name: "Costa Rica", region: "Central America" },
  { iso2: "CU", name: "Cuba", region: "Caribbean" },
  { iso2: "DM", name: "Dominica", region: "Caribbean" },
  { iso2: "DO", name: "Dominican Republic", region: "Caribbean" },
  { iso2: "SV", name: "El Salvador", region: "Central America" },
  { iso2: "GD", name: "Grenada", region: "Caribbean" },
  { iso2: "GT", name: "Guatemala", region: "Central America" },
  { iso2: "HT", name: "Haiti", region: "Caribbean" },
  { iso2: "HN", name: "Honduras", region: "Central America" },
  { iso2: "JM", name: "Jamaica", region: "Caribbean" },
  { iso2: "NI", name: "Nicaragua", region: "Central America" },
  { iso2: "PA", name: "Panama", region: "Central America" },
  { iso2: "KN", name: "Saint Kitts and Nevis", region: "Caribbean" },
  { iso2: "LC", name: "Saint Lucia", region: "Caribbean" },
  { iso2: "VC", name: "Saint Vincent and the Grenadines", region: "Caribbean" },
  { iso2: "TT", name: "Trinidad and Tobago", region: "Caribbean" },

  // South America
  { iso2: "AR", name: "Argentina", region: "South America" },
  { iso2: "BO", name: "Bolivia", region: "South America" },
  { iso2: "BR", name: "Brazil", region: "South America" },
  { iso2: "CL", name: "Chile", region: "South America" },
  { iso2: "CO", name: "Colombia", region: "South America" },
  { iso2: "EC", name: "Ecuador", region: "South America" },
  { iso2: "GY", name: "Guyana", region: "South America" },
  { iso2: "PY", name: "Paraguay", region: "South America" },
  { iso2: "PE", name: "Peru", region: "South America" },
  { iso2: "SR", name: "Suriname", region: "South America" },
  { iso2: "UY", name: "Uruguay", region: "South America" },
  { iso2: "VE", name: "Venezuela", region: "South America" },

  // East / South / Southeast Asia
  { iso2: "AF", name: "Afghanistan", region: "South Asia" },
  { iso2: "BD", name: "Bangladesh", region: "South Asia" },
  { iso2: "BT", name: "Bhutan", region: "South Asia" },
  { iso2: "BN", name: "Brunei", region: "Southeast Asia" },
  { iso2: "KH", name: "Cambodia", region: "Southeast Asia" },
  { iso2: "CN", name: "China", region: "East Asia" },
  { iso2: "HK", name: "Hong Kong", region: "East Asia" },
  { iso2: "IN", name: "India", region: "South Asia" },
  { iso2: "ID", name: "Indonesia", region: "Southeast Asia" },
  { iso2: "JP", name: "Japan", region: "East Asia" },
  { iso2: "KP", name: "North Korea", region: "East Asia" },
  { iso2: "KR", name: "South Korea", region: "East Asia" },
  { iso2: "LA", name: "Laos", region: "Southeast Asia" },
  { iso2: "MO", name: "Macau", region: "East Asia" },
  { iso2: "MY", name: "Malaysia", region: "Southeast Asia" },
  { iso2: "MV", name: "Maldives", region: "South Asia" },
  { iso2: "MN", name: "Mongolia", region: "East Asia" },
  { iso2: "MM", name: "Myanmar", region: "Southeast Asia" },
  { iso2: "NP", name: "Nepal", region: "South Asia" },
  { iso2: "PK", name: "Pakistan", region: "South Asia" },
  { iso2: "PH", name: "Philippines", region: "Southeast Asia" },
  { iso2: "SG", name: "Singapore", region: "Southeast Asia" },
  { iso2: "LK", name: "Sri Lanka", region: "South Asia" },
  { iso2: "TW", name: "Taiwan", region: "East Asia" },
  { iso2: "TH", name: "Thailand", region: "Southeast Asia" },
  { iso2: "TL", name: "Timor-Leste", region: "Southeast Asia" },
  { iso2: "VN", name: "Vietnam", region: "Southeast Asia" },

  // Oceania
  { iso2: "AU", name: "Australia", region: "Oceania" },
  { iso2: "FJ", name: "Fiji", region: "Oceania" },
  { iso2: "NZ", name: "New Zealand", region: "Oceania" },
  { iso2: "PG", name: "Papua New Guinea", region: "Oceania" },
  { iso2: "WS", name: "Samoa", region: "Oceania" },
  { iso2: "SB", name: "Solomon Islands", region: "Oceania" },
  { iso2: "TO", name: "Tonga", region: "Oceania" },
  { iso2: "VU", name: "Vanuatu", region: "Oceania" },

  // Africa
  { iso2: "DZ", name: "Algeria", region: "Africa" },
  { iso2: "AO", name: "Angola", region: "Africa" },
  { iso2: "BJ", name: "Benin", region: "Africa" },
  { iso2: "BW", name: "Botswana", region: "Africa" },
  { iso2: "BF", name: "Burkina Faso", region: "Africa" },
  { iso2: "BI", name: "Burundi", region: "Africa" },
  { iso2: "CM", name: "Cameroon", region: "Africa" },
  { iso2: "CV", name: "Cape Verde", region: "Africa" },
  { iso2: "CF", name: "Central African Republic", region: "Africa" },
  { iso2: "TD", name: "Chad", region: "Africa" },
  { iso2: "KM", name: "Comoros", region: "Africa" },
  { iso2: "CG", name: "Congo", region: "Africa" },
  { iso2: "CD", name: "Congo (DRC)", region: "Africa" },
  { iso2: "CI", name: "Côte d'Ivoire", region: "Africa" },
  { iso2: "DJ", name: "Djibouti", region: "Africa" },
  { iso2: "GQ", name: "Equatorial Guinea", region: "Africa" },
  { iso2: "ER", name: "Eritrea", region: "Africa" },
  { iso2: "SZ", name: "Eswatini", region: "Africa" },
  { iso2: "ET", name: "Ethiopia", region: "Africa" },
  { iso2: "GA", name: "Gabon", region: "Africa" },
  { iso2: "GM", name: "Gambia", region: "Africa" },
  { iso2: "GH", name: "Ghana", region: "Africa" },
  { iso2: "GN", name: "Guinea", region: "Africa" },
  { iso2: "GW", name: "Guinea-Bissau", region: "Africa" },
  { iso2: "KE", name: "Kenya", region: "Africa" },
  { iso2: "LS", name: "Lesotho", region: "Africa" },
  { iso2: "LR", name: "Liberia", region: "Africa" },
  { iso2: "LY", name: "Libya", region: "Africa" },
  { iso2: "MG", name: "Madagascar", region: "Africa" },
  { iso2: "MW", name: "Malawi", region: "Africa" },
  { iso2: "ML", name: "Mali", region: "Africa" },
  { iso2: "MR", name: "Mauritania", region: "Africa" },
  { iso2: "MU", name: "Mauritius", region: "Africa" },
  { iso2: "MA", name: "Morocco", region: "Africa" },
  { iso2: "MZ", name: "Mozambique", region: "Africa" },
  { iso2: "NA", name: "Namibia", region: "Africa" },
  { iso2: "NE", name: "Niger", region: "Africa" },
  { iso2: "NG", name: "Nigeria", region: "Africa" },
  { iso2: "RW", name: "Rwanda", region: "Africa" },
  { iso2: "ST", name: "São Tomé and Príncipe", region: "Africa" },
  { iso2: "SN", name: "Senegal", region: "Africa" },
  { iso2: "SC", name: "Seychelles", region: "Africa" },
  { iso2: "SL", name: "Sierra Leone", region: "Africa" },
  { iso2: "SO", name: "Somalia", region: "Africa" },
  { iso2: "ZA", name: "South Africa", region: "Africa" },
  { iso2: "SS", name: "South Sudan", region: "Africa" },
  { iso2: "SD", name: "Sudan", region: "Africa" },
  { iso2: "TZ", name: "Tanzania", region: "Africa" },
  { iso2: "TG", name: "Togo", region: "Africa" },
  { iso2: "TN", name: "Tunisia", region: "Africa" },
  { iso2: "UG", name: "Uganda", region: "Africa" },
  { iso2: "ZM", name: "Zambia", region: "Africa" },
  { iso2: "ZW", name: "Zimbabwe", region: "Africa" },
].sort((a, b) => a.name.localeCompare(b.name));

export function worldCountryName(iso2: string): string {
  const hit = WORLD_COUNTRIES.find((c) => c.iso2 === iso2.toUpperCase());
  return hit?.name ?? iso2.toUpperCase();
}

const ASIA_ISO2 = new Set(["GE", "AM", "AZ", "TR", "RU"]);

/** Europe + Asia (incl. Caucasus, CIS, Middle East, and East/South/SE Asia). */
export function europeAndAsiaCountries(): Array<WorldCountry & { hoverRegion: "Europe" | "Asia" }> {
  return WORLD_COUNTRIES.flatMap((c) => {
    const hoverRegion = europeAsiaHoverRegion(c);
    return hoverRegion ? [{ ...c, hoverRegion }] : [];
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export function europeAsiaHoverRegion(country: WorldCountry): "Europe" | "Asia" | null {
  if (ASIA_ISO2.has(country.iso2)) return "Asia";
  const region = country.region;
  if (region === "Europe" || region.startsWith("Europe /")) return "Europe";
  if (
    region.includes("Asia") ||
    region.includes("Caucasus") ||
    region.includes("Middle East") ||
    region.includes("CIS")
  ) {
    return "Asia";
  }
  return null;
}
