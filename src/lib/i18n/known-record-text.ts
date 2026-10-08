import type { Locale } from "@/lib/i18n/config";

type Row = Record<Locale, string>;

function row(
  en: string,
  ka: string,
  de: string,
  es: string,
  fr: string,
  it: string,
  nl: string,
  pl: string,
  tr: string,
  ru: string,
  ar: string,
  zh: string,
  ko: string,
  th: string,
): Row {
  return { en, ka, de, es, fr, it, nl, pl, tr, ru, ar, zh, ko, th };
}

const TABLE = new Map<string, Row>();
const BY_NORM = new Map<string, Row>();

function normKey(source: string) {
  return source
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function looseKey(source: string) {
  return normKey(source)
    .replace(/\s+/g, " ")
    .replace(/[.!?…]+$/g, "")
    .trim()
    .toLowerCase();
}

function indexPhrase(phrase: string, values: Row) {
  const norm = normKey(phrase);
  if (!norm) return;
  BY_NORM.set(norm, values);
  BY_NORM.set(norm.toLowerCase(), values);
  BY_NORM.set(norm.replace(/\s+/g, " "), values);
  BY_NORM.set(norm.replace(/\s+/g, " ").toLowerCase(), values);
  const loose = looseKey(phrase);
  if (loose) BY_NORM.set(loose, values);
}

function add(source: string, values: Row) {
  TABLE.set(source, values);
  indexPhrase(source, values);
  for (const phrase of Object.values(values)) indexPhrase(phrase, values);
}

function lookup(source: string): Row | undefined {
  const direct = TABLE.get(source);
  if (direct) return direct;
  const norm = normKey(source);
  return (
    BY_NORM.get(norm) ||
    BY_NORM.get(norm.toLowerCase()) ||
    BY_NORM.get(norm.replace(/\s+/g, " ")) ||
    BY_NORM.get(norm.replace(/\s+/g, " ").toLowerCase()) ||
    BY_NORM.get(looseKey(source))
  );
}

function pick(row: Row, locale: string) {
  const value = row[locale as Locale];
  return value && value.trim() ? value : row.en;
}

/** Show a known stored phrase in the selected language. Unknown text stays as saved. */
export function knownText(locale: string, source: string): string {
  const raw = String(source ?? "");
  if (!raw.trim()) return raw;
  const hit = lookup(raw);
  if (hit) return pick(hit, locale);
  if (raw.includes("\n")) {
    let changed = false;
    const lines = raw.split("\n").map((line) => {
      const row = lookup(line);
      if (!row) return line;
      changed = true;
      return pick(row, locale);
    });
    if (changed) return lines.join("\n");
  }
  return raw;
}

function alias(variant: string, canonical: string) {
  const row = TABLE.get(canonical);
  if (!row) return;
  TABLE.set(variant, row);
  indexPhrase(variant, row);
}

add(
  "Why Choose Us",
  row(
    "Why Choose Us",
    "რატომ ჩვენ",
    "Warum wir",
    "Por qué elegirnos",
    "Pourquoi nous choisir",
    "Perché sceglierci",
    "Waarom wij",
    "Dlaczego my",
    "Neden biz",
    "Почему мы",
    "لماذا نحن",
    "为什么选择我们",
    "선택 이유",
    "ทำไมต้องเรา",
  ),
);
add(
  "How it Works",
  row(
    "How it Works",
    "როგორ მუშაობს",
    "So funktioniert es",
    "Cómo funciona",
    "Comment ça marche",
    "Come funziona",
    "Hoe het werkt",
    "Jak to działa",
    "Nasıl çalışır",
    "Как это работает",
    "كيف يعمل",
    "如何运作",
    "이용 방법",
    "วิธีการทำงาน",
  ),
);
add(
  "Trust",
  row("Trust", "ნდობა", "Vertrauen", "Confianza", "Confiance", "Fiducia", "Vertrouwen", "Zaufanie", "Güven", "Доверие", "الثقة", "信任", "신뢰", "ความเชื่อมั่น"),
);
add(
  "Best Price",
  row("Best Price", "საუკეთესო ფასი", "Bester Preis", "Mejor precio", "Meilleur prix", "Miglior prezzo", "Beste prijs", "Najlepsza cena", "En iyi fiyat", "Лучшая цена", "أفضل سعر", "最优价格", "최저가", "ราคาดีที่สุด"),
);
add(
  "24/7 Support",
  row("24/7 Support", "მხარდაჭერა 24/7", "Support 24/7", "Soporte 24/7", "Assistance 24/7", "Assistenza 24/7", "Support 24/7", "Wsparcie 24/7", "7/24 destek", "Поддержка 24/7", "دعم على مدار الساعة", "全天候支持", "24시간 지원", "ซัพพอร์ต 24/7"),
);
add(
  "Verified partners, moderated fleets, and transparent airport delivery you can count on.",
  row(
    "Verified partners, moderated fleets, and transparent airport delivery you can count on.",
    "დამოწმებული პარტნიორები, შემოწმებული ავტოპარკი და გამჭვირვალე აეროპორტის მიწოდება.",
    "Geprüfte Partner, moderierte Flotten und eine klare Flughafenübergabe, auf die Sie sich verlassen können.",
    "Socios verificados, flotas moderadas y entrega en el aeropuerto de forma clara.",
    "Partenaires vérifiés, flottes modérées et remise à l’aéroport en toute clarté.",
    "Partner verificati, flotte controllate e consegna in aeroporto chiara e affidabile.",
    "Geverifieerde partners, gemodereerde vloten en een duidelijke luchthavenoverdracht.",
    "Zweryfikowani partnerzy, moderowane floty i przejrzysty odbiór na lotnisku.",
    "Doğrulanmış ortaklar, denetlenen filolar ve güvenebileceğiniz şeffaf havalimanı teslimi.",
    "Проверенные партнёры, модерируемый парк и прозрачная выдача в аэропорту.",
    "شركاء موثّقون وأساطيل خاضعة للمراجعة وتسليم واضح في المطار.",
    "经过审核的合作方、受监管的车队，以及你可以信赖的透明机场交付。",
    "검증된 파트너, 검토된 차량, 믿을 수 있는 투명한 공항 인도.",
    "พาร์ทเนอร์ที่ยืนยันแล้ว กองรถที่ผ่านการตรวจ และการส่งมอบที่สนามบินอย่างโปร่งใส",
  ),
);
add(
  "Compare daily rates with TPL included free. Pay a small online deposit, balance on site.",
  row(
    "Compare daily rates with TPL included free. Pay a small online deposit, balance on site.",
    "შეადარეთ დღიური ტარიფები — TPL უფასოდ შედის. მცირე ონლაინ დეპოზიტი, დანარჩენი ადგილზე.",
    "Vergleichen Sie Tagessätze mit kostenloser Haftpflicht. Kleine Online-Anzahlung, Rest vor Ort.",
    "Compare tarifas diarias con RC incluida gratis. Un pequeño depósito en línea y el resto en el lugar.",
    "Comparez les tarifs journaliers avec la RC offerte. Un petit acompte en ligne, le solde sur place.",
    "Confronta le tariffe giornaliere con la RC inclusa. Un piccolo acconto online, il saldo sul posto.",
    "Vergelijk dagtarieven met gratis WA. Een kleine aanbetaling online, de rest ter plaatse.",
    "Porównaj stawki dzienne z darmowym OC. Mała zaliczka online, reszta na miejscu.",
    "Günlük fiyatları ücretsiz TPL ile karşılaştırın. Küçük çevrimiçi depozito, kalanı yerinde.",
    "Сравнивайте суточные цены с бесплатной ОСАГО-защитой. Небольшой онлайн-депозит, остаток на месте.",
    "قارن الأسعار اليومية مع مسؤولية الطرف الثالث مجانًا. عربون صغير عبر الإنترنت والباقي في الموقع.",
    "对比含免费第三者责任险的日租金。线上支付少量订金，余额现场支付。",
    "무료 제3자 책임이 포함된 일일 요금을 비교하세요. 소액은 온라인, 잔액은 현장에서.",
    "เทียบราคารายวันพร้อม TPL ฟรี จ่ายมัดจำเล็กน้อยออนไลน์ ส่วนที่เหลือจ่ายหน้างาน",
  ),
);
add(
  "WhatsApp and messenger assistance around the clock for flight delays and custom requests.",
  row(
    "WhatsApp and messenger assistance around the clock for flight delays and custom requests.",
    "WhatsApp და მესენჯერი 24 საათი — ფრენის დაგვიანება და განსაკუთრებული მოთხოვნები.",
    "WhatsApp- und Messenger-Hilfe rund um die Uhr bei Verspätungen und Sonderwünschen.",
    "Ayuda por WhatsApp y mensajería las 24 horas para retrasos y peticiones especiales.",
    "Aide WhatsApp et messagerie 24h/24 pour retards de vol et demandes particulières.",
    "Assistenza WhatsApp e messenger 24 ore su 24 per ritardi e richieste speciali.",
    "WhatsApp- en messengerhulp dag en nacht bij vertragingen en speciale verzoeken.",
    "Pomoc przez WhatsApp i komunikatory całą dobę przy opóźnieniach i prośbach specjalnych.",
    "Uçuş gecikmeleri ve özel istekler için 7/24 WhatsApp ve mesajlaşma desteği.",
    "Помощь в WhatsApp и мессенджерах круглосуточно при задержках рейсов и особых запросах.",
    "مساعدة عبر واتساب والمراسلات على مدار الساعة لتأخير الرحلات والطلبات الخاصة.",
    "航班延误和特殊需求可随时通过 WhatsApp 和即时消息获得帮助。",
    "항공편 지연과 특별 요청을 위해 WhatsApp과 메신저로 24시간 도움.",
    "ความล่าช้าของเที่ยวบินและคำขอพิเศษ ช่วยผ่าน WhatsApp และข้อความตลอด 24 ชั่วโมง",
  ),
);
add("Search", row("Search", "ძებნა", "Suchen", "Buscar", "Rechercher", "Cerca", "Zoeken", "Szukaj", "Ara", "Поиск", "بحث", "搜索", "검색", "ค้นหา"));
add("Book", row("Book", "დაჯავშნა", "Buchen", "Reservar", "Réserver", "Prenota", "Boeken", "Rezerwuj", "Rezerve et", "Бронь", "احجز", "预订", "예약", "จอง"));
add("Pick Up", row("Pick Up", "აღება", "Abholen", "Recoger", "Retrait", "Ritiro", "Ophalen", "Odbiór", "Teslim al", "Получение", "الاستلام", "取车", "픽업", "รับรถ"));
add(
  "Drive Away",
  row("Drive Away", "გაუშვით", "Losfahren", "Salir", "Partez", "Parti", "Wegrijden", "Odjedź", "Yola çık", "Поехали", "انطلق", "出发", "출발", "ออกเดินทาง"),
);
add(
  "Choose airport, dates, and vehicle category.",
  row(
    "Choose airport, dates, and vehicle category.",
    "აირჩიეთ აეროპორტი, თარიღები და კატეგორია.",
    "Wählen Sie Flughafen, Daten und Fahrzeugkategorie.",
    "Elija aeropuerto, fechas y categoría.",
    "Choisissez l’aéroport, les dates et la catégorie.",
    "Scegli aeroporto, date e categoria.",
    "Kies luchthaven, datums en categorie.",
    "Wybierz lotnisko, daty i kategorię.",
    "Havalimanı, tarihler ve araç kategorisini seçin.",
    "Выберите аэропорт, даты и категорию.",
    "اختر المطار والتواريخ والفئة.",
    "选择机场、日期和车辆类别。",
    "공항, 날짜, 차량 분류를 선택하세요.",
    "เลือกสนามบิน วันที่ และหมวดรถ",
  ),
);
add(
  "Confirm with your flight number and a small deposit.",
  row(
    "Confirm with your flight number and a small deposit.",
    "დაადასტურეთ რეისის ნომრით და მცირე დეპოზიტით.",
    "Bestätigen Sie mit Flugnummer und einer kleinen Anzahlung.",
    "Confirme con el número de vuelo y un pequeño depósito.",
    "Confirmez avec le numéro de vol et un petit acompte.",
    "Conferma con il numero del volo e un piccolo acconto.",
    "Bevestig met vluchtnummer en een kleine aanbetaling.",
    "Potwierdź numerem lotu i małą zaliczką.",
    "Uçuş numarası ve küçük bir depozito ile onaylayın.",
    "Подтвердите номером рейса и небольшим депозитом.",
    "أكّد برقم الرحلة وعربون صغير.",
    "用航班号和少量订金确认。",
    "항공편 번호와 소액 보증금으로 확인하세요.",
    "ยืนยันด้วยหมายเลขเที่ยวบินและมัดจำเล็กน้อย",
  ),
);
add(
  "Meet your car at arrivals, timed to your flight.",
  row(
    "Meet your car at arrivals, timed to your flight.",
    "მანქანა გელოდებათ ჩამოსვლაზე, რეისის დროის მიხედვით.",
    "Ihr Wagen wartet an der Ankunft, abgestimmt auf den Flug.",
    "Su coche le espera en llegadas, según su vuelo.",
    "Votre voiture vous attend aux arrivées, calée sur votre vol.",
    "L’auto ti aspetta agli arrivi, in linea con il volo.",
    "Je auto wacht bij aankomst, afgestemd op je vlucht.",
    "Auto czeka w przylotach, zgodnie z lotem.",
    "Aracınız uçuşunuza göre varışta sizi bekler.",
    "Машина ждёт в зоне прилёта по времени рейса.",
    "سيارتك بانتظارك عند الوصول وفق موعد الرحلة.",
    "车辆按航班时间在到达区等候。",
    "항공편 시간에 맞춰 도착 구역에서 차량이 기다립니다.",
    "รถรอที่จุดมาถึงตามเวลาเที่ยวบิน",
  ),
);
add(
  "Pay the remaining balance on site and go.",
  row(
    "Pay the remaining balance on site and go.",
    "დარჩენილი თანხა გადაიხადეთ ადგილზე და გაუშვით.",
    "Zahlen Sie den Restbetrag vor Ort und fahren Sie los.",
    "Pague el saldo en el lugar y marche.",
    "Payez le solde sur place et partez.",
    "Paga il saldo sul posto e parti.",
    "Betaal het restbedrag ter plaatse en rijd weg.",
    "Zapłać resztę na miejscu i jedź.",
    "Kalan bakiyeyi yerinde ödeyip yola çıkın.",
    "Оплатите остаток на месте и поезжайте.",
    "ادفع المتبقي في الموقع وانطلق.",
    "在现场支付余额后即可出发。",
    "잔액은 현장에서 내고 출발하세요.",
    "จ่ายยอดที่เหลือหน้างานแล้วออกเดินทาง",
  ),
);
add("Shield", row("Shield", "ფარი", "Schild", "Escudo", "Bouclier", "Scudo", "Schild", "Tarcza", "Kalkan", "Щит", "درع", "盾牌", "방패", "โล่"));
add("Tag / Price", row("Tag / Price", "ფასი", "Preis", "Precio", "Prix", "Prezzo", "Prijs", "Cena", "Fiyat", "Цена", "السعر", "价格", "가격", "ราคา"));
add("Clock / Support", row("Clock / Support", "მხარდაჭერა", "Support", "Soporte", "Assistance", "Assistenza", "Support", "Wsparcie", "Destek", "Поддержка", "الدعم", "支持", "지원", "ช่วยเหลือ"));
add("Key / Book", row("Key / Book", "ჯავშანი", "Buchen", "Reservar", "Réserver", "Prenota", "Boeken", "Rezerwuj", "Rezervasyon", "Бронь", "الحجز", "预订", "예약", "จอง"));
add("Car", row("Car", "მანქანა", "Auto", "Coche", "Voiture", "Auto", "Auto", "Samochód", "Araç", "Авто", "سيارة", "汽车", "차량", "รถยนต์"));
add("Navigation", row("Navigation", "ნავიგაცია", "Navigation", "Navegación", "Navigation", "Navigazione", "Navigatie", "Nawigacja", "Navigasyon", "Навигация", "الملاحة", "导航", "내비게이션", "นำทาง"));

const EXTRAS: Array<[string, Row]> = [
  ["TPL — Third Party Liability", row("TPL — Third Party Liability", "TPL — მესამე პირის პასუხისმგებლობა", "TPL — Haftpflicht", "TPL — Responsabilidad civil", "TPL — Responsabilité civile", "TPL — Responsabilità civile", "TPL — Wettelijke aansprakelijkheid", "TPL — OC", "TPL — Üçüncü şahıs mali mesuliyet", "TPL — Ответственность перед третьими лицами", "TPL — مسؤولية الطرف الثالث", "TPL — 第三者责任险", "TPL — 제3자 배상책임", "TPL — ความรับผิดต่อบุคคลภายนอก")],
  ["Included free by default on every rental.", row("Included free by default on every rental.", "ყოველ გაქირავებაში უფასოდ შედის.", "Bei jeder Miete standardmäßig kostenlos enthalten.", "Incluido gratis en cada alquiler.", "Inclus gratuitement à chaque location.", "Incluso gratis in ogni noleggio.", "Standaard gratis bij elke huur.", "Domyślnie gratis przy każdym wynajmie.", "Her kiralamada varsayılan olarak ücretsiz dahildir.", "По умолчанию бесплатно в каждой аренде.", "مشمول مجانًا في كل إيجار.", "每次租车默认免费包含。", "모든 대여에 기본으로 무료 포함.", "รวมฟรีในทุกการเช่า")],
  ["Basic coverage", row("Basic coverage", "საბაზისო დაფარვა", "Basisschutz", "Cobertura básica", "Couverture de base", "Copertura base", "Basisdekking", "Ochrona podstawowa", "Temel güvence", "Базовое покрытие", "تغطية أساسية", "基础保障", "기본 보장", "ความคุ้มครองพื้นฐาน")],
  ["Standard collision excess cover.", row("Standard collision excess cover.", "სტანდარტული შეჯახების ფრანშიზა.", "Standard-Selbstbeteiligung bei Kollision.", "Franquicia estándar por colisión.", "Franchise collision standard.", "Franchigia collisione standard.", "Standaard eigen risico bij aanrijding.", "Standardowy udział własny przy kolizji.", "Standart çarpışma muafiyeti.", "Стандартная франшиза при столкновении.", "تحمل قياسي لتصادم.", "标准碰撞免赔。", "표준 충돌 자기부담금.", "ความเสียหายส่วนแรกจากการชนแบบมาตรฐาน")],
  ["Full coverage", row("Full coverage", "სრული დაფარვა", "Vollschutz", "Cobertura completa", "Couverture complète", "Copertura completa", "Volledige dekking", "Pełna ochrona", "Tam güvence", "Полное покрытие", "تغطية كاملة", "全额保障", "완전 보장", "ความคุ้มครองเต็มรูปแบบ")],
  ["Full protection with 0 franchise where available.", row("Full protection with 0 franchise where available.", "სრული დაცვა ნულოვანი ფრანშიზით, სადაც ხელმისაწვდომია.", "Vollschutz mit 0 € Selbstbeteiligung, wo verfügbar.", "Protección total con franquicia 0 donde esté disponible.", "Protection complète avec franchise 0 si disponible.", "Protezione completa con franchigia 0 dove disponibile.", "Volledige bescherming met 0 eigen risico waar beschikbaar.", "Pełna ochrona z udziałem własnym 0, gdzie dostępne.", "Mümkün olan yerde 0 muafiyetli tam koruma.", "Полная защита с нулевой франшизой, где доступно.", "حماية كاملة بدون تحمل حيثما توفرت.", "在可用地区提供 0 免赔的全面保障。", "가능한 경우 자기부담금 0의 완전 보호.", "ความคุ้มครองเต็มที่ความเสียหายส่วนแรก 0 หากมีให้บริการ")],
  ["Child safety seat (up to 1 year old)", row("Child safety seat (up to 1 year old)", "ბავშვის სავარძელი (1 წლამდე)", "Kindersitz (bis 1 Jahr)", "Silla infantil (hasta 1 año)", "Siège enfant (jusqu’à 1 an)", "Seggiolino (fino a 1 anno)", "Kinderzitje (tot 1 jaar)", "Fotelik (do 1 roku)", "Çocuk koltuğu (1 yaşına kadar)", "Детское кресло (до 1 года)", "مقعد أطفال (حتى سنة)", "儿童安全座椅（1岁以内）", "유아 카시트 (1세 이하)", "คาร์ซีทเด็ก (ถึง 1 ปี)")],
  ["Group 0+ child safety seat.\nChildren of (about) 0-1.5 years of age with body kg. weight of 0-10 kg.", row("Group 0+ child safety seat.\nChildren of (about) 0-1.5 years of age with body kg. weight of 0-10 kg.", "ჯგუფი 0+ ბავშვის სავარძელი.\nასაკი დაახლოებით 0-1.5 წელი, წონა 0-10 კგ.", "Kindersitz Gruppe 0+.\nEtwa 0–1,5 Jahre, 0–10 kg.", "Silla grupo 0+.\nUnos 0-1,5 años, 0-10 kg.", "Siège groupe 0+.\nEnviron 0-1,5 an, 0-10 kg.", "Seggiolino gruppo 0+.\nCirca 0-1,5 anni, 0-10 kg.", "Stoeltje groep 0+.\nOngeveer 0-1,5 jaar, 0-10 kg.", "Fotelik grupa 0+.\nOkoło 0-1,5 roku, 0-10 kg.", "Grup 0+ çocuk koltuğu.\nYaklaşık 0-1,5 yaş, 0-10 kg.", "Кресло группы 0+.\nПримерно 0–1,5 года, 0–10 кг.", "مقعد مجموعة 0+.\nحوالي 0-1.5 سنة، 0-10 كغ.", "0+ 组儿童座椅。\n约 0–1.5 岁，体重 0–10 公斤。", "그룹 0+ 카시트.\n약 0–1.5세, 몸무게 0–10kg.", "คาร์ซีทกลุ่ม 0+\nอายุประมาณ 0-1.5 ปี น้ำหนัก 0-10 กก.")],
  ["Child safety seat 1-4 years", row("Child safety seat 1-4 years", "ბავშვის სავარძელი 1-4 წელი", "Kindersitz 1–4 Jahre", "Silla infantil 1-4 años", "Siège enfant 1-4 ans", "Seggiolino 1-4 anni", "Kinderzitje 1-4 jaar", "Fotelik 1-4 lata", "Çocuk koltuğu 1-4 yaş", "Детское кресло 1–4 года", "مقعد أطفال 1-4 سنوات", "儿童安全座椅 1–4 岁", "어린이 카시트 1–4세", "คาร์ซีทเด็ก 1-4 ปี")],
  ["Group 1 child seat.\nChild weight 9-18 kg.\nAge of the child (approx.) 1-4 years.\nX", row("Group 1 child seat.\nChild weight 9-18 kg.\nAge of the child (approx.) 1-4 years.\nX", "ჯგუფი 1.\nწონა 9-18 კგ.\nასაკი დაახლოებით 1-4 წელი.", "Gruppe 1.\n9–18 kg.\nEtwa 1–4 Jahre.", "Grupo 1.\n9-18 kg.\nUnos 1-4 años.", "Groupe 1.\n9-18 kg.\nEnviron 1-4 ans.", "Gruppo 1.\n9-18 kg.\nCirca 1-4 anni.", "Groep 1.\n9-18 kg.\nOngeveer 1-4 jaar.", "Grupa 1.\n9-18 kg.\nOkoło 1-4 lata.", "Grup 1.\n9-18 kg.\nYaklaşık 1-4 yaş.", "Группа 1.\n9–18 кг.\nПримерно 1–4 года.", "مجموعة 1.\n9-18 كغ.\nحوالي 1-4 سنوات.", "1 组座椅。\n体重 9–18 公斤。\n约 1–4 岁。", "그룹 1.\n9–18kg.\n약 1–4세.", "กลุ่ม 1\nน้ำหนัก 9-18 กก.\nอายุประมาณ 1-4 ปี")],
  ["Child Booster seat 5+ years", row("Child Booster seat 5+ years", "ბუსტერი 5+ წელი", "Sitzerhöhung ab 5 Jahren", "Elevador 5+ años", "Réhausseur 5+ ans", "Rialzo 5+ anni", "Zitverhoger 5+ jaar", "Podkładka 5+ lat", "Yükseltici koltuk 5+ yaş", "Бустер 5+ лет", "مقعد داعم 5+ سنوات", "增高垫 5 岁以上", "부스터 시트 5세 이상", "บูสเตอร์ซีท 5 ปีขึ้นไป")],
  ["Group 3 child safety seat. Backless. Children of (about) 5 years of age and from 135 cm tall.", row("Group 3 child safety seat. Backless. Children of (about) 5 years of age and from 135 cm tall.", "ჯგუფი 3, უზურგო. დაახლოებით 5 წლიდან და 135 სმ-დან.", "Gruppe 3, ohne Rücken. Etwa ab 5 Jahren und 135 cm.", "Grupo 3, sin respaldo. Unos 5 años y desde 135 cm.", "Groupe 3, sans dossier. Environ 5 ans et dès 135 cm.", "Gruppo 3, senza schienale. Circa 5 anni e da 135 cm.", "Groep 3, zonder rugleuning. Ongeveer 5 jaar en vanaf 135 cm.", "Grupa 3, bez oparcia. Około 5 lat i od 135 cm.", "Grup 3, sırtsız. Yaklaşık 5 yaş ve 135 cm’den itibaren.", "Группа 3, без спинки. Примерно от 5 лет и от 135 см.", "مجموعة 3 بلا ظهر. حوالي 5 سنوات ومن 135 سم.", "3 组无靠背座椅。约 5 岁起、身高 135 厘米起。", "그룹 3, 등받이 없음. 약 5세, 키 135cm 이상.", "กลุ่ม 3 ไม่มีพนักพิง อายุประมาณ 5 ปีและสูงตั้งแต่ 135 ซม.")],
  ["GPS Navigation", row("GPS Navigation", "GPS ნავიგაცია", "GPS-Navigation", "Navegación GPS", "Navigation GPS", "Navigazione GPS", "GPS-navigatie", "Nawigacja GPS", "GPS navigasyon", "GPS-навигация", "ملاحة GPS", "GPS 导航", "GPS 내비게이션", "นำทาง GPS")],
  ["Portable GPS unit, daily rate.", row("Portable GPS unit, daily rate.", "პორტატული GPS, დღიური ტარიფი.", "Tragbares GPS, Tagessatz.", "GPS portátil, tarifa diaria.", "GPS portable, tarif journalier.", "GPS portatile, tariffa giornaliera.", "Draagbare GPS, dagtarief.", "Przenośne GPS, stawka dzienna.", "Taşınabilir GPS, günlük ücret.", "Портативный GPS, посуточно.", "جهاز GPS محمول، سعر يومي.", "便携 GPS，按日计费。", "휴대용 GPS, 일일 요금.", "GPS พกพา คิดรายวัน")],
  ["The second driver in the contract", row("The second driver in the contract", "ხელშეკრულების მეორე მძღოლი", "Zweiter Fahrer im Vertrag", "Segundo conductor en el contrato", "Second conducteur au contrat", "Secondo conducente nel contratto", "Tweede bestuurder in het contract", "Drugi kierowca w umowie", "Sözleşmedeki ikinci sürücü", "Второй водитель в договоре", "السائق الثاني في العقد", "合同中的第二驾驶员", "계약의 두 번째 운전자", "ผู้ขับคนที่สองในสัญญา")],
  ["It is possible to add a second driver to the car rental agreement. He must have the age and driving experience no less than in the standard terms and conditions. To draw a car rental agreement, you'll need a driver's license and a passport of the second driver.", row("It is possible to add a second driver to the car rental agreement. He must have the age and driving experience no less than in the standard terms and conditions. To draw a car rental agreement, you'll need a driver's license and a passport of the second driver.", "შესაძლებელია მეორე მძღოლის დამატება. ასაკი და სტაჟი სტანდარტულ პირობებზე ნაკლები არ უნდა იყოს. საჭიროა მისი მართვის მოწმობა და პასპორტი.", "Ein zweiter Fahrer kann eingetragen werden. Alter und Fahrpraxis dürfen nicht unter den Standardbedingungen liegen. Führerschein und Reisepass werden benötigt.", "Se puede añadir un segundo conductor. La edad y la experiencia no pueden ser inferiores a las condiciones estándar. Hacen falta su permiso y pasaporte.", "Un second conducteur peut être ajouté. L’âge et l’expérience ne peuvent pas être inférieurs aux conditions standard. Permis et passeport requis.", "Si può aggiungere un secondo conducente. Età ed esperienza non inferiori alle condizioni standard. Servono patente e passaporto.", "Een tweede bestuurder kan worden toegevoegd. Leeftijd en ervaring niet lager dan de standaardvoorwaarden. Rijbewijs en paspoort nodig.", "Można dodać drugiego kierowcę. Wiek i staż nie niższe niż w warunkach standardowych. Potrzebne prawo jazdy i paszport.", "Sözleşmeye ikinci sürücü eklenebilir. Yaş ve deneyim standart koşullardan düşük olamaz. Ehliyet ve pasaport gerekir.", "В договор можно внести второго водителя. Возраст и стаж не ниже стандартных условий. Нужны его права и паспорт.", "يمكن إضافة سائق ثانٍ. يجب ألا يقل العمر والخبرة عن الشروط القياسية. يلزم رخصة وجواز السائق الثاني.", "可以在租车合同中增加第二驾驶员。年龄和驾龄不得低于标准条款。办理时需要其驾照和护照。", "계약에 두 번째 운전자를 추가할 수 있습니다. 나이와 경력은 표준 조건보다 낮을 수 없습니다. 면허증과 여권이 필요합니다.", "เพิ่มผู้ขับคนที่สองในสัญญาได้ อายุและประสบการณ์ต้องไม่ต่ำกว่าเงื่อนไขมาตรฐาน ต้องใช้ใบขับขี่และพาสปอร์ต")],
  ["Border crossing", row("Border crossing", "საზღვრის გადაკვეთა", "Grenzübertritt", "Cruce de frontera", "Passage de frontière", "Attraversamento del confine", "Grensovergang", "Przekroczenie granicy", "Sınır geçişi", "Пересечение границы", "عبور الحدود", "跨境行驶", "국경 통과", "ข้ามพรมแดน")],
  ["Permission to take the vehicle across state borders.", row("Permission to take the vehicle across state borders.", "ავტომობილის სახელმწიფო საზღვარზე გაყვანის ნებართვა.", "Erlaubnis, das Fahrzeug über Staatsgrenzen zu bringen.", "Permiso para cruzar fronteras estatales con el vehículo.", "Autorisation de franchir les frontières avec le véhicule.", "Permesso di portare il veicolo oltre i confini.", "Toestemming om de auto over landsgrenzen te brengen.", "Zgoda na wywóz auta za granicę państwa.", "Aracı ülke sınırları dışına çıkarma izni.", "Разрешение вывезти автомобиль за границу.", "إذن باصطحاب المركبة عبر حدود الدول.", "允许驾车跨境。", "차량을 국경 밖으로 가져갈 허가.", "อนุญาตให้นำรถข้ามพรมแดนประเทศ")],
  ["Free cancellation 48", row("Free cancellation 48", "უფასო გაუქმება 48", "Kostenlose Stornierung 48", "Cancelación gratis 48", "Annulation gratuite 48", "Cancellazione gratuita 48", "Gratis annuleren 48", "Darmowa anulacja 48", "Ücretsiz iptal 48", "Бесплатная отмена 48", "إلغاء مجاني 48", "48 小时免费取消", "48시간 무료 취소", "ยกเลิกฟรี 48")],
  ["We will refund the full amount of advance payment if you cancel 48 hours or more before scheduled car pickup. If you cancel in less than 48 hours before pickup, the advance payment will not be refunded\nX", row("We will refund the full amount of advance payment if you cancel 48 hours or more before scheduled car pickup. If you cancel in less than 48 hours before pickup, the advance payment will not be refunded\nX", "აღებამდე 48 საათით ადრე ან მეტით გაუქმებისას წინასწარი გადახდა სრულად ბრუნდება. 48 საათზე ნაკლებ დროში — არ ბრუნდება.", "Bei Stornierung mindestens 48 Stunden vor Abholung erstatten wir die Anzahlung voll. Darunter keine Erstattung.", "Si cancela 48 horas o más antes de la recogida, devolvemos el anticipo. Con menos de 48 horas, no.", "Annulation 48 h ou plus avant le retrait : acompte remboursé. Moins de 48 h : non remboursé.", "Cancellazione almeno 48 ore prima del ritiro: acconto rimborsato. Sotto le 48 ore: nessun rimborso.", "Annuleren 48 uur of eerder voor ophalen: aanbetaling terug. Minder dan 48 uur: geen terugbetaling.", "Anulacja 48 godzin lub wcześniej przed odbiorem: zaliczka wraca. Poniżej 48 godzin: bez zwrotu.", "Teslimden 48 saat veya daha önce iptalde ön ödeme iade edilir. 48 saatten kısa sürede iade yoktur.", "Отмена за 48 часов и ранее до выдачи: предоплата возвращается. Меньше 48 часов — без возврата.", "عند الإلغاء قبل 48 ساعة أو أكثر من الاستلام يُرد العربون كاملًا. أقل من 48 ساعة لا يُرد.", "取车前 48 小时或更早取消，预付款全额退还。不足 48 小时不退。", "픽업 48시간 이전 취소 시 선결제 전액 환불. 48시간 미만이면 환불되지 않습니다.", "ยกเลิกก่อนรับรถ 48 ชั่วโมงขึ้นไป คืนเงินล่วงหน้าเต็มจำนวน น้อยกว่า 48 ชั่วโมงไม่คืน")],
  ["Personal Accident Insurance", row("Personal Accident Insurance", "უბედური შემთხვევის დაზღვევა", "Unfallversicherung", "Seguro de accidentes", "Assurance accidents", "Assicurazione infortuni", "Ongevallenverzekering", "Ubezpieczenie NNW", "Ferdi kaza sigortası", "Страхование от несчастного случая", "تأمين الحوادث الشخصية", "人身意外险", "개인 상해 보험", "ประกันอุบัติเหตุส่วนบุคคล")],
  ["The insurance company covers the damage caused to the health of passengers in case of an accident while driving a rental car.", row("The insurance company covers the damage caused to the health of passengers in case of an accident while driving a rental car.", "სადაზღვევო ფარავს მგზავრების ჯანმრთელობის ზიანს ავარიისას.", "Der Versicherer deckt Gesundheitsschäden der Insassen bei einem Unfall.", "La aseguradora cubre daños a la salud de los pasajeros en un accidente.", "L’assureur couvre les dommages corporels des passagers en cas d’accident.", "L’assicurazione copre i danni alla salute dei passeggeri in caso di incidente.", "De verzekeraar dekt gezondheidsschade van passagiers bij een ongeval.", "Ubezpieczyciel pokrywa uszczerbek na zdrowiu pasażerów przy wypadku.", "Sigorta, kaza halinde yolcuların sağlık zararını karşılar.", "Страховщик покрывает вред здоровью пассажиров при ДТП.", "تغطي شركة التأمين الضرر الصحي للركاب عند وقوع حادث.", "发生事故时，保险公司承担乘客的人身伤害。", "사고 시 보험사가 탑승자의 건강 피해를 보상합니다.", "บริษัทประกันคุ้มครองความเสียหายต่อสุขภาพผู้โดยสารเมื่อเกิดอุบัติเหตุ")],
  ["Theft Protection", row("Theft Protection", "ქურდობისგან დაცვა", "Diebstahlschutz", "Protección contra robo", "Protection vol", "Protezione furto", "Diefstalbescherming", "Ochrona przed kradzieżą", "Hırsızlık koruması", "Защита от угона", "حماية من السرقة", "盗抢保障", "도난 보호", "ความคุ้มครองการโจรกรรม")],
  ["In the event of car theft, the insurance company only covers the losses of the rental company.\nA stolen car report certified by the police is required.", row("In the event of car theft, the insurance company only covers the losses of the rental company.\nA stolen car report certified by the police is required.", "ქურდობისას დაზღვევა ფარავს მხოლოდ გამქირავებლის ზარალს.\nსაჭიროა პოლიციის ცნობა.", "Bei Diebstahl deckt die Versicherung nur den Schaden des Vermieters.\nEin polizeilicher Bericht ist nötig.", "En caso de robo, el seguro cubre solo las pérdidas del arrendador.\nHace falta un parte policial.", "En cas de vol, l’assurance ne couvre que les pertes du loueur.\nUn rapport de police est requis.", "In caso di furto l’assicurazione copre solo le perdite del noleggiatore.\nServe un verbale della polizia.", "Bij diefstal dekt de verzekering alleen het verlies van de verhuurder.\nEen politierapport is vereist.", "Przy kradzieży ubezpieczenie pokrywa tylko stratę wynajmującego.\nPotrzebny jest raport policji.", "Hırsızlıkta sigorta yalnızca kiralama şirketinin kaybını karşılar.\nPolis tutanağı gerekir.", "При угоне страховка покрывает только убытки прокатчика.\nНужен полицейский протокол.", "عند السرقة يغطي التأمين خسائر شركة التأجير فقط.\nيلزم تقرير شرطة.", "车辆被盗时，保险只赔偿租赁公司的损失。\n需要警方证明。", "도난 시 보험은 대여 회사의 손실만 보상합니다.\n경찰 신고서가 필요합니다.", "กรณีรถถูกขโมย ประกันคุ้มครองเฉพาะความเสียหายของบริษัทเช่า\nต้องมีรายงานตำรวจ")],
  ["Tire chains", row("Tire chains", "საბურავის ჯაჭვები", "Schneeketten", "Cadenas para nieve", "Chaînes à neige", "Catene da neve", "Sneeuwkettingen", "Łańcuchy śniegowe", "Lastik zinciri", "Цепи на колёса", "سلاسل الإطارات", "轮胎防滑链", "타이어 체인", "โซ่ล้อ")],
  ["Insurance: TPL", row("Insurance: TPL", "დაზღვევა: TPL", "Versicherung: Haftpflicht", "Seguro: TPL", "Assurance : RC", "Assicurazione: RC", "Verzekering: WA", "Ubezpieczenie: OC", "Sigorta: TPL", "Страховка: TPL", "تأمين: TPL", "保险：第三者责任", "보험: TPL", "ประกัน: TPL")],
  ["Insurance: Basic coverage", row("Insurance: Basic coverage", "დაზღვევა: საბაზისო", "Versicherung: Basis", "Seguro: básica", "Assurance : de base", "Assicurazione: base", "Verzekering: basis", "Ubezpieczenie: podstawowe", "Sigorta: temel", "Страховка: базовая", "تأمين: أساسي", "保险：基础保障", "보험: 기본", "ประกัน: พื้นฐาน")],
  ["Insurance: Full coverage", row("Insurance: Full coverage", "დაზღვევა: სრული", "Versicherung: Voll", "Seguro: completa", "Assurance : complète", "Assicurazione: completa", "Verzekering: volledig", "Ubezpieczenie: pełne", "Sigorta: tam", "Страховка: полная", "تأمين: كامل", "保险：全额保障", "보험: 완전", "ประกัน: เต็มรูปแบบ")],
  ["Insurance: Personal accident", row("Insurance: Personal accident", "დაზღვევა: უბედური შემთხვევა", "Versicherung: Unfall", "Seguro: accidentes", "Assurance : accidents", "Assicurazione: infortuni", "Verzekering: ongevallen", "Ubezpieczenie: NNW", "Sigorta: kaza", "Страховка: несчастный случай", "تأمين: حوادث", "保险：人身意外", "보험: 상해", "ประกัน: อุบัติเหตุ")],
  ["Insurance: Theft protection", row("Insurance: Theft protection", "დაზღვევა: ქურდობა", "Versicherung: Diebstahl", "Seguro: robo", "Assurance : vol", "Assicurazione: furto", "Verzekering: diefstal", "Ubezpieczenie: kradzież", "Sigorta: hırsızlık", "Страховка: угон", "تأمين: سرقة", "保险：盗抢", "보험: 도난", "ประกัน: โจรกรรม")],
  ["Insurance: Additional driver", row("Insurance: Additional driver", "დაზღვევა: დამატებითი მძღოლი", "Versicherung: Zusatzfahrer", "Seguro: conductor adicional", "Assurance : conducteur additionnel", "Assicurazione: guidatore aggiuntivo", "Verzekering: extra bestuurder", "Ubezpieczenie: dodatkowy kierowca", "Sigorta: ek sürücü", "Страховка: доп. водитель", "تأمين: سائق إضافي", "保险：额外驾驶员", "보험: 추가 운전자", "ประกัน: ผู้ขับเพิ่ม")],
  ["Additional services list", row("Additional services list", "დამატებითი სერვისები", "Zusatzleistungen", "Servicios adicionales", "Services supplémentaires", "Servizi aggiuntivi", "Extra diensten", "Usługi dodatkowe", "Ek hizmetler", "Дополнительные услуги", "خدمات إضافية", "附加服务列表", "부가 서비스", "บริการเสริม")],
];

for (const [source, values] of EXTRAS) add(source, values);

add("დეპოზიტის გარეშე", row("Without deposit", "დეპოზიტის გარეშე", "Ohne Kaution", "Sin depósito", "Sans caution", "Senza deposito", "Zonder borg", "Bez kaucji", "Depozitosuz", "Без залога", "بدون تأمين", "无需押金", "보증금 없음", "ไม่มีมัดจำ"));
add("სახურავის საბარგული", row("Roof cargo box", "სახურავის საბარგული", "Dachbox", "Cofre de techo", "Coffre de toit", "Box da tetto", "Dakkoffer", "Box dachowy", "Tavan bagajı", "Бокс на крышу", "صندوق سقف", "车顶行李箱", "루프박스", "กล่องหลังคา"));
add("სათხილამურო თარო", row("Ski rack", "სათხილამურო თარო", "Skiträger", "Portaesquís", "Porte-skis", "Portasci", "Skidrager", "Bagażnik na narty", "Kayak taşıyıcı", "Багажник для лыж", "حامل تزلج", "滑雪板架", "스키 캐리어", "แร็คสกี"));
add("სნოუბორდის სადგამი", row("Snowboard rack", "სნოუბორდის სადგამი", "Snowboardhalter", "Portatablas", "Porte-snowboard", "Porta snowboard", "Snowboarddrager", "Bagażnik na snowboard", "Snowboard taşıyıcı", "Крепление для сноуборда", "حامل سنوبورد", "单板滑雪架", "스노보드 거치대", "แร็คสโนว์บอร์ด"));
add("შეუზღუდავი გარბენი", row("Unlimited mileage", "შეუზღუდავი გარბენი", "Unbegrenzte Kilometer", "Kilometraje ilimitado", "Kilométrage illimité", "Chilometraggio illimitato", "Onbeperkte kilometers", "Nielimitowany przebieg", "Sınırsız kilometre", "Безлимитный пробег", "كيلومترات غير محدودة", "不限里程", "무제한 주행", "ไมล์ไม่จำกัด"));
add(
  "მგზავრობა \"მესტია-უშგული-ლენტეხი\" მარშრუტით",
  row(
    "Travel on the Mestia–Ushguli–Lentekhi route",
    "მგზავრობა \"მესტია-უშგული-ლენტეხი\" მარშრუტით",
    "Fahrt auf der Route Mestia–Ushguli–Lentekhi",
    "Viaje por la ruta Mestia–Ushguli–Lentekhi",
    "Trajet Mestia–Ushguli–Lentekhi",
    "Percorso Mestia–Ushguli–Lentekhi",
    "Rit Mestia–Ushguli–Lentekhi",
    "Trasa Mestia–Ushguli–Lentekhi",
    "Mestia–Ushguli–Lentekhi güzergahı",
    "Поездка по маршруту Местиа–Ушгули–Лентехи",
    "السفر عبر طريق مستيا–أوشغولي–لينتيخي",
    "梅斯蒂亚–乌什古利–连捷希线路",
    "메스티아–우슈굴리–렌테히 경로",
    "เส้นทางเมสเทีย–อุชกูลี–เลนเตคี",
  ),
);
add(
  "Wireless hotspot on board555",
  row(
    "Wireless hotspot on board555",
    "უკაბელო ჰოთსპოტი მანქანაში555",
    "WLAN-Hotspot an Bord555",
    "Punto de acceso inalámbrico a bordo555",
    "Hotspot Wi-Fi à bord555",
    "Hotspot wireless a bordo555",
    "Draadloze hotspot aan boord555",
    "Hotspot Wi-Fi w aucie555",
    "Araç içi kablosuz erişim noktası555",
    "Беспроводная точка доступа в авто555",
    "نقطة اتصال لاسلكية في السيارة555",
    "车载无线热点555",
    "차량 무선 핫스팟555",
    "ฮอตสปอตไร้สายในรถ555",
  ),
);
add(
  "Wi-Fi working range is up to 10 meters. The Internet speed is enough for voice calls but not enough for video. It has a built-in battery so that you can take it with you to the beach or when you are hiking",
  row(
    "Wi-Fi working range is up to 10 meters. The Internet speed is enough for voice calls but not enough for video. It has a built-in battery so that you can take it with you to the beach or when you are hiking",
    "Wi-Fi მუშაობს 10 მეტრამდე. სიჩქარე საკმარისია ზარებისთვის, ვიდეოსთვის — არა. აქვს ჩაშენებული ბატარეა, ამიტომ შეგიძლიათ წაიღოთ სანაპიროზე ან ლაშქრობაზე.",
    "WLAN reicht bis 10 Meter. Die Geschwindigkeit reicht für Anrufe, nicht für Video. Der Akku lässt sich mitnehmen, etwa an den Strand oder auf eine Wanderung.",
    "El Wi-Fi llega hasta 10 metros. La velocidad basta para llamadas, no para vídeo. La batería integrada permite llevarlo a la playa o de excursión.",
    "La portée Wi-Fi va jusqu’à 10 mètres. Le débit suffit pour les appels, pas pour la vidéo. La batterie intégrée permet de l’emporter à la plage ou en randonnée.",
    "Il Wi-Fi arriva fino a 10 metri. La velocità basta per le chiamate, non per i video. La batteria integrata permette di portarlo in spiaggia o in escursione.",
    "Wifi werkt tot 10 meter. De snelheid volstaat voor bellen, niet voor video. De ingebouwde batterij neemt u mee naar het strand of op een wandeling.",
    "Zasięg Wi-Fi do 10 metrów. Prędkość wystarcza do rozmów, nie do wideo. Wbudowana bateria pozwala zabrać urządzenie na plażę lub wędrówkę.",
    "Wi-Fi menzili 10 metreye kadardır. Hız aramalar için yeter, video için yetmez. Dahili pille sahile veya yürüyüşe götürebilirsiniz.",
    "Wi-Fi работает до 10 метров. Скорости хватает для звонков, но не для видео. Встроенный аккумулятор можно взять на пляж или в поход.",
    "يصل مدى الواي فاي إلى 10 أمتار. السرعة تكفي للمكالمات لا للفيديو. البطارية المدمجة تسمح بحمله إلى الشاطئ أو أثناء المشي.",
    "Wi-Fi 覆盖约 10 米。网速够语音通话，不够看视频。内置电池，可以带到海边或徒步时使用。",
    "Wi-Fi 범위는 최대 10미터입니다. 속도는 음성 통화에는 충분하고 동영상에는 부족합니다. 내장 배터리로 해변이나 하이킹에 가져갈 수 있습니다.",
    "Wi-Fi ใช้ได้ในระยะไม่เกิน 10 เมตร ความเร็วพอสำหรับโทร แต่ไม่พอสำหรับวิดีโอ มีแบตในตัว พกไปชายหาดหรือเดินป่าได้",
  ),
);
add("Winter Tyres", row("Winter Tyres", "ზამთრის საბურავები", "Winterreifen", "Neumáticos de invierno", "Pneus hiver", "Pneumatici invernali", "Winterbanden", "Opony zimowe", "Kış lastikleri", "Зимние шины", "إطارات شتوية", "冬季轮胎", "윈터 타이어", "ยางฤดูหนาว"));
add(
  "Winter tyres (marked with a \"snowflake\") or all- season tyres (marked with M+S and a \"snowflake\").",
  row(
    "Winter tyres (marked with a \"snowflake\") or all- season tyres (marked with M+S and a \"snowflake\").",
    "ზამთრის საბურავები (ფიფქის ნიშნით) ან ყველა სეზონის საბურავები (M+S და ფიფქის ნიშნით).",
    "Winterreifen (mit Schneeflocke) oder Ganzjahresreifen (mit M+S und Schneeflocke).",
    "Neumáticos de invierno (con copo) o de todo tiempo (con M+S y copo).",
    "Pneus hiver (flocon) ou toutes saisons (M+S et flocon).",
    "Pneumatici invernali (fiocco) o quattro stagioni (M+S e fiocco).",
    "Winterbanden (sneeuwvlok) of all-season (M+S en sneeuwvlok).",
    "Opony zimowe (płatek) lub całoroczne (M+S i płatek).",
    "Kış lastikleri (kar tanesi) veya dört mevsim lastikler (M+S ve kar tanesi).",
    "Зимние шины (со снежинкой) или всесезонные (M+S и снежинка).",
    "إطارات شتوية (علامة ندفة) أو لكل المواسم (M+S وندفة).",
    "冬季轮胎（雪花标志）或四季轮胎（M+S 和雪花标志）。",
    "윈터 타이어(눈송이 표시) 또는 사계절 타이어(M+S와 눈송이 표시).",
    "ยางฤดูหนาว (เครื่องหมายเกล็ดหิมะ) หรือยางทุกฤดู (M+S และเกล็ดหิมะ)",
  ),
);
add("SIM-card", row("SIM-card", "SIM ბარათი", "SIM-Karte", "Tarjeta SIM", "Carte SIM", "Scheda SIM", "SIM-kaart", "Karta SIM", "SIM kart", "SIM-карта", "شريحة SIM", "SIM 卡", "SIM 카드", "ซิมการ์ด"));
add(
  "Pre-paid SIM card of the local operator with the standard travel tariff. If the initial balance is exhausted, you will need to add funds to the card yourself.",
  row(
    "Pre-paid SIM card of the local operator with the standard travel tariff. If the initial balance is exhausted, you will need to add funds to the card yourself.",
    "ადგილობრივი ოპერატორის წინასწარ შევსებული SIM ბარათი სამოგზაურო ტარიფით. ბალანსის ამოწურვის შემდეგ თანხას თავად დაამატებთ.",
    "Prepaid-SIM des lokalen Anbieters mit Reisetarif. Ist das Guthaben aufgebraucht, laden Sie selbst nach.",
    "SIM prepago del operador local con tarifa de viaje. Si se agota el saldo, hay que recargarla.",
    "SIM prépayée de l’opérateur local au tarif voyage. Si le crédit est épuisé, il faut recharger soi-même.",
    "SIM prepagata dell’operatore locale con tariffa viaggio. A credito esaurito si ricarica da soli.",
    "Prepaid SIM van de lokale aanbieder met reistarief. Is het tegoed op, dan laadt u zelf bij.",
    "Karta SIM prepaid lokalnego operatora w taryfie podróżnej. Po wyczerpaniu środków doładowanie jest po stronie klienta.",
    "Yerel operatörün seyahat tarifeli ön ödemeli SIM kartı. Bakiye bitince yüklemeyi siz yaparsınız.",
    "Предоплаченная SIM местного оператора с туристическим тарифом. Когда баланс кончится, пополнение на вас.",
    "شريحة مسبقة الدفع من المشغل المحلي بتعرفة السفر. عند نفاد الرصيد تضيف الرصيد بنفسك.",
    "当地运营商预付费 SIM，旅行套餐。余额用完后需自行充值。",
    "현지 통신사의 여행 요금제 선불 SIM. 잔액이 소진되면 직접 충전하셔야 합니다.",
    "ซิมเติมเงินของผู้ให้บริการท้องถิ่นในแพ็กเกจท่องเที่ยว ถ้าเครดิตหมดต้องเติมเอง",
  ),
);
add(
  "Included free by default on every rental.",
  row(
    "Included free by default on every rental.",
    "ყოველ ქირავნობაში უფასოდ შედის.",
    "Bei jeder Miete standardmäßig kostenlos enthalten.",
    "Incluido gratis por defecto en cada alquiler.",
    "Inclus gratuitement par défaut dans chaque location.",
    "Incluso gratis di default in ogni noleggio.",
    "Standaard gratis bij elke huur.",
    "Domyślnie gratis przy każdym wynajmie.",
    "Her kiralamada varsayılan olarak ücretsiz dahildir.",
    "По умолчанию бесплатно в каждой аренде.",
    "مشمول مجانًا افتراضيًا في كل تأجير.",
    "每次租车默认免费包含。",
    "모든 대여에 기본으로 무료 포함됩니다.",
    "รวมฟรีโดยปริยายในทุกการเช่า",
  ),
);

alias("Child Booster seat", "Child Booster seat 5+ years");
alias("Free cancellation", "Free cancellation 48");
alias(
  "Group 1 child seat. Child weight 9-18 kg. Age of the child (approx.) 1-5 years",
  "Group 1 child seat.\nChild weight 9-18 kg.\nAge of the child (approx.) 1-4 years.\nX",
);
alias(
  "We will refund the full amount of advance payment if you cancel 48 hours or more before scheduled car pickup. If you cancel in less than 48 hours before pickup, the advance payment wil not be refunded",
  "We will refund the full amount of advance payment if you cancel 48 hours or more before scheduled car pickup. If you cancel in less than 48 hours before pickup, the advance payment will not be refunded\nX",
);

alias("TPL — შესაძლო ზიანის პასუხისმგებლობა", "TPL — Third Party Liability");
alias("ჯგუფის მგზავრების დაზღვევა", "Personal Accident Insurance");
alias("ძირითადი დაფარვა (CDW)", "Basic coverage");
alias("სრული დაფარვა (SuperCDW)", "Full coverage");
alias("Child safety seat (1-5 years)", "Child safety seat 1-4 years");
alias(
  "Group 0+ child safety seat. Children of (about) 0-1.5 years of age with body weight of 0-10 kg",
  "Group 0+ child safety seat.\nChildren of (about) 0-1.5 years of age with body kg. weight of 0-10 kg.",
);
alias(
  "Group 1 child safety seat. Child weight 9-18 kg. Age of the child (approx.) 1-5 years.",
  "Group 1 child seat.\nChild weight 9-18 kg.\nAge of the child (approx.) 1-4 years.\nX",
);
alias("საგადახდო სერვისი", "Additional services list");

add("On", row("On", "ჩართული", "Ein", "Activado", "Activé", "Attivo", "Aan", "Włączone", "Açık", "Включено", "تشغيل", "开启", "켜짐", "เปิด"));
add("Off", row("Off", "გამორთული", "Aus", "Apagado", "Désactivé", "Spento", "Uit", "Wyłączone", "Kapalı", "Выключено", "إيقاف", "关闭", "꺼짐", "ปิด"));
add("Forbidden", row("Forbidden", "აკრძალულია", "Verboten", "Prohibido", "Interdit", "Vietato", "Verboden", "Zabronione", "Yasak", "Запрещено", "ممنوع", "禁止", "금지", "ห้าม"));
add("Enabled", row("Enabled", "ჩართული", "Aktiv", "Activado", "Activé", "Attivo", "Ingeschakeld", "Włączone", "Açık", "Включено", "مفعّل", "已启用", "사용", "เปิดใช้"));
add("Done", row("Done", "მზადაა", "Fertig", "Listo", "Terminé", "Fatto", "Klaar", "Gotowe", "Tamam", "Готово", "تم", "完成", "완료", "เสร็จ"));
add("Price per day", row("Price per day", "ფასი დღეში", "Preis pro Tag", "Precio por día", "Prix par jour", "Prezzo al giorno", "Prijs per dag", "Cena za dzień", "Günlük fiyat", "Цена в день", "السعر لليوم", "每日价格", "일일 가격", "ราคาต่อวัน"));
add("Min when selected", row("Min when selected", "მინ. არჩევისას", "Min. bei Auswahl", "Mín. al elegir", "Min. à la sélection", "Min. se selezionato", "Min. bij keuze", "Min. przy wyborze", "Seçilince min.", "Мин. при выборе", "الحد الأدنى عند الاختيار", "选择时最低", "선택 시 최소", "ขั้นต่ำเมื่อเลือก"));
add("Max for the rental", row("Max for the rental", "მაქს. გამოყენებისას", "Max. für die Miete", "Máx. del alquiler", "Max. pour la location", "Max. per il noleggio", "Max. voor de huur", "Maks. za wynajem", "Kiralama maks.", "Макс. за аренду", "الحد الأقصى للإيجار", "租赁最高", "대여 최대", "สูงสุดต่อสัญญา"));
add("Cars", row("Cars", "მანქანები", "Autos", "Coches", "Voitures", "Auto", "Auto's", "Samochody", "Araçlar", "Автомобили", "سيارات", "车辆", "차량", "รถยนต์"));
add("Select all", row("Select all", "ყველას მონიშვნა", "Alle auswählen", "Seleccionar todo", "Tout sélectionner", "Seleziona tutto", "Alles selecteren", "Zaznacz wszystko", "Tümünü seç", "Выбрать все", "تحديد الكل", "全选", "모두 선택", "เลือกทั้งหมด"));
add("Reset", row("Reset", "გაუქმება", "Zurücksetzen", "Restablecer", "Réinitialiser", "Reimposta", "Resetten", "Resetuj", "Sıfırla", "Сбросить", "إعادة تعيين", "重置", "초기화", "รีเซ็ต"));
add("Mandatory", row("Mandatory", "სავალდებულო", "Pflicht", "Obligatorio", "Obligatoire", "Obbligatorio", "Verplicht", "Obowiązkowe", "Zorunlu", "Обязательно", "إلزامي", "必选", "필수", "จำเป็น"));
add("Free", row("Free", "უფასო", "Kostenlos", "Gratis", "Gratuit", "Gratis", "Gratis", "Bezpłatnie", "Ücretsiz", "Бесплатно", "مجاني", "免费", "무료", "ฟรี"));
add("no limit", row("no limit", "ზღვარი არ არის", "kein Limit", "sin límite", "sans limite", "senza limite", "geen limiet", "bez limitu", "limit yok", "лимита нет", "بدون حد", "无上限", "제한 없음", "ไม่จำกัด"));
add("Insurance", row("Insurance", "დაზღვევა", "Versicherung", "Seguro", "Assurance", "Assicurazione", "Verzekering", "Ubezpieczenie", "Sigorta", "Страховка", "تأمين", "保险", "보험", "ประกัน"));
add("Additional services", row("Additional services", "დამატებითი მომსახურეობა", "Zusatzleistungen", "Servicios extra", "Services supplémentaires", "Servizi extra", "Extra diensten", "Usługi dodatkowe", "Ek hizmetler", "Дополнительные услуги", "خدمات إضافية", "附加服务", "부가 서비스", "บริการเสริม"));
add("Additional equipment and services", row("Additional equipment and services", "დამატებითი მომსახურეობა", "Zusatzausstattung und Services", "Equipamiento y servicios extra", "Équipements et services", "Attrezzatura e servizi", "Extra uitrusting en diensten", "Wyposażenie i usługi", "Ek ekipman ve hizmetler", "Доп. оборудование и услуги", "معدات وخدمات إضافية", "附加设备与服务", "추가 장비 및 서비스", "อุปกรณ์และบริการเสริม"));
add("Equipment and services", row("Equipment and services", "მომსახურება და აღჭურვილობა", "Ausstattung und Services", "Equipamiento y servicios", "Équipements et services", "Attrezzatura e servizi", "Uitrusting en diensten", "Wyposażenie i usługi", "Ekipman ve hizmetler", "Оборудование и услуги", "المعدات والخدمات", "设备与服务", "장비 및 서비스", "อุปกรณ์และบริการ"));
add("admin max €{n}", row("admin max €{n}", "ადმინის მაქს. €{n}", "Admin-Max. €{n}", "máx. admin €{n}", "max. admin €{n}", "max admin €{n}", "admin-max. €{n}", "maks. admina €{n}", "admin maks. €{n}", "макс. админа €{n}", "حد المشرف €{n}", "管理员上限 €{n}", "관리자 최대 €{n}", "สูงสุดของผู้ดูแล €{n}"));
add("admin limit €{min}–€{max}", row("admin limit €{min}–€{max}", "ადმინის ზღვარი €{min}–€{max}", "Admin-Limit €{min}–€{max}", "límite admin €{min}–€{max}", "limite admin €{min}–€{max}", "limite admin €{min}–€{max}", "admin-limiet €{min}–€{max}", "limit admina €{min}–€{max}", "admin limiti €{min}–€{max}", "лимит админа €{min}–€{max}", "حد المشرف €{min}–€{max}", "管理员范围 €{min}–€{max}", "관리자 한도 €{min}–€{max}", "ช่วงของผู้ดูแล €{min}–€{max}"));
add("Standard", row("Standard", "სტანდარტი", "Standard", "Estándar", "Standard", "Standard", "Standaard", "Standard", "Standart", "Стандарт", "قياسي", "标准", "스탠다드", "มาตรฐาน"));
add("4x4 SUV", row("4x4 SUV", "4x4 ჯიპი", "4x4 SUV", "SUV 4x4", "SUV 4x4", "SUV 4x4", "4x4 SUV", "SUV 4x4", "4x4 SUV", "Внедорожник 4x4", "دفع رباعي SUV", "四驱 SUV", "4x4 SUV", "SUV ขับเคลื่อน 4 ล้อ"));
add("Minivan", row("Minivan", "მინივენი", "Minivan", "Monovolumen", "Monospace", "Monovolume", "Minivan", "Minivan", "Minivan", "Минивэн", "ميني فان", "小型面包车", "미니밴", "มินิแวน"));
add("Camper car", row("Camper car", "ქემპერი", "Wohnmobil", "Autocaravana", "Camping-car", "Camper", "Camper", "Kamper", "Karavan", "Кемпер", "سيارة تخييم", "房车", "캠핑카", "รถบ้าน"));
add("Luxury", row("Luxury", "ლუქსი", "Luxus", "Lujo", "Luxe", "Lusso", "Luxe", "Luksus", "Lüks", "Люкс", "فاخر", "豪华", "럭셔리", "หรู"));
add("Economy", row("Economy", "ეკონომი", "Economy", "Económico", "Économique", "Economy", "Economy", "Ekonomiczny", "Ekonomik", "Эконом", "اقتصادي", "经济型", "이코노미", "ประหยัด"));
add("Economy Class", row("Economy Class", "ეკონომ კლასი", "Economy-Klasse", "Clase económica", "Classe économique", "Classe economy", "Economyklasse", "Klasa ekonomiczna", "Ekonomi sınıfı", "Эконом-класс", "فئة اقتصادية", "经济舱", "이코노미 클래스", "ชั้นประหยัด"));
add("Convertibles", row("Convertibles", "კაბრიოლეტი", "Cabrios", "Descapotables", "Cabriolets", "Cabrio", "Cabriolets", "Kabriolety", "Üstü açık", "Кабриолеты", "مكشوفة", "敞篷车", "컨버터블", "เปิดประทุน"));
add("Van", row("Van", "ვენი", "Van", "Furgoneta", "Fourgon", "Furgone", "Bestelwagen", "Van", "Van", "Фургон", "فان", "厢式车", "밴", "แวน"));

export type InfoAdminLabels = {
  help: string;
  whySection: string;
  howSection: string;
  title: string;
  description: string;
  icon: string;
  whyCount: string;
  howCount: string;
  step: string;
};

const INFO_ADMIN: Record<Locale, InfoAdminLabels> = {
  en: { help: "Why Choose Us and How it Works blocks on the homepage.", whySection: "Why section title", howSection: "How section title", title: "Title", description: "Description", icon: "Icon", whyCount: "Why Choose Us ({n})", howCount: "How it Works ({n})", step: "Step {n}" },
  ka: { help: "მთავარ გვერდზე „რატომ ჩვენ“ და „როგორ მუშაობს“ ბლოკები.", whySection: "სექციის სათაური: რატომ", howSection: "სექციის სათაური: როგორ", title: "სათაური", description: "აღწერა", icon: "ხატულა", whyCount: "რატომ ჩვენ ({n})", howCount: "როგორ მუშაობს ({n})", step: "ნაბიჯი {n}" },
  de: { help: "Blöcke „Warum wir“ und „So funktioniert es“ auf der Startseite.", whySection: "Titel des Warum-Abschnitts", howSection: "Titel des Ablauf-Abschnitts", title: "Titel", description: "Beschreibung", icon: "Symbol", whyCount: "Warum wir ({n})", howCount: "So funktioniert es ({n})", step: "Schritt {n}" },
  es: { help: "Bloques «Por qué elegirnos» y «Cómo funciona» en el inicio.", whySection: "Título de la sección por qué", howSection: "Título de la sección cómo", title: "Título", description: "Descripción", icon: "Icono", whyCount: "Por qué elegirnos ({n})", howCount: "Cómo funciona ({n})", step: "Paso {n}" },
  fr: { help: "Blocs « Pourquoi nous choisir » et « Comment ça marche » sur l’accueil.", whySection: "Titre de la section pourquoi", howSection: "Titre de la section comment", title: "Titre", description: "Description", icon: "Icône", whyCount: "Pourquoi nous choisir ({n})", howCount: "Comment ça marche ({n})", step: "Étape {n}" },
  it: { help: "Blocchi «Perché sceglierci» e «Come funziona» in home.", whySection: "Titolo sezione perché", howSection: "Titolo sezione come", title: "Titolo", description: "Descrizione", icon: "Icona", whyCount: "Perché sceglierci ({n})", howCount: "Come funziona ({n})", step: "Passo {n}" },
  nl: { help: "Blokken «Waarom wij» en «Hoe het werkt» op de homepage.", whySection: "Titel van het waarom-deel", howSection: "Titel van het hoe-deel", title: "Titel", description: "Beschrijving", icon: "Pictogram", whyCount: "Waarom wij ({n})", howCount: "Hoe het werkt ({n})", step: "Stap {n}" },
  pl: { help: "Bloki «Dlaczego my» i «Jak to działa» na stronie głównej.", whySection: "Tytuł sekcji dlaczego", howSection: "Tytuł sekcji jak", title: "Tytuł", description: "Opis", icon: "Ikona", whyCount: "Dlaczego my ({n})", howCount: "Jak to działa ({n})", step: "Krok {n}" },
  tr: { help: "Ana sayfadaki «Neden biz» ve «Nasıl çalışır» blokları.", whySection: "Neden bölümünün başlığı", howSection: "Nasıl bölümünün başlığı", title: "Başlık", description: "Açıklama", icon: "Simge", whyCount: "Neden biz ({n})", howCount: "Nasıl çalışır ({n})", step: "Adım {n}" },
  ru: { help: "Блоки «Почему мы» и «Как это работает» на главной.", whySection: "Заголовок блока «почему»", howSection: "Заголовок блока «как»", title: "Заголовок", description: "Описание", icon: "Значок", whyCount: "Почему мы ({n})", howCount: "Как это работает ({n})", step: "Шаг {n}" },
  ar: { help: "كتلتا «لماذا نحن» و«كيف يعمل» في الصفحة الرئيسية.", whySection: "عنوان قسم لماذا", howSection: "عنوان قسم كيف", title: "العنوان", description: "الوصف", icon: "الأيقونة", whyCount: "لماذا نحن ({n})", howCount: "كيف يعمل ({n})", step: "الخطوة {n}" },
  zh: { help: "首页上的「为什么选择我们」和「如何运作」区块。", whySection: "“为什么”栏目标题", howSection: "“如何”栏目标题", title: "标题", description: "说明", icon: "图标", whyCount: "为什么选择我们（{n}）", howCount: "如何运作（{n}）", step: "步骤 {n}" },
  ko: { help: "홈페이지의 «선택 이유»와 «이용 방법» 블록입니다.", whySection: "이유 구역 제목", howSection: "방법 구역 제목", title: "제목", description: "설명", icon: "아이콘", whyCount: "선택 이유 ({n})", howCount: "이용 방법 ({n})", step: "단계 {n}" },
  th: { help: "บล็อก «ทำไมต้องเรา» และ «วิธีการทำงาน» บนหน้าแรก", whySection: "ชื่อส่วนทำไม", howSection: "ชื่อส่วนวิธีการ", title: "ชื่อเรื่อง", description: "คำอธิบาย", icon: "ไอคอน", whyCount: "ทำไมต้องเรา ({n})", howCount: "วิธีการทำงาน ({n})", step: "ขั้นตอน {n}" },
};

export function infoAdminLabels(locale: string): InfoAdminLabels {
  return INFO_ADMIN[locale as Locale] ?? INFO_ADMIN.en;
}

export function fillCount(template: string, n: number) {
  return template.replaceAll("{n}", String(n));
}
