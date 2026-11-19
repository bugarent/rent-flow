import { allSearchPlaces, findSearchPlace, type SearchPlace } from "@/lib/catalog/search-places";

type Tip = "sedan" | "standard" | "crossover" | "highway" | "mountain" | "either";
type Span = "city" | "small" | "medium" | "large";

export type WorldSpot = {
  name: string;
  km: string;
  time: string;
  tip: Tip;
  approx?: boolean;
};

type Row = readonly [name: string, km: string, time: string, tip: Tip, approx?: true];
type Pack = { capital: string; span: Span; sights: readonly Row[] };

const SPAN_BAND: Record<Span, { km: string; time: string }> = {
  city: { km: "2–20", time: "10–30 min" },
  small: { km: "15–120", time: "20 min–2 h" },
  medium: { km: "40–400", time: "45 min–4.5 h" },
  large: { km: "80–900", time: "1.5–12 h" },
};

/** Typical airport-to-city times. Pages that already have their own table never reach this. */
const AIRPORT_TRANSFER: Record<string, readonly [string, string]> = {
  FCO: ["30", "40 min"],
  MAD: ["15", "25 min"],
  BER: ["25", "40 min"],
  MUC: ["35", "40 min"],
  NRT: ["65", "1.5 h"],
  HND: ["20", "40 min"],
  LGW: ["45", "1 h"],
  STN: ["60", "1 h 15 min"],
  LTN: ["50", "1 h"],
  JFK: ["25", "50 min"],
  LAX: ["20", "40 min"],
  MIA: ["15", "25 min"],
  LIS: ["7", "15 min"],
  VIE: ["20", "25 min"],
  ZRH: ["12", "20 min"],
  GVA: ["5", "15 min"],
  DUB: ["12", "25 min"],
  BKK: ["30", "45 min"],
  DMK: ["25", "40 min"],
  HKT: ["35", "45 min"],
  CNX: ["5", "15 min"],
  SIN: ["20", "30 min"],
  HKG: ["40", "45 min"],
  ICN: ["60", "1 h"],
  GMP: ["20", "40 min"],
  DPS: ["15", "30 min"],
  CGK: ["25", "50 min"],
  SYD: ["10", "20 min"],
  MEL: ["25", "30 min"],
  AKL: ["20", "30 min"],
  YYZ: ["25", "40 min"],
  YVR: ["15", "25 min"],
  CUN: ["20", "30 min"],
  GRU: ["30", "45 min"],
  GIG: ["20", "30 min"],
  EZE: ["35", "45 min"],
  JNB: ["25", "30 min"],
  CPT: ["20", "25 min"],
  CAI: ["25", "40 min"],
  RAK: ["5", "15 min"],
  CMN: ["30", "40 min"],
  ORY: ["15", "30 min"],
  LIN: ["8", "20 min"],
  VCE: ["12", "20 min"],
  NAP: ["8", "15 min"],
  BSL: ["10", "20 min"],
  CPH: ["8", "20 min"],
  ARN: ["40", "40 min"],
  OSL: ["50", "45 min"],
  HEL: ["20", "30 min"],
  EDI: ["12", "25 min"],
  MAN: ["15", "30 min"],
  NCE: ["7", "15 min"],
  LYS: ["25", "30 min"],
  MRS: ["25", "30 min"],
  AGP: ["10", "15 min"],
  SVQ: ["10", "20 min"],
  PMI: ["10", "20 min"],
  BUD: ["20", "30 min"],
};

/** Drives measured from that city. Airport pages add the transfer in front. */
const CITY_DETAIL: Record<string, readonly Row[]> = {
  Paris: [
    ["Versailles", "15–25", "25–40 min", "sedan"],
    ["Fontainebleau", "55–70", "1 h", "highway"],
    ["Giverny", "75–90", "1 h 15 min", "highway"],
  ],
  Lyon: [
    ["Annecy", "100–140", "1.5–2 h", "highway"],
    ["Beaujolais", "40–60", "45–70 min", "sedan"],
  ],
  Nice: [
    ["Monaco", "15–25", "20–40 min", "sedan"],
    ["Cannes", "30–40", "35–50 min", "sedan"],
  ],
  Marseille: [
    ["Aix-en-Provence", "30–40", "30–45 min", "sedan"],
    ["Cassis", "20–30", "30–40 min", "sedan"],
  ],
  Rome: [
    ["Vatican City", "5–8", "20–40 min", "standard"],
    ["Tivoli", "30–40", "40–55 min", "sedan"],
  ],
  Florence: [
    ["Siena", "70–80", "1–1.5 h", "sedan"],
    ["Pisa", "80–90", "1 h 15 min", "highway"],
  ],
  Venice: [
    ["Padua", "40–50", "40–50 min", "sedan"],
    ["Verona", "110–130", "1 h 15 min–1.5 h", "highway"],
  ],
  Milan: [
    ["Lake Como", "45–55", "50–70 min", "sedan"],
    ["Bergamo", "50–60", "45–70 min", "highway"],
  ],
  Naples: [
    ["Pompeii", "25–30", "30–40 min", "sedan"],
    ["Amalfi Coast", "60–75", "1.5–2 h", "crossover"],
  ],
  Pisa: [
    ["Florence", "80–90", "1 h 15 min", "highway"],
    ["Cinque Terre", "80–100", "1.5 h", "sedan"],
  ],
  Madrid: [
    ["Toledo", "70–85", "1 h", "highway"],
    ["Segovia", "90–100", "1 h 15 min", "highway"],
  ],
  Barcelona: [
    ["Montserrat", "50–65", "1–1.5 h", "sedan"],
    ["Sitges", "35–45", "35–50 min", "highway"],
  ],
  Seville: [
    ["Córdoba", "140–150", "1.5 h", "highway"],
    ["Granada", "250–280", "2.5–3 h", "highway"],
  ],
  Málaga: [
    ["Granada", "130–150", "1.5–2 h", "highway"],
    ["Ronda", "100–120", "1.5–2 h", "crossover"],
  ],
  Lisbon: [
    ["Sintra", "25–35", "35–50 min", "sedan"],
    ["Cascais", "25–35", "30–45 min", "sedan"],
  ],
  Porto: [
    ["Douro Valley", "100–130", "1.5–2 h", "sedan"],
    ["Braga", "50–60", "45–60 min", "highway"],
  ],
  Athens: [
    ["Cape Sounion", "65–75", "1–1.5 h", "sedan"],
    ["Delphi", "180–200", "2.5–3 h", "highway"],
  ],
  Vienna: [
    ["Schönbrunn", "5–8", "20–30 min", "standard"],
    ["Hallstatt", "290–320", "3.5–4 h", "highway"],
  ],
  Salzburg: [
    ["Hallstatt", "75–90", "1 h 15 min–1.5 h", "sedan"],
    ["Lake Wolfgang", "30–40", "40–50 min", "sedan"],
  ],
  Zurich: [
    ["Lucerne", "50–60", "45–60 min", "highway"],
    ["Interlaken", "120–140", "1.5–2 h", "highway"],
  ],
  Geneva: [
    ["Lausanne", "60–70", "45–60 min", "highway"],
    ["Montreux", "90–100", "1–1.5 h", "highway"],
  ],
  Amsterdam: [
    ["Keukenhof", "30–40", "30–45 min", "sedan"],
    ["Utrecht", "40–50", "35–50 min", "highway"],
  ],
  Brussels: [
    ["Bruges", "90–110", "1–1.5 h", "highway"],
    ["Ghent", "50–60", "45–60 min", "highway"],
  ],
  Budapest: [
    ["Szentendre", "20–30", "30–40 min", "sedan"],
    ["Lake Balaton", "130–160", "1.5–2 h", "highway"],
  ],
  Dubrovnik: [
    ["Cavtat", "15–20", "20–30 min", "sedan"],
    ["Ston", "50–60", "1 h", "sedan"],
  ],
  Split: [
    ["Trogir", "20–30", "25–40 min", "sedan"],
    ["Klis", "15–20", "20–30 min", "sedan"],
  ],
  Zagreb: [
    ["Plitvice Lakes", "130–140", "2 h", "highway"],
    ["Lake Bled", "140–160", "2 h", "highway"],
  ],
  Berlin: [
    ["Potsdam", "30–40", "35–50 min", "sedan"],
    ["Dresden", "190–210", "2–2.5 h", "highway"],
  ],
  Munich: [
    ["Neuschwanstein", "120–140", "2 h", "sedan"],
    ["Salzburg", "140–160", "1.5–2 h", "highway"],
  ],
  Frankfurt: [
    ["Heidelberg", "80–95", "1 h", "highway"],
    ["Mainz", "35–45", "35–45 min", "highway"],
  ],
  Hamburg: [
    ["Lübeck", "60–70", "1 h", "highway"],
    ["Bremen", "120–130", "1 h 15 min", "highway"],
  ],
  Cologne: [
    ["Düsseldorf", "40–50", "40–55 min", "highway"],
    ["Aachen", "70–80", "1 h", "highway"],
  ],
  Düsseldorf: [
    ["Cologne", "40–50", "40–55 min", "highway"],
    ["Aachen", "80–90", "1 h", "highway"],
  ],
  Edinburgh: [
    ["Stirling", "50–60", "45–60 min", "highway"],
    ["St Andrews", "80–90", "1.5 h", "sedan"],
  ],
  London: [
    ["Windsor", "35–45", "40–60 min", "sedan"],
    ["Oxford", "90–100", "1.5–2 h", "highway"],
  ],
  Dublin: [
    ["Wicklow", "50–70", "1–1.5 h", "sedan"],
    ["Cliffs of Moher", "250–280", "3–3.5 h", "highway"],
  ],
  Prague: [
    ["Karlštejn", "30–40", "35–45 min", "sedan"],
    ["Kutná Hora", "70–85", "1 h", "highway"],
  ],
  Kraków: [
    ["Wieliczka", "15–20", "25–35 min", "sedan"],
    ["Zakopane", "100–120", "2–2.5 h", "mountain"],
  ],
  Warsaw: [
    ["Kraków", "290–310", "3.5–4 h", "highway"],
    ["Kazimierz Dolny", "140–160", "2–2.5 h", "sedan"],
  ],
  Bucharest: [
    ["Sinaia", "120–140", "1.5–2 h", "highway"],
    ["Brașov", "160–180", "2–2.5 h", "highway"],
  ],
  Sofia: [
    ["Rila Monastery", "110–130", "1.5–2 h", "crossover"],
    ["Plovdiv", "140–160", "1.5–2 h", "highway"],
  ],
  Stockholm: [
    ["Uppsala", "70–80", "1 h", "highway"],
    ["Drottningholm", "12–15", "20–30 min", "sedan"],
  ],
  Copenhagen: [
    ["Roskilde", "30–40", "30–40 min", "sedan"],
    ["Kronborg", "45–55", "45–55 min", "highway"],
  ],
  Oslo: [
    ["Holmenkollen", "10–15", "20–30 min", "sedan"],
    ["Lillehammer", "170–190", "2–2.5 h", "highway"],
  ],
  Helsinki: [
    ["Porvoo", "50–60", "45–55 min", "sedan"],
    ["Nuuksio", "30–40", "40–50 min", "sedan"],
  ],
  "New York": [
    ["Central Park", "5–15", "20–40 min", "standard"],
    ["Philadelphia", "140–170", "2–2.5 h", "highway"],
  ],
  "Los Angeles": [
    ["Santa Monica", "20–30", "30–50 min", "sedan"],
    ["San Diego", "190–210", "2–2.5 h", "highway"],
  ],
  Miami: [
    ["South Beach", "10–20", "20–40 min", "sedan"],
    ["Key West", "250–270", "3.5–4 h", "highway"],
  ],
  "Las Vegas": [
    ["Hoover Dam", "45–55", "45–60 min", "sedan"],
    ["Grand Canyon", "430–470", "4.5–5.5 h", "highway", true],
  ],
  "San Francisco": [
    ["Napa Valley", "70–90", "1–1.5 h", "sedan"],
    ["Yosemite", "280–320", "3.5–4.5 h", "mountain", true],
  ],
  Washington: [
    ["National Mall", "3–8", "15–25 min", "standard"],
    ["Mount Vernon", "25–30", "35–45 min", "sedan"],
  ],
  Chicago: [
    ["Millennium Park", "3–8", "15–30 min", "standard"],
    ["Milwaukee", "140–160", "1.5–2 h", "highway"],
  ],
  Boston: [
    ["Salem", "25–35", "35–45 min", "sedan"],
    ["Cape Cod", "100–130", "1.5–2 h", "highway"],
  ],
  Seattle: [
    ["Mount Rainier", "120–150", "2–2.5 h", "mountain"],
    ["Olympic National Park", "120–160", "2.5–3.5 h", "crossover", true],
  ],
  Toronto: [
    ["Niagara Falls", "125–140", "1.5 h", "highway"],
    ["CN Tower", "3–8", "15–25 min", "standard"],
  ],
  Vancouver: [
    ["Stanley Park", "3–8", "15–25 min", "standard"],
    ["Whistler", "120–130", "1.5–2 h", "mountain"],
  ],
  Montreal: [
    ["Quebec City", "250–270", "2.5–3 h", "highway"],
    ["Mont-Tremblant", "130–150", "1.5–2 h", "mountain"],
  ],
  Ottawa: [
    ["Gatineau", "8–15", "15–25 min", "sedan"],
    ["Montreal", "190–210", "2–2.5 h", "highway"],
  ],
  "Mexico City": [
    ["Teotihuacan", "45–55", "1–1.5 h", "sedan"],
    ["Puebla", "120–140", "2–2.5 h", "highway"],
  ],
  Cancún: [
    ["Chichen Itza", "190–210", "2–2.5 h", "highway"],
    ["Tulum", "120–140", "1.5–2 h", "highway"],
  ],
  "Rio de Janeiro": [
    ["Christ the Redeemer", "8–15", "25–40 min", "sedan"],
    ["Búzios", "170–190", "2.5–3 h", "highway"],
  ],
  "São Paulo": [
    ["Santos", "70–85", "1–1.5 h", "highway"],
    ["Campos do Jordão", "170–190", "2.5–3 h", "mountain"],
  ],
  "Buenos Aires": [
    ["Tigre", "30–40", "40–55 min", "sedan"],
    ["La Plata", "55–70", "1–1.5 h", "highway"],
  ],
  Lima: [
    ["Pachacamac", "30–40", "45–70 min", "sedan"],
    ["Paracas", "240–270", "3–3.5 h", "highway"],
  ],
  Cusco: [
    ["Sacred Valley", "30–50", "45–75 min", "crossover"],
    ["Ollantaytambo", "60–80", "1.5–2 h", "crossover"],
  ],
  "Cape Town": [
    ["Table Mountain", "5–15", "20–40 min", "sedan"],
    ["Cape Point", "60–75", "1–1.5 h", "sedan"],
  ],
  Johannesburg: [
    ["Soweto", "15–25", "30–45 min", "sedan"],
    ["Pretoria", "50–65", "50–70 min", "highway"],
  ],
  Marrakesh: [
    ["Essaouira", "170–190", "2.5–3 h", "highway"],
    ["Ourika Valley", "30–40", "45–60 min", "sedan"],
  ],
  Casablanca: [
    ["Hassan II Mosque", "5–10", "15–25 min", "standard"],
    ["Rabat", "90–100", "1–1.5 h", "highway"],
  ],
  Fes: [
    ["Medina of Fez", "2–6", "10–20 min", "standard"],
    ["Meknes", "60–70", "1 h", "highway"],
  ],
  Cairo: [
    ["Giza Pyramids", "15–25", "30–50 min", "sedan"],
    ["Alexandria", "220–250", "2.5–3.5 h", "highway"],
  ],
  Luxor: [
    ["Valley of the Kings", "8–15", "20–30 min", "sedan"],
    ["Karnak", "3–6", "10–20 min", "standard"],
  ],
  Dubai: [
    ["Palm Jumeirah", "20–30", "25–40 min", "sedan"],
    ["Abu Dhabi", "130–150", "1.5 h", "highway"],
  ],
  "Abu Dhabi": [
    ["Sheikh Zayed Mosque", "10–20", "20–30 min", "sedan"],
    ["Dubai", "130–150", "1.5 h", "highway"],
  ],
  Tokyo: [
    ["Mount Fuji", "100–130", "2–2.5 h", "highway"],
    ["Nara Park", "450–500", "5–6 h", "highway", true],
  ],
  Kyoto: [
    ["Fushimi Inari", "3–8", "15–25 min", "standard"],
    ["Nara Park", "40–50", "45–60 min", "sedan"],
  ],
  Osaka: [
    ["Kyoto", "45–60", "45–70 min", "highway"],
    ["Nara Park", "30–40", "40–55 min", "sedan"],
  ],
  Bangkok: [
    ["Grand Palace", "5–12", "20–45 min", "standard"],
    ["Ayutthaya", "70–85", "1–1.5 h", "highway"],
  ],
  "Chiang Mai": [
    ["Old Town", "3–8", "15–25 min", "standard"],
    ["Doi Suthep", "15–20", "30–45 min", "crossover"],
  ],
  Phuket: [
    ["Old Town", "10–15", "20–30 min", "sedan"],
    ["Patong", "15–20", "25–40 min", "sedan"],
  ],
  Hanoi: [
    ["Old Town", "3–8", "15–30 min", "standard"],
    ["Ha Long Bay", "150–170", "2.5–3.5 h", "highway"],
  ],
  "Siem Reap": [
    ["Angkor Wat", "6–10", "15–25 min", "sedan"],
    ["Tonle Sap", "15–20", "30–40 min", "sedan"],
  ],
  Singapore: [
    ["Marina Bay", "15–25", "25–40 min", "sedan"],
    ["Sentosa", "15–25", "25–40 min", "sedan"],
  ],
  Sydney: [
    ["Bondi Beach", "8–12", "20–35 min", "sedan"],
    ["Blue Mountains", "100–120", "1.5–2 h", "highway"],
  ],
  Melbourne: [
    ["Great Ocean Road", "100–160", "1.5–2.5 h", "sedan"],
    ["Phillip Island", "140–150", "1.5–2 h", "highway"],
  ],
  Jerusalem: [
    ["Old Town", "2–6", "15–30 min", "standard"],
    ["Dead Sea", "30–40", "40–50 min", "sedan"],
  ],
  "Tel Aviv": [
    ["Jaffa", "5–8", "15–25 min", "standard"],
    ["Jerusalem", "60–70", "1–1.5 h", "highway"],
  ],
  Amman: [
    ["Petra", "230–250", "3–3.5 h", "highway"],
    ["Dead Sea", "50–60", "50–70 min", "highway"],
  ],
  Reykjavik: [
    ["Blue Lagoon", "45–50", "45–55 min", "sedan"],
    ["Golden Circle", "100–120", "2.5–3.5 h", "sedan", true],
  ],
  Valletta: [
    ["Mdina", "12–15", "20–30 min", "sedan"],
    ["Blue Lagoon", "15–25", "40–70 min", "either", true],
  ],
  Khirdalan: [
    ["Baku", "10–20", "20–40 min", "sedan"],
    ["Gobustan", "60–90", "1–1.5 h", "sedan"],
  ],
  Mingachevir: [
    ["Ganja", "80–100", "1–1.5 h", "highway"],
    ["Baku", "260–300", "3.5–4.5 h", "highway"],
  ],
  Shirvan: [
    ["Baku", "110–140", "1.5–2 h", "highway"],
    ["Gobustan", "70–90", "1–1.5 h", "sedan"],
  ],
  Ohrid: [
    ["Saint Naum", "25–30", "30–40 min", "sedan"],
    ["Skopje", "160–180", "2.5–3 h", "highway"],
  ],
  Prizren: [
    ["Pristina", "70–90", "1 h 15 min–1.5 h", "highway"],
    ["Gjakova", "30–40", "40–50 min", "sedan"],
  ],
  Niš: [
    ["Belgrade", "230–250", "2.5–3 h", "highway"],
    ["Đavolja Varoš", "80–100", "1.5–2 h", "crossover"],
  ],
  Zadar: [
    ["Nin", "15–25", "20–30 min", "sedan"],
    ["Šibenik", "70–85", "1–1.5 h", "highway"],
  ],
};

const PACKS: Record<string, Pack> = {
  AL: { capital: "Tirana", span: "small", sights: [["Krujë", "30–40", "40–50 min", "sedan"], ["Durrës", "35–45", "35–50 min", "highway"]] },
  AD: { capital: "Andorra la Vella", span: "city", sights: [["Grandvalira", "20–30", "30–40 min", "mountain"], ["Ordino", "8–12", "15–20 min", "sedan"]] },
  AT: { capital: "Vienna", span: "small", sights: [["Schönbrunn", "5–8", "20–30 min", "standard"], ["Hallstatt", "290–320", "3.5–4 h", "highway"]] },
  BY: { capital: "Minsk", span: "medium", sights: [["Mir Castle", "90–100", "1.5 h", "highway"], ["Nesvizh", "120–130", "1.5–2 h", "highway"]] },
  BE: { capital: "Brussels", span: "small", sights: [["Bruges", "90–110", "1–1.5 h", "highway"], ["Ghent", "50–60", "45–60 min", "highway"]] },
  BA: { capital: "Sarajevo", span: "small", sights: [["Mostar Bridge", "120–140", "2–2.5 h", "highway"], ["Jajce", "140–160", "2.5–3 h", "crossover"]] },
  BG: { capital: "Sofia", span: "small", sights: [["Rila Monastery", "110–130", "1.5–2 h", "crossover"], ["Plovdiv", "140–160", "1.5–2 h", "highway"]] },
  HR: { capital: "Zagreb", span: "medium", sights: [["Plitvice Lakes", "130–140", "2 h", "highway"], ["Split", "380–410", "4–4.5 h", "highway"]] },
  CY: { capital: "Nicosia", span: "small", sights: [["Larnaca", "45–55", "40–50 min", "highway"], ["Troodos", "60–80", "1–1.5 h", "mountain"]] },
  CZ: { capital: "Prague", span: "small", sights: [["Karlštejn", "30–40", "35–45 min", "sedan"], ["Český Krumlov", "170–180", "2–2.5 h", "highway"]] },
  DK: { capital: "Copenhagen", span: "small", sights: [["Roskilde", "30–40", "30–40 min", "sedan"], ["Kronborg", "45–55", "45–55 min", "highway"]] },
  EE: { capital: "Tallinn", span: "small", sights: [["Old Town", "2–5", "10–20 min", "standard"], ["Lahemaa", "70–80", "1–1.5 h", "sedan"]] },
  FI: { capital: "Helsinki", span: "medium", sights: [["Porvoo", "50–60", "45–55 min", "sedan"], ["Suomenlinna", "5–8", "20–30 min", "either"]] },
  FR: { capital: "Paris", span: "medium", sights: [["Versailles", "15–25", "25–40 min", "sedan"], ["Mont-Saint-Michel", "320–360", "3.5–4.5 h", "highway"]] },
  DE: { capital: "Berlin", span: "medium", sights: [["Potsdam", "30–40", "35–50 min", "sedan"], ["Dresden", "190–210", "2–2.5 h", "highway"]] },
  GR: { capital: "Athens", span: "medium", sights: [["Cape Sounion", "65–75", "1–1.5 h", "sedan"], ["Delphi", "180–200", "2.5–3 h", "highway"]] },
  HU: { capital: "Budapest", span: "small", sights: [["Szentendre", "20–30", "30–40 min", "sedan"], ["Lake Balaton", "130–160", "1.5–2 h", "highway"]] },
  IS: { capital: "Reykjavik", span: "small", sights: [["Blue Lagoon", "45–50", "45–55 min", "sedan"], ["Golden Circle", "100–120", "2.5–3.5 h", "sedan", true]] },
  IE: { capital: "Dublin", span: "small", sights: [["Wicklow", "50–70", "1–1.5 h", "sedan"], ["Cliffs of Moher", "250–280", "3–3.5 h", "highway"]] },
  IT: { capital: "Rome", span: "medium", sights: [["Vatican City", "5–8", "20–40 min", "standard"], ["Tivoli", "30–40", "40–55 min", "sedan"]] },
  XK: { capital: "Pristina", span: "small", sights: [["Prizren", "80–90", "1.5 h", "highway"], ["Gračanica", "10–12", "15–20 min", "sedan"]] },
  LV: { capital: "Riga", span: "small", sights: [["Jūrmala", "20–25", "30–40 min", "sedan"], ["Sigulda", "50–55", "50–60 min", "sedan"]] },
  LI: { capital: "Vaduz", span: "city", sights: [["Vaduz Castle", "1–3", "10–15 min", "standard"], ["Malbun", "15–20", "25–30 min", "mountain"]] },
  LT: { capital: "Vilnius", span: "small", sights: [["Trakai", "25–30", "30–40 min", "sedan"], ["Kaunas", "100–110", "1 h 15 min", "highway"]] },
  LU: { capital: "Luxembourg", span: "city", sights: [["Vianden", "40–50", "40–50 min", "sedan"], ["Echternach", "30–35", "30–40 min", "sedan"]] },
  MT: { capital: "Valletta", span: "city", sights: [["Mdina", "12–15", "20–30 min", "sedan"], ["Blue Lagoon", "15–25", "40–70 min", "either", true]] },
  MD: { capital: "Chișinău", span: "small", sights: [["Orheiul Vechi", "50–60", "1 h", "sedan"], ["Cricova", "15–20", "25–30 min", "sedan"]] },
  MC: { capital: "Monaco", span: "city", sights: [["Monte Carlo", "1–3", "10–15 min", "standard"], ["Nice", "15–25", "20–40 min", "sedan"]] },
  ME: { capital: "Podgorica", span: "small", sights: [["Cetinje", "30–40", "35–45 min", "sedan"], ["Kotor", "90–100", "1.5 h", "highway"]] },
  NL: { capital: "Amsterdam", span: "small", sights: [["Keukenhof", "30–40", "30–45 min", "sedan"], ["Zaanse Schans", "15–20", "20–30 min", "sedan"]] },
  MK: { capital: "Skopje", span: "medium", sights: [["Lake Ohrid", "170–180", "2.5–3 h", "highway"], ["Matka Canyon", "15–20", "25–30 min", "sedan"]] },
  NO: { capital: "Oslo", span: "medium", sights: [["Holmenkollen", "10–15", "20–30 min", "sedan"], ["Lillehammer", "170–190", "2–2.5 h", "highway"]] },
  PL: { capital: "Warsaw", span: "medium", sights: [["Kraków", "290–310", "3.5–4 h", "highway"], ["Kazimierz Dolny", "140–160", "2–2.5 h", "sedan"]] },
  PT: { capital: "Lisbon", span: "small", sights: [["Sintra", "25–35", "35–50 min", "sedan"], ["Cascais", "25–35", "30–45 min", "sedan"]] },
  RO: { capital: "Bucharest", span: "medium", sights: [["Sinaia", "120–140", "1.5–2 h", "highway"], ["Bran Castle", "160–190", "2.5–3 h", "highway"]] },
  RU: { capital: "Moscow", span: "large", sights: [["Suzdal", "220–240", "3.5–4.5 h", "highway"], ["Sergiev Posad", "70–80", "1.5 h", "highway"]] },
  SM: { capital: "San Marino", span: "city", sights: [["Guaita", "1–3", "10–20 min", "standard"], ["Rimini", "25–30", "30–40 min", "sedan"]] },
  RS: { capital: "Belgrade", span: "medium", sights: [["Novi Sad", "80–95", "1–1.5 h", "highway"], ["Topola", "80–90", "1 h", "highway"]] },
  SK: { capital: "Bratislava", span: "small", sights: [["Devín", "10–15", "20–25 min", "sedan"], ["Trenčín", "120–130", "1.5 h", "highway"]] },
  SI: { capital: "Ljubljana", span: "small", sights: [["Lake Bled", "50–60", "45–60 min", "highway"], ["Postojna", "50–55", "45–55 min", "highway"]] },
  ES: { capital: "Madrid", span: "medium", sights: [["Toledo", "70–85", "1 h", "highway"], ["Segovia", "90–100", "1 h 15 min", "highway"]] },
  SE: { capital: "Stockholm", span: "medium", sights: [["Uppsala", "70–80", "1 h", "highway"], ["Drottningholm", "12–15", "20–30 min", "sedan"]] },
  CH: { capital: "Bern", span: "small", sights: [["Interlaken", "55–65", "1 h", "highway"], ["Lucerne", "110–120", "1.5 h", "highway"]] },
  UA: { capital: "Kyiv", span: "large", sights: [["Chernihiv", "140–160", "2–2.5 h", "highway"], ["Uman", "200–220", "2.5–3 h", "highway"]] },
  GB: { capital: "London", span: "medium", sights: [["Windsor", "35–45", "40–60 min", "sedan"], ["Oxford", "90–100", "1.5–2 h", "highway"]] },
  VA: { capital: "Vatican City", span: "city", sights: [["St. Peter's", "1–2", "10–20 min", "standard"], ["Colosseum", "5–7", "20–35 min", "standard"]] },
  AM: { capital: "Yerevan", span: "small", sights: [["Garni", "30–35", "40–50 min", "sedan"], ["Lake Sevan", "60–70", "1 h", "highway"]] },
  AZ: { capital: "Baku", span: "medium", sights: [["Gobustan", "60–70", "1 h", "sedan"], ["Gabala", "200–230", "3–3.5 h", "highway"]] },
  GE: { capital: "Tbilisi", span: "small", sights: [["Mtskheta", "20–25", "25–35 min", "sedan"], ["Kazbegi", "150–160", "2.5–3 h", "mountain"]] },
  KZ: { capital: "Astana", span: "large", sights: [["Bayterek", "2–6", "15–25 min", "standard"], ["Burabay", "250–280", "3–3.5 h", "highway", true]] },
  KG: { capital: "Bishkek", span: "medium", sights: [["Ala-Archa", "35–45", "40–60 min", "crossover"], ["Issyk-Kul", "180–220", "3–4 h", "highway", true]] },
  TJ: { capital: "Dushanbe", span: "medium", sights: [["Hissar Fortress", "25–30", "30–40 min", "sedan"], ["Varzob", "20–30", "30–40 min", "crossover"]] },
  TM: { capital: "Ashgabat", span: "large", sights: [["Nisa", "15–20", "20–30 min", "sedan"], ["Kow-Ata", "90–110", "1.5–2 h", "sedan", true]] },
  UZ: { capital: "Tashkent", span: "medium", sights: [["Samarkand", "300–340", "4–5 h", "highway", true], ["Chimgan", "80–90", "1.5–2 h", "mountain"]] },
  BH: { capital: "Manama", span: "city", sights: [["Bahrain Fort", "6–10", "15–25 min", "sedan"], ["Al Areen", "25–30", "30–40 min", "sedan"]] },
  EG: { capital: "Cairo", span: "large", sights: [["Giza Pyramids", "15–25", "30–50 min", "sedan"], ["Alexandria", "220–250", "2.5–3.5 h", "highway"]] },
  IR: { capital: "Tehran", span: "large", sights: [["Golestan Palace", "5–12", "20–40 min", "standard"], ["Isfahan", "430–470", "5–6 h", "highway", true]] },
  IQ: { capital: "Baghdad", span: "medium", sights: [["National Museum", "3–8", "15–30 min", "standard"], ["Babylon", "85–100", "1.5–2 h", "highway", true]] },
  IL: { capital: "Jerusalem", span: "small", sights: [["Old Town", "2–6", "15–30 min", "standard"], ["Dead Sea", "30–40", "40–50 min", "sedan"]] },
  JO: { capital: "Amman", span: "small", sights: [["Jerash", "45–55", "45–60 min", "highway"], ["Dead Sea", "50–60", "50–70 min", "highway"]] },
  KW: { capital: "Kuwait City", span: "city", sights: [["Kuwait Towers", "3–8", "15–25 min", "standard"], ["Failaka Island", "20–30", "1–1.5 h", "either", true]] },
  LB: { capital: "Beirut", span: "small", sights: [["Byblos", "35–45", "40–55 min", "highway"], ["Jeita Grotto", "20–25", "30–40 min", "sedan"]] },
  OM: { capital: "Muscat", span: "medium", sights: [["Mutrah", "3–8", "15–25 min", "standard"], ["Nizwa", "160–180", "1.5–2 h", "highway"]] },
  PS: { capital: "Ramallah", span: "small", sights: [["Bethlehem", "25–35", "40–60 min", "sedan"], ["Jericho", "40–50", "45–70 min", "sedan", true]] },
  QA: { capital: "Doha", span: "city", sights: [["Souq Waqif", "5–12", "15–30 min", "standard"], ["Al Zubarah", "100–110", "1.5 h", "highway"]] },
  SA: { capital: "Riyadh", span: "large", sights: [["Diriyah", "15–25", "25–40 min", "sedan"], ["Edge of the World", "80–100", "1.5–2 h", "crossover", true]] },
  SY: { capital: "Damascus", span: "medium", sights: [["Old Town", "2–6", "15–30 min", "standard"], ["Maaloula", "50–60", "1–1.5 h", "crossover", true]] },
  TR: { capital: "Ankara", span: "large", sights: [["Anıtkabir", "3–8", "15–25 min", "standard"], ["Cappadocia", "270–300", "3–3.5 h", "highway"]] },
  AE: { capital: "Abu Dhabi", span: "small", sights: [["Sheikh Zayed Mosque", "10–20", "20–30 min", "sedan"], ["Dubai", "130–150", "1.5 h", "highway"]] },
  YE: { capital: "Sana'a", span: "medium", sights: [["Old Town", "2–6", "15–30 min", "standard"], ["Dar al-Hajar", "15–20", "30–40 min", "sedan", true]] },
  CA: { capital: "Ottawa", span: "large", sights: [["Gatineau", "8–15", "15–25 min", "sedan"], ["Montreal", "190–210", "2–2.5 h", "highway"]] },
  MX: { capital: "Mexico City", span: "large", sights: [["Teotihuacan", "45–55", "1–1.5 h", "sedan"], ["Puebla", "120–140", "2–2.5 h", "highway"]] },
  US: { capital: "Washington", span: "large", sights: [["National Mall", "3–8", "15–25 min", "standard"], ["Mount Vernon", "25–30", "35–45 min", "sedan"]] },
  AG: { capital: "St. John's", span: "city", sights: [["Nelson's Dockyard", "15–20", "25–35 min", "sedan"], ["Shirley Heights", "15–20", "25–35 min", "sedan"]] },
  BS: { capital: "Nassau", span: "small", sights: [["Paradise Island", "5–10", "15–25 min", "sedan"], ["Blue Lagoon", "20–40", "40–70 min", "either", true]] },
  BB: { capital: "Bridgetown", span: "city", sights: [["Bathsheba", "15–20", "30–40 min", "sedan"], ["Harrison's Cave", "15–20", "25–35 min", "sedan"]] },
  BZ: { capital: "Belmopan", span: "small", sights: [["San Ignacio", "30–40", "40–50 min", "sedan"], ["Belize Zoo", "20–30", "25–35 min", "sedan"]] },
  CR: { capital: "San José", span: "small", sights: [["Poás Volcano", "40–50", "1–1.5 h", "mountain"], ["Irazú", "30–40", "1 h", "mountain"]] },
  CU: { capital: "Havana", span: "medium", sights: [["Old Town", "2–6", "15–30 min", "standard"], ["Viñales", "180–200", "2.5–3 h", "sedan"]] },
  DM: { capital: "Roseau", span: "city", sights: [["Trafalgar Falls", "8–12", "25–35 min", "crossover"], ["Cabrits", "40–50", "1–1.5 h", "crossover"]] },
  DO: { capital: "Santo Domingo", span: "small", sights: [["Zona Colonial", "2–6", "15–25 min", "standard"], ["Boca Chica", "30–35", "30–40 min", "highway"]] },
  SV: { capital: "San Salvador", span: "small", sights: [["El Boquerón", "15–20", "30–40 min", "sedan"], ["Suchitoto", "45–55", "1 h", "sedan"]] },
  GD: { capital: "St. George's", span: "city", sights: [["Grand Anse", "8–12", "15–25 min", "sedan"], ["Grand Etang", "15–20", "30–40 min", "crossover"]] },
  GT: { capital: "Guatemala City", span: "small", sights: [["Antigua Guatemala", "40–50", "1–1.5 h", "highway"], ["Lake Atitlán", "130–150", "2.5–3.5 h", "mountain", true]] },
  HT: { capital: "Port-au-Prince", span: "small", sights: [["Citadelle Laferrière", "140–160", "3.5–4.5 h", "crossover", true], ["Jacmel", "90–110", "2.5–3.5 h", "crossover", true]] },
  HN: { capital: "Tegucigalpa", span: "small", sights: [["Valle de Ángeles", "20–30", "30–40 min", "sedan"], ["Comayagua", "80–90", "1.5 h", "highway"]] },
  JM: { capital: "Kingston", span: "small", sights: [["Blue Mountains", "25–40", "1–1.5 h", "mountain"], ["Port Antonio", "90–110", "2–2.5 h", "highway", true]] },
  NI: { capital: "Managua", span: "small", sights: [["Granada", "45–50", "45–60 min", "highway"], ["León", "90–100", "1.5 h", "highway"]] },
  PA: { capital: "Panama City", span: "small", sights: [["Casco Viejo", "5–10", "15–30 min", "standard"], ["Panama Canal", "15–25", "25–40 min", "sedan"]] },
  KN: { capital: "Basseterre", span: "city", sights: [["Brimstone Hill", "12–18", "25–35 min", "sedan"], ["Frigate Bay", "5–8", "10–15 min", "sedan"]] },
  LC: { capital: "Castries", span: "city", sights: [["Pigeon Island", "15–20", "30–40 min", "sedan"], ["Soufrière", "30–40", "1–1.5 h", "crossover"]] },
  VC: { capital: "Kingstown", span: "city", sights: [["Botanic Gardens", "2–5", "10–20 min", "standard"], ["Owia Salt Pond", "40–50", "1.5 h", "crossover", true]] },
  TT: { capital: "Port of Spain", span: "small", sights: [["Maracas Bay", "15–20", "35–50 min", "crossover"], ["Caroni Bird Sanctuary", "10–15", "25–35 min", "sedan"]] },
  AR: { capital: "Buenos Aires", span: "large", sights: [["Tigre", "30–40", "40–55 min", "sedan"], ["La Plata", "55–70", "1–1.5 h", "highway"]] },
  BO: { capital: "La Paz", span: "medium", sights: [["Moon Valley", "10–15", "25–35 min", "sedan"], ["Lake Titicaca", "70–90", "2–2.5 h", "crossover", true]] },
  BR: { capital: "Brasília", span: "large", sights: [["Cathedral of Brasília", "3–8", "15–25 min", "standard"], ["Pirenópolis", "140–160", "2–2.5 h", "highway"]] },
  CL: { capital: "Santiago", span: "large", sights: [["Valparaíso", "110–120", "1.5–2 h", "highway"], ["Cajón del Maipo", "40–60", "1–1.5 h", "crossover"]] },
  CO: { capital: "Bogotá", span: "large", sights: [["Zipaquirá", "45–50", "1–1.5 h", "highway"], ["Villa de Leyva", "160–180", "3–3.5 h", "highway", true]] },
  EC: { capital: "Quito", span: "medium", sights: [["Mitad del Mundo", "20–25", "40–50 min", "sedan"], ["Otavalo", "90–110", "2–2.5 h", "highway"]] },
  GY: { capital: "Georgetown", span: "medium", sights: [["Stabroek Market", "1–4", "10–20 min", "standard"], ["St. George's Cathedral", "1–3", "10–20 min", "standard"]] },
  PY: { capital: "Asunción", span: "medium", sights: [["Itaipú", "320–350", "4–5 h", "highway", true], ["San Bernardino", "45–55", "1 h", "highway"]] },
  PE: { capital: "Lima", span: "large", sights: [["Pachacamac", "30–40", "45–70 min", "sedan"], ["Paracas", "240–270", "3–3.5 h", "highway"]] },
  SR: { capital: "Paramaribo", span: "small", sights: [["Fort Zeelandia", "1–4", "10–20 min", "standard"], ["Commewijne", "20–30", "30–45 min", "sedan"]] },
  UY: { capital: "Montevideo", span: "small", sights: [["Old Town", "2–6", "15–25 min", "standard"], ["Punta del Este", "130–140", "1.5–2 h", "highway"]] },
  VE: { capital: "Caracas", span: "medium", sights: [["El Ávila", "10–20", "30–50 min", "crossover"], ["Colonia Tovar", "60–70", "1.5–2 h", "mountain"]] },
  AF: { capital: "Kabul", span: "medium", sights: [["Babur Gardens", "3–8", "15–30 min", "standard"], ["Paghman", "20–30", "40–60 min", "crossover", true]] },
  BD: { capital: "Dhaka", span: "medium", sights: [["Lalbagh Fort", "3–8", "20–40 min", "standard"], ["Sonargaon", "25–30", "1–1.5 h", "highway", true]] },
  BT: { capital: "Thimphu", span: "small", sights: [["Buddha Dordenma", "8–12", "20–30 min", "sedan"], ["Paro", "50–55", "1–1.5 h", "mountain"]] },
  BN: { capital: "Bandar Seri Begawan", span: "city", sights: [["Omar Ali Saifuddien Mosque", "2–5", "10–20 min", "standard"], ["Kampong Ayer", "3–8", "15–25 min", "either"]] },
  KH: { capital: "Phnom Penh", span: "medium", sights: [["Royal Palace", "2–6", "15–30 min", "standard"], ["Siem Reap", "310–320", "5–6 h", "highway", true]] },
  CN: { capital: "Beijing", span: "large", sights: [["Forbidden City", "3–8", "20–40 min", "standard"], ["Great Wall", "60–80", "1.5–2 h", "highway"]] },
  HK: { capital: "Hong Kong", span: "city", sights: [["Victoria Peak", "8–15", "25–40 min", "sedan"], ["Big Buddha", "25–35", "40–60 min", "sedan"]] },
  IN: { capital: "Delhi", span: "large", sights: [["Red Fort", "3–10", "20–40 min", "standard"], ["Taj Mahal", "200–230", "3–4 h", "highway"]] },
  ID: { capital: "Jakarta", span: "large", sights: [["Old Town", "5–12", "30–50 min", "standard"], ["Bogor", "50–60", "1.5–2.5 h", "highway", true]] },
  JP: { capital: "Tokyo", span: "large", sights: [["Mount Fuji", "100–130", "2–2.5 h", "highway"], ["Kamakura", "50–60", "1–1.5 h", "sedan"]] },
  KP: { capital: "Pyongyang", span: "medium", sights: [["Juche Tower", "2–6", "15–25 min", "standard"], ["Kaesong", "160–180", "2.5–3 h", "highway", true]] },
  KR: { capital: "Seoul", span: "medium", sights: [["Gyeongbokgung", "3–8", "20–40 min", "standard"], ["Suwon", "40–50", "50–70 min", "highway"]] },
  LA: { capital: "Vientiane", span: "medium", sights: [["Pha That Luang", "3–6", "15–25 min", "sedan"], ["Buddha Park", "20–25", "30–40 min", "sedan"]] },
  MO: { capital: "Macau", span: "city", sights: [["Historic Centre", "2–6", "15–25 min", "standard"], ["Coloane", "8–12", "20–30 min", "sedan"]] },
  MY: { capital: "Kuala Lumpur", span: "medium", sights: [["Batu Caves", "12–15", "25–40 min", "sedan"], ["Malacca", "140–150", "2–2.5 h", "highway"]] },
  MV: { capital: "Malé", span: "city", sights: [["Old Friday Mosque", "1–3", "10–20 min", "standard"], ["Hulhumalé", "8–10", "20–30 min", "either"]] },
  MN: { capital: "Ulaanbaatar", span: "large", sights: [["Gandan Monastery", "2–6", "15–25 min", "standard"], ["Terelj", "50–70", "1–1.5 h", "crossover"]] },
  MM: { capital: "Naypyidaw", span: "medium", sights: [["Uppatasanti Pagoda", "3–8", "15–25 min", "sedan"], ["Yangon", "320–360", "5–6 h", "highway", true]] },
  NP: { capital: "Kathmandu", span: "small", sights: [["Swayambhunath", "3–6", "20–35 min", "standard"], ["Bhaktapur", "12–15", "30–45 min", "sedan"]] },
  PK: { capital: "Islamabad", span: "large", sights: [["Faisal Mosque", "8–15", "20–35 min", "sedan"], ["Lahore", "370–390", "4.5–5.5 h", "highway", true]] },
  PH: { capital: "Manila", span: "large", sights: [["Intramuros", "3–8", "20–40 min", "standard"], ["Tagaytay", "60–70", "1.5–2 h", "highway"]] },
  SG: { capital: "Singapore", span: "city", sights: [["Marina Bay", "15–25", "25–40 min", "sedan"], ["Sentosa", "15–25", "25–40 min", "sedan"]] },
  LK: { capital: "Colombo", span: "small", sights: [["Galle", "120–130", "2–2.5 h", "highway"], ["Kandy", "115–125", "3–3.5 h", "highway", true]] },
  TW: { capital: "Taipei", span: "small", sights: [["Taipei 101", "3–8", "15–30 min", "standard"], ["Jiufen", "35–40", "1–1.5 h", "crossover"]] },
  TH: { capital: "Bangkok", span: "medium", sights: [["Grand Palace", "5–12", "20–45 min", "standard"], ["Ayutthaya", "70–85", "1–1.5 h", "highway"]] },
  TL: { capital: "Dili", span: "small", sights: [["Cristo Rei", "5–8", "15–25 min", "sedan"], ["Areia Branca", "5–8", "15–20 min", "sedan"]] },
  VN: { capital: "Hanoi", span: "large", sights: [["Old Town", "3–8", "15–30 min", "standard"], ["Ha Long Bay", "150–170", "2.5–3.5 h", "highway"]] },
  AU: { capital: "Canberra", span: "large", sights: [["Parliament House", "3–6", "10–20 min", "standard"], ["Sydney", "280–290", "3–3.5 h", "highway"]] },
  FJ: { capital: "Suva", span: "small", sights: [["Colo-i-Suva", "10–15", "25–35 min", "sedan"], ["Pacific Harbour", "45–50", "1 h", "highway"]] },
  NZ: { capital: "Wellington", span: "medium", sights: [["Te Papa", "1–4", "10–20 min", "standard"], ["Martinborough", "70–80", "1–1.5 h", "sedan"]] },
  PG: { capital: "Port Moresby", span: "medium", sights: [["National Museum", "2–6", "15–25 min", "standard"], ["Varirata", "40–50", "1–1.5 h", "crossover", true]] },
  WS: { capital: "Apia", span: "city", sights: [["Robert Louis Stevenson Museum", "4–6", "15–20 min", "sedan"], ["Lalomanu", "60–70", "1.5–2 h", "crossover", true]] },
  SB: { capital: "Honiara", span: "city", sights: [["US War Memorial", "8–12", "20–30 min", "sedan"], ["Bonegi Beach", "10–15", "20–30 min", "sedan"]] },
  TO: { capital: "Nukuʻalofa", span: "city", sights: [["Royal Palace", "1–3", "10–15 min", "standard"], ["Haʻamonga", "30–35", "40–50 min", "sedan"]] },
  VU: { capital: "Port Vila", span: "city", sights: [["Hideaway Island", "8–12", "20–30 min", "sedan"], ["Mele Cascades", "10–12", "20–30 min", "sedan"]] },
  DZ: { capital: "Algiers", span: "large", sights: [["Casbah", "2–6", "15–30 min", "standard"], ["Tipaza", "70–80", "1–1.5 h", "highway"]] },
  AO: { capital: "Luanda", span: "large", sights: [["Ilha de Luanda", "5–10", "20–35 min", "sedan"], ["Miradouro da Lua", "40–50", "45–70 min", "sedan", true]] },
  BJ: { capital: "Porto-Novo", span: "small", sights: [["Ouidah", "40–50", "1 h", "highway", true], ["Ganvié", "20–30", "40–60 min", "sedan", true]] },
  BW: { capital: "Gaborone", span: "medium", sights: [["Gaborone Game Reserve", "5–10", "15–25 min", "sedan"], ["Manyana rock paintings", "50–60", "1 h", "sedan", true]] },
  BF: { capital: "Ouagadougou", span: "medium", sights: [["National Museum", "2–6", "15–25 min", "standard"], ["Laongo", "30–40", "40–60 min", "sedan", true]] },
  BI: { capital: "Gitega", span: "small", sights: [["National Museum", "1–4", "10–20 min", "standard"], ["Karera Falls", "40–60", "1.5–2 h", "crossover", true]] },
  CM: { capital: "Yaoundé", span: "medium", sights: [["Benedictine Monastery", "15–20", "30–40 min", "sedan"], ["Kribi", "250–280", "4–5 h", "highway", true]] },
  CV: { capital: "Praia", span: "small", sights: [["Plateau", "1–4", "10–20 min", "standard"], ["Cidade Velha", "12–15", "20–30 min", "sedan"]] },
  CF: { capital: "Bangui", span: "medium", sights: [["Boganda Museum", "2–6", "15–25 min", "standard"], ["Boali Falls", "90–100", "1.5–2 h", "crossover", true]] },
  TD: { capital: "N'Djamena", span: "large", sights: [["National Museum", "2–6", "15–25 min", "standard"], ["Gaoui", "10–15", "20–30 min", "sedan", true]] },
  KM: { capital: "Moroni", span: "city", sights: [["Old Friday Mosque", "1–4", "10–20 min", "standard"], ["Mount Karthala", "15–25", "40–70 min", "crossover", true]] },
  CG: { capital: "Brazzaville", span: "medium", sights: [["Basilica", "5–10", "15–25 min", "sedan"], ["Lesio-Louna", "140–160", "3–4 h", "crossover", true]] },
  CD: { capital: "Kinshasa", span: "large", sights: [["Académie des Beaux-Arts", "3–8", "20–40 min", "standard"], ["Lola ya Bonobo", "30–40", "1–1.5 h", "sedan", true]] },
  CI: { capital: "Yamoussoukro", span: "medium", sights: [["Basilica of Our Lady of Peace", "2–6", "10–20 min", "standard"], ["Abidjan", "230–250", "3–3.5 h", "highway", true]] },
  DJ: { capital: "Djibouti", span: "small", sights: [["Hamoudi Mosque", "2–6", "15–25 min", "standard"], ["Lake Assal", "110–120", "2–2.5 h", "crossover", true]] },
  GQ: { capital: "Malabo", span: "small", sights: [["Malabo Cathedral", "1–4", "10–20 min", "standard"], ["Arena Blanca", "15–25", "30–50 min", "sedan", true]] },
  ER: { capital: "Asmara", span: "small", sights: [["Fiat Tagliero", "1–4", "10–20 min", "standard"], ["Massawa", "110–120", "2.5–3.5 h", "highway", true]] },
  SZ: { capital: "Mbabane", span: "small", sights: [["Mantenga", "10–15", "20–30 min", "sedan"], ["Ezulwini", "15–20", "20–30 min", "sedan"]] },
  ET: { capital: "Addis Ababa", span: "large", sights: [["National Museum", "2–6", "15–30 min", "standard"], ["Entoto", "10–15", "30–45 min", "crossover"]] },
  GA: { capital: "Libreville", span: "medium", sights: [["Pointe-Denis", "5–15", "20–40 min", "sedan", true], ["Lambaréné", "230–260", "4–5 h", "highway", true]] },
  GM: { capital: "Banjul", span: "small", sights: [["Albert Market", "1–4", "10–20 min", "standard"], ["Abuko Nature Reserve", "20–25", "30–40 min", "sedan"]] },
  GH: { capital: "Accra", span: "medium", sights: [["Kwame Nkrumah Memorial", "2–6", "15–30 min", "standard"], ["Cape Coast", "140–160", "2.5–3.5 h", "highway", true]] },
  GN: { capital: "Conakry", span: "medium", sights: [["Îles de Los", "5–10", "20–35 min", "sedan", true], ["Kindia", "130–140", "2.5–3.5 h", "highway", true]] },
  GW: { capital: "Bissau", span: "small", sights: [["Fortaleza de São José", "1–4", "10–20 min", "standard"], ["Bubaque", "20–40", "2–4 h", "either", true]] },
  KE: { capital: "Nairobi", span: "medium", sights: [["Nairobi National Park", "8–15", "20–40 min", "sedan"], ["Lake Naivasha", "90–100", "1.5–2 h", "highway"]] },
  LS: { capital: "Maseru", span: "small", sights: [["Thaba-Bosiu", "20–25", "30–40 min", "sedan"], ["Maletsunyane Falls", "150–180", "3–4 h", "crossover", true]] },
  LR: { capital: "Monrovia", span: "small", sights: [["Providence Island", "1–4", "15–25 min", "standard"], ["Robertsport", "110–130", "2.5–3.5 h", "crossover", true]] },
  LY: { capital: "Tripoli", span: "large", sights: [["Red Castle Museum", "1–5", "15–25 min", "standard"], ["Leptis Magna", "120–130", "1.5–2 h", "highway"]] },
  MG: { capital: "Antananarivo", span: "large", sights: [["Rova", "2–6", "20–35 min", "standard"], ["Ambohimanga", "20–25", "40–60 min", "sedan"]] },
  MW: { capital: "Lilongwe", span: "medium", sights: [["Lilongwe Nature Sanctuary", "2–6", "15–25 min", "standard"], ["Lake Malawi", "100–120", "2–2.5 h", "highway", true]] },
  ML: { capital: "Bamako", span: "large", sights: [["National Museum", "3–8", "20–35 min", "standard"], ["Siby", "50–60", "1–1.5 h", "sedan", true]] },
  MR: { capital: "Nouakchott", span: "large", sights: [["Port de Pêche", "5–10", "20–30 min", "sedan"], ["Banc d'Arguin", "250–300", "4–6 h", "crossover", true]] },
  MU: { capital: "Port Louis", span: "city", sights: [["Caudan", "1–4", "10–20 min", "standard"], ["Black River Gorges", "40–50", "1–1.5 h", "sedan"]] },
  MA: { capital: "Rabat", span: "medium", sights: [["Hassan Tower", "1–4", "10–20 min", "standard"], ["Casablanca", "90–100", "1–1.5 h", "highway"]] },
  MZ: { capital: "Maputo", span: "large", sights: [["Central Market", "1–5", "15–25 min", "standard"], ["Inhaca", "10–20", "1.5–2.5 h", "either", true]] },
  NA: { capital: "Windhoek", span: "large", sights: [["Christuskirche", "1–4", "10–20 min", "standard"], ["Hosea Kutako", "40–50", "40–50 min", "highway"]] },
  NE: { capital: "Niamey", span: "large", sights: [["National Museum", "2–6", "15–30 min", "standard"], ["Grand Mosque", "2–6", "15–25 min", "standard"]] },
  NG: { capital: "Abuja", span: "large", sights: [["Aso Rock", "5–12", "20–35 min", "sedan"], ["Zuma Rock", "40–50", "45–60 min", "highway"]] },
  RW: { capital: "Kigali", span: "small", sights: [["Kigali Genocide Memorial", "3–8", "20–30 min", "sedan"], ["Nyungwe", "220–250", "5–6 h", "mountain", true]] },
  ST: { capital: "São Tomé", span: "city", sights: [["Cathedral", "1–3", "10–15 min", "standard"], ["Praia Piscina", "8–12", "20–30 min", "sedan"]] },
  SN: { capital: "Dakar", span: "small", sights: [["Gorée Island", "3–8", "20–40 min", "standard"], ["Lake Retba", "35–45", "1–1.5 h", "sedan"]] },
  SC: { capital: "Victoria", span: "city", sights: [["Sir Selwyn Clarke Market", "1–3", "10–15 min", "standard"], ["Beau Vallon", "8–12", "20–30 min", "sedan"]] },
  SL: { capital: "Freetown", span: "small", sights: [["Cotton Tree", "1–4", "15–25 min", "standard"], ["River Number Two", "25–35", "1–1.5 h", "crossover", true]] },
  SO: { capital: "Mogadishu", span: "medium", sights: [["Lido beach", "5–12", "20–40 min", "sedan", true], ["Old port", "2–6", "15–30 min", "standard", true]] },
  ZA: { capital: "Pretoria", span: "large", sights: [["Union Buildings", "2–6", "15–25 min", "standard"], ["Johannesburg", "50–65", "50–70 min", "highway"]] },
  SS: { capital: "Juba", span: "large", sights: [["John Garang Mausoleum", "2–6", "15–30 min", "standard", true], ["Nimule", "180–200", "4–5 h", "crossover", true]] },
  SD: { capital: "Khartoum", span: "large", sights: [["National Museum", "3–8", "20–35 min", "standard"], ["Meroë", "200–220", "3–3.5 h", "highway", true]] },
  TZ: { capital: "Dodoma", span: "large", sights: [["Kondoa", "80–120", "2–3 h", "crossover", true], ["Dar es Salaam", "440–480", "6–8 h", "highway", true]] },
  TG: { capital: "Lomé", span: "small", sights: [["Independence Monument", "1–4", "10–20 min", "standard"], ["Kpalimé", "120–130", "2–2.5 h", "highway"]] },
  TN: { capital: "Tunis", span: "medium", sights: [["Carthage", "15–20", "25–40 min", "sedan"], ["Sidi Bou Said", "18–25", "30–45 min", "sedan"]] },
  UG: { capital: "Kampala", span: "medium", sights: [["Kasubi Tombs", "5–8", "20–35 min", "sedan"], ["Jinja", "80–90", "1.5–2 h", "highway"]] },
  ZM: { capital: "Lusaka", span: "large", sights: [["Kabwata", "3–8", "15–25 min", "standard"], ["Lower Zambezi", "150–180", "3–4 h", "crossover", true]] },
  ZW: { capital: "Harare", span: "medium", sights: [["National Gallery", "1–4", "10–20 min", "standard"], ["Great Zimbabwe", "280–300", "4–4.5 h", "highway", true]] },
};

function fold(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function namesPlace(sight: string, place: string): boolean {
  const a = fold(sight);
  const b = fold(place);
  if (!a || !b) return false;
  if (a === b) return true;
  return b.length >= 4 && (a.includes(b) || b.includes(a));
}

function spot(row: Row): WorldSpot {
  const [name, km, time, tip, approx] = row;
  return approx ? { name, km, time, tip, approx: true } : { name, km, time, tip };
}

let detailByFold: Map<string, readonly Row[]> | null = null;
function cityRows(city: string): readonly Row[] | undefined {
  if (!detailByFold) {
    detailByFold = new Map();
    for (const [key, rows] of Object.entries(CITY_DETAIL)) detailByFold.set(fold(key), rows);
  }
  return detailByFold.get(fold(city));
}

let cityIndex: Map<string, SearchPlace> | null = null;
function placeByCity(city: string): SearchPlace | undefined {
  if (!cityIndex) {
    cityIndex = new Map();
    for (const place of allSearchPlaces()) {
      const key = fold(place.cityName);
      const prev = cityIndex.get(key);
      if (!prev || (place.kind === "city" && prev.kind !== "city")) cityIndex.set(key, place);
    }
  }
  return cityIndex.get(fold(city));
}

function resolve(code: string, cityName?: string): SearchPlace | undefined {
  return findSearchPlace(code) || placeByCity((cityName || "").trim());
}

function airportLeg(place: SearchPlace): WorldSpot | null {
  if (place.kind !== "airport") return null;
  const known = AIRPORT_TRANSFER[place.iata || place.code];
  if (known) return { name: place.cityName, km: known[0], time: known[1], tip: "sedan" };
  return { name: place.cityName, km: "15–30", time: "20–40 min", tip: "sedan", approx: true };
}

function fromPack(pack: Pack, city: string, leg: WorldSpot | null): WorldSpot[] {
  const here = fold(city) === fold(pack.capital);
  if (here) {
    const sights = pack.sights.filter((row) => !namesPlace(row[0], city)).map(spot);
    return leg ? [leg, ...sights] : sights;
  }
  const band = SPAN_BAND[pack.span];
  const capital: WorldSpot = { name: pack.capital, km: band.km, time: band.time, tip: "highway", approx: true };
  const sights = pack.sights
    .filter((row) => !namesPlace(row[0], city) && !namesPlace(row[0], pack.capital))
    .map((row) => ({ name: row[0], km: band.km, time: band.time, tip: row[3], approx: true as const }));
  return leg ? [leg, capital, ...sights] : [capital, ...sights];
}

/** Sights and approximate times for places that have no hand-measured drive table. */
export function worldDriveSpots(code: string, cityName?: string): WorldSpot[] {
  const place = resolve(code, cityName);
  if (!place) {
    const detail = cityRows((cityName || "").trim());
    return detail ? detail.map(spot) : [];
  }
  const leg = airportLeg(place);
  const detail = cityRows(place.cityName);
  if (detail?.length) {
    const sights = detail.filter((row) => !namesPlace(row[0], place.cityName)).map(spot);
    if (sights.length) return leg ? [leg, ...sights] : sights;
  }
  const pack = PACKS[place.countryIso2];
  if (!pack) return leg ? [leg] : [];
  return fromPack(pack, place.cityName, leg);
}
