import type { Locale } from "@/lib/i18n/config";
import { cityDisplayName } from "@/lib/i18n/place-label";
import { EXTRA_AIRPORTS, EXTRA_CITIES } from "@/lib/seo/location-drives-extra";

export type DriveLine = {
  title: string;
  distance: string;
  tip: string;
  also?: string;
};

type Tip = "sedan" | "standard" | "crossover" | "highway" | "mountain" | "either";
type Name = { en: string } & Partial<Record<Locale, string>>;
type Spot = { name: string | Name; km: string; time: string; tip: Tip; also?: { name: string | Name; km: string; time: string } };

const TIPS: Record<Locale, Record<Tip, readonly [string, string]>> = {
  en: {
    sedan: ["An ordinary car is comfortable on this road.", "A crossover gives a little more room, if you want it."],
    standard: ["Old streets and an easy pace, so a regular car is plenty.", "Nothing larger than a normal rental is needed."],
    crossover: ["A bit of ground clearance helps where the lane narrows.", "An everyday car manages it; a crossover is the calmer choice."],
    highway: ["A relaxed highway drive in the car you already like.", "A hybrid keeps the fuel use low on this stretch."],
    mountain: ["The climb is calmer in a 4x4, especially outside summer.", "All-wheel drive is worth it once the road leaves the valley."],
    either: ["The highway suits a sedan, a hybrid, or an SUV.", "Pick for comfort. The road itself is not demanding."],
  },
  ka: {
    sedan: ["ამ გზაზე ჩვეულებრივი მანქანა კომფორტულია.", "თუ მეტი ადგილი გინდათ, კროსოვერიც კარგია."],
    standard: ["ძველი ქუჩები და მშვიდი ტემპი — ჩვეულებრივი მანქანა საკმარისია.", "დიდი მანქანა ამ მონაკვეთს არ სჭირდება."],
    crossover: ["სადაც ზოლი ვიწროვდება, ცოტა სიმაღლე ეხმარება.", "ყოველდღიური მანქანაც გაივლის; კროსოვერი უფრო მშვიდია."],
    highway: ["მშვიდი გზატკეცილია, იმ მანქანით, რომელიც მოგწონთ.", "ამ მონაკვეთზე ჰიბრიდი საწვავს ზოგავს."],
    mountain: ["აღმართი უფრო მშვიდია 4x4-ით, განსაკუთრებით ზაფხულის გარეთ.", "როცა გზა ხეობას ტოვებს, სრული ამძრავი ღირს."],
    either: ["გზატკეცილზე სედანიც, ჰიბრიდიც და ჯიპიც გამოდგება.", "აირჩიეთ კომფორტით. თავად გზა რთული არ არის."],
  },
  ru: {
    sedan: ["На этой дороге удобна обычная машина.", "Кроссовер даст чуть больше места, если хотите."],
    standard: ["Старые улицы и спокойный темп — хватит обычного авто.", "Более крупная машина здесь не нужна."],
    crossover: ["Там, где полоса сужается, помогает небольшой просвет.", "Повседневная машина проедет; кроссовер спокойнее."],
    highway: ["Спокойная трасса на той машине, которая вам нравится.", "На этом участке гибрид экономит топливо."],
    mountain: ["Подъём спокойнее на полном приводе, особенно вне лета.", "Когда дорога выходит из долины, полный привод к месту."],
    either: ["На трассе подойдут седан, гибрид и внедорожник.", "Выбирайте по комфорту. Сама дорога несложная."],
  },
  de: {
    sedan: ["Auf dieser Strecke ist ein normales Auto angenehm.", "Ein Crossover gibt etwas mehr Platz, wenn Sie möchten."],
    standard: ["Alte Gassen und ruhiges Tempo, ein normales Auto reicht.", "Ein größeres Fahrzeug brauchen Sie hier nicht."],
    crossover: ["Wo die Spur enger wird, hilft etwas Bodenfreiheit.", "Ein Alltagsauto schafft es, ein Crossover ist ruhiger."],
    highway: ["Eine ruhige Autobahn mit dem Auto, das Ihnen gefällt.", "Ein Hybrid spart auf dieser Strecke Sprit."],
    mountain: ["Der Anstieg ist mit Allrad ruhiger, besonders außerhalb des Sommers.", "Sobald die Straße das Tal verlässt, lohnt Allrad."],
    either: ["Auf der Autobahn passen Limousine, Hybrid und SUV.", "Wählen Sie nach Komfort. Die Straße selbst ist einfach."],
  },
  es: {
    sedan: ["En esta carretera un coche normal va cómodo.", "Un crossover da un poco más de espacio, si lo quiere."],
    standard: ["Calles antiguas y ritmo tranquilo: basta un coche normal.", "No hace falta un vehículo más grande."],
    crossover: ["Donde el carril se estrecha, ayuda un poco de altura.", "Un coche de diario vale; un crossover va más tranquilo."],
    highway: ["Autopista tranquila con el coche que ya le guste.", "Un híbrido gasta menos en este tramo."],
    mountain: ["La subida es más tranquila con tracción total, sobre todo fuera del verano.", "Cuando la carretera sale del valle, merece la pena el 4x4."],
    either: ["En autopista valen un sedán, un híbrido o un SUV.", "Elija por comodidad. La carretera no exige más."],
  },
  fr: {
    sedan: ["Une voiture ordinaire est à l’aise sur cette route.", "Un crossover offre un peu plus de place, si vous voulez."],
    standard: ["Vieilles rues et allure calme : une voiture normale suffit.", "Un véhicule plus grand n’est pas utile."],
    crossover: ["Là où la voie se resserre, un peu de garde au sol aide.", "Une voiture du quotidien passe ; un crossover est plus serein."],
    highway: ["Autoroute tranquille avec la voiture que vous aimez déjà.", "Une hybride consomme peu sur ce trajet."],
    mountain: ["La montée est plus calme en 4x4, surtout hors été.", "Dès que la route quitte la vallée, les quatre roues motrices valent le coup."],
    either: ["Sur l’autoroute, berline, hybride ou SUV conviennent.", "Choisissez le confort. La route elle-même est simple."],
  },
  it: {
    sedan: ["Su questa strada un’auto normale è comoda.", "Un crossover dà un po’ più di spazio, se lo vuoi."],
    standard: ["Strade antiche e ritmo calmo: basta un’auto normale.", "Un mezzo più grande non serve."],
    crossover: ["Dove la corsia si stringe, un po’ di altezza aiuta.", "Un’auto di tutti i giorni ce la fa; un crossover è più tranquillo."],
    highway: ["Autostrada rilassata con l’auto che già ti piace.", "Un’ibrida consuma poco su questo tratto."],
    mountain: ["La salita è più tranquilla col 4x4, soprattutto fuori estate.", "Quando la strada esce dalla valle, la trazione integrale vale."],
    either: ["In autostrada vanno berlina, ibrida o SUV.", "Scegli il comfort. La strada non chiede di più."],
  },
  nl: {
    sedan: ["Een gewone auto zit hier prettig.", "Een crossover geeft iets meer ruimte, als u dat wilt."],
    standard: ["Oude straten en een rustig tempo: een normale auto volstaat.", "Een grotere auto is niet nodig."],
    crossover: ["Waar de baan smaller wordt, helpt wat bodemvrijheid.", "Een dagelijkse auto redt het; een crossover is rustiger."],
    highway: ["Een rustige snelweg in de auto die u al prettig vindt.", "Een hybride houdt het verbruik laag op dit stuk."],
    mountain: ["De klim is rustiger met vierwielaandrijving, vooral buiten de zomer.", "Zodra de weg het dal uit gaat, is vierwielaandrijving het waard."],
    either: ["Op de snelweg passen sedan, hybride en SUV.", "Kies op comfort. De weg zelf is niet zwaar."],
  },
  pl: {
    sedan: ["Na tej drodze zwykłe auto jest wygodne.", "Crossover da trochę więcej miejsca, jeśli chcesz."],
    standard: ["Stare ulice i spokojne tempo — wystarczy zwykłe auto.", "Większy samochód nie jest tu potrzebny."],
    crossover: ["Tam, gdzie pas się zwęża, pomaga odrobina prześwitu.", "Codzienne auto da radę; crossover jest spokojniejszy."],
    highway: ["Spokojna autostrada autem, które już lubisz.", "Hybryda oszczędza paliwo na tym odcinku."],
    mountain: ["Podjazd jest spokojniejszy z napędem 4x4, zwłaszcza poza latem.", "Gdy droga wychodzi z doliny, napęd na cztery koła się opłaca."],
    either: ["Na autostradzie pasują sedan, hybryda i SUV.", "Wybierz komfort. Sama droga nie jest wymagająca."],
  },
  tr: {
    sedan: ["Bu yolda sıradan bir araç rahattır.", "Biraz daha yer isterseniz crossover da iyi olur."],
    standard: ["Eski sokaklar ve sakin tempo: normal bir araç yeter.", "Daha büyük bir araca gerek yok."],
    crossover: ["Şerit daraldığında biraz yükseklik işe yarar.", "Günlük bir araç idare eder; crossover daha sakindir."],
    highway: ["Sevdiğiniz araçla sakin bir otoyol.", "Bu bölümde hibrit yakıtı düşük tutar."],
    mountain: ["Tırmanış 4x4 ile daha sakindir, özellikle yaz dışında.", "Yol vadiden çıkınca dört çeker işe yarar."],
    either: ["Otoyolda sedan, hibrit ve SUV uyar.", "Konfora göre seçin. Yolun kendisi zor değil."],
  },
  ar: {
    sedan: ["سيارة عادية مريحة على هذا الطريق.", "الكروس أوفر يمنح مساحة أكبر إن رغبت."],
    standard: ["شوارع قديمة وإيقاع هادئ، سيارة عادية تكفي.", "لا حاجة إلى سيارة أكبر."],
    crossover: ["حيث يضيق المسار يساعد ارتفاع بسيط عن الأرض.", "سيارة يومية تكفي، والكروس أوفر أهدأ."],
    highway: ["طريق سريع هادئ بالسيارة التي تفضلها.", "الهجين يوفّر الوقود في هذا المقطع."],
    mountain: ["الصعود أهدأ بالدفع الرباعي، خصوصًا خارج الصيف.", "حين يغادر الطريق الوادي يصبح الدفع الرباعي مفيدًا."],
    either: ["على الطريق السريع تناسب السيدان والهجين والـ SUV.", "اختر حسب الراحة. الطريق نفسه ليس صعبًا."],
  },
  zh: {
    sedan: ["这条路开普通车就很舒服。", "想多一点空间可以选跨界车。"],
    standard: ["老街区、节奏慢，普通车足够。", "不必换更大的车。"],
    crossover: ["车道变窄时，稍高一点的底盘更从容。", "日常用车可以应付，跨界车更稳。"],
    highway: ["用你喜欢的车走一段轻松的公路。", "这一段混动更省油。"],
    mountain: ["上坡开四驱更从容，尤其在夏季以外。", "路离开河谷之后，四驱更值得。"],
    either: ["公路上轿车、混动或 SUV 都可以。", "按舒适来选。路本身不难开。"],
  },
  ko: {
    sedan: ["이 길은 일반 차량으로 편합니다.", "공간이 더 필요하면 크로스오버도 좋습니다."],
    standard: ["오래된 거리와 느린 속도에는 일반 차가 충분합니다.", "더 큰 차는 필요 없습니다."],
    crossover: ["차로가 좁아지면 약간의 지상고가 도움이 됩니다.", "일상적인 차로도 되고, 크로스오버가 더 여유롭습니다."],
    highway: ["마음에 드는 차로 가는 편한 고속도로입니다.", "이 구간은 하이브리드가 연료를 아낍니다."],
    mountain: ["오르막은 4x4가 더 여유롭고, 여름 밖에는 더욱 그렇습니다.", "길이 계곡을 벗어나면 사륜구동이 좋습니다."],
    either: ["고속도로에는 세단, 하이브리드, SUV가 모두 맞습니다.", "편안함으로 고르세요. 길 자체는 까다롭지 않습니다."],
  },
  th: {
    sedan: ["ถนนนี้รถทั่วไปขับสบาย", "ถ้าอยากได้พื้นที่เพิ่ม ครอสโอเวอร์ก็ดี"],
    standard: ["ถนนเก่าและจังหวะช้า รถปกติเพียงพอ", "ไม่ต้องใช้รถที่ใหญ่กว่า"],
    crossover: ["ช่วงเลนแคบ ความสูงจากพื้นเล็กน้อยช่วยได้", "รถใช้ทุกวันไปได้ ครอสโอเวอร์อุ่นใจกว่า"],
    highway: ["ทางหลวงสบาย ๆ ด้วยรถที่คุณชอบอยู่แล้ว", "ช่วงนี้ไฮบริดประหยัดน้ำมัน"],
    mountain: ["ทางขึ้นสงบกว่าด้วยขับเคลื่อนสี่ล้อ โดยเฉพาะนอกฤดูร้อน", "เมื่อถนนออกจากหุบเขา ขับเคลื่อนสี่ล้อคุ้มค่า"],
    either: ["บนทางหลวงใช้ได้ทั้งซีดาน ไฮบริด และ SUV", "เลือกตามความสบาย ตัวถนนไม่ได้ยาก"],
  },
};

const DISTANCE: Record<Locale, (km: string, time: string) => string> = {
  en: (km, time) => `About ${km} km, about ${time}.`,
  ka: (km, time) => `დაახლოებით ${km} კმ, დაახლოებით ${time}.`,
  ru: (km, time) => `Около ${km} км, около ${time}.`,
  de: (km, time) => `Etwa ${km} km, etwa ${time}.`,
  es: (km, time) => `Unos ${km} km, unos ${time}.`,
  fr: (km, time) => `Environ ${km} km, environ ${time}.`,
  it: (km, time) => `Circa ${km} km, circa ${time}.`,
  nl: (km, time) => `Ongeveer ${km} km, ongeveer ${time}.`,
  pl: (km, time) => `Około ${km} km, około ${time}.`,
  tr: (km, time) => `Yaklaşık ${km} km, yaklaşık ${time}.`,
  ar: (km, time) => `حوالي ${km} كم، حوالي ${time}.`,
  zh: (km, time) => `约 ${km} 公里，约 ${time}。`,
  ko: (km, time) => `약 ${km} km, 약 ${time}.`,
  th: (km, time) => `ประมาณ ${km} กม. ประมาณ ${time}`,
};

const ALSO: Record<Locale, (place: string, km: string, time: string) => string> = {
  en: (place, km, time) => `${place} is about ${km} km, about ${time}.`,
  ka: (place, km, time) => `${place} — დაახლოებით ${km} კმ, დაახლოებით ${time}.`,
  ru: (place, km, time) => `${place} — около ${km} км, около ${time}.`,
  de: (place, km, time) => `${place}: etwa ${km} km, etwa ${time}.`,
  es: (place, km, time) => `${place}: unos ${km} km, unos ${time}.`,
  fr: (place, km, time) => `${place} : environ ${km} km, environ ${time}.`,
  it: (place, km, time) => `${place}: circa ${km} km, circa ${time}.`,
  nl: (place, km, time) => `${place}: ongeveer ${km} km, ongeveer ${time}.`,
  pl: (place, km, time) => `${place}: około ${km} km, około ${time}.`,
  tr: (place, km, time) => `${place}: yaklaşık ${km} km, yaklaşık ${time}.`,
  ar: (place, km, time) => `${place}: حوالي ${km} كم، حوالي ${time}.`,
  zh: (place, km, time) => `${place}：约 ${km} 公里，约 ${time}。`,
  ko: (place, km, time) => `${place}: 약 ${km} km, 약 ${time}.`,
  th: (place, km, time) => `${place}: ประมาณ ${km} กม. ประมาณ ${time}`,
};

function named(en: string, extra: Partial<Record<Locale, string>>): Name {
  return { en, ...extra };
}

const PROMETHEUS = named("Prometheus Cave & Sataplia", {
  ka: "პრომეთეს მღვიმე და სათაფლია",
  ru: "Пещера Прометея и Сатаплиа",
  de: "Prometheus-Höhle und Sataplia",
  fr: "Grotte de Prométhée et Sataplia",
  es: "Cueva de Prometeo y Sataplia",
  it: "Grotta di Prometeo e Sataplia",
  pl: "Jaskinia Prometeusza i Sataplia",
  tr: "Prometheus Mağarası ve Sataplia",
  nl: "Prometheusgrot en Sataplia",
});
const GELATI = named("Gelati Monastery & Bagrati Cathedral", {
  ka: "გელათის მონასტერი და ბაგრატის ტაძარი",
  ru: "Гелатский монастырь и храм Баграта",
  de: "Kloster Gelati und Bagrati-Kathedrale",
  fr: "Monastère de Ghélati et cathédrale de Bagrati",
  es: "Monasterio de Gelati y catedral de Bagrati",
  it: "Monastero di Gelati e cattedrale di Bagrati",
  pl: "Monastyr Gelati i katedra Bagrati",
  tr: "Gelati Manastırı ve Bagrati Katedrali",
  nl: "Klooster Gelati en kathedraal Bagrati",
});
const CANYONS = named("Martvili & Okatse Canyons", {
  ka: "მარტვილის და ოკაცეს კანიონები",
  ru: "Каньоны Мартвили и Окаце",
  de: "Schluchten von Martwili und Okaze",
  fr: "Canyons de Martvili et d’Okatse",
  es: "Cañones de Martvili y Okatse",
  it: "Canyon di Martvili e Okatse",
  pl: "Kaniony Martwili i Okace",
  tr: "Martvili ve Okatse Kanyonları",
  nl: "Canyons van Martvili en Okatse",
});
const COAST = named("Batumi & Black Sea Coast", {
  ka: "ბათუმი და შავი ზღვის სანაპირო",
  ru: "Батуми и побережье Чёрного моря",
  de: "Batumi und die Schwarzmeerküste",
  fr: "Batoumi et la côte de la mer Noire",
  es: "Batumi y la costa del mar Negro",
  it: "Batumi e la costa del Mar Nero",
  pl: "Batumi i wybrzeże Morza Czarnego",
  tr: "Batumi ve Karadeniz kıyısı",
  nl: "Batumi en de Zwarte Zeekust",
});
const KOBULETI = named("Kobuleti", { ka: "ქობულეთი", ru: "Кобулети" });
const MESTIA = named("Mestia & Upper Svaneti", {
  ka: "მესტია და ზემო სვანეთი",
  ru: "Местиа и Верхняя Сванетия",
  de: "Mestia und Oberswanetien",
  fr: "Mestia et la Haute Svanétie",
  es: "Mestia y la Alta Esvanetia",
  it: "Mestia e l’Alta Svanezia",
  pl: "Mestia i Górna Swanetia",
  tr: "Mestia ve Yukarı Svaneti",
  nl: "Mestia en Opper-Svanetië",
});
const KUTAISI_CENTRE = named("Kutaisi centre", { ka: "ქუთაისის ცენტრი", ru: "Центр Кутаиси", de: "Zentrum von Kutaissi", fr: "Centre de Koutaïssi" });
const UPLISTSIKHE = named("Uplistsikhe", { ka: "უფლისციხე", ru: "Уплисцихе" });
const VARDZIA = named("Vardzia", { ka: "ვარძია", ru: "Вардзиа" });
const BAKURIANI = named("Bakuriani", { ka: "ბაკურიანი", ru: "Бакуриани" });
const SIGHNAGHI = named("Sighnaghi", { ka: "სიღნაღი", ru: "Сигнахи" });
const KAZBEGI = named("Kazbegi", { ka: "ყაზბეგი", ru: "Казбеги" });
const TSINANDALI = named("Tsinandali", { ka: "წინანდალი", ru: "Цинандали" });
const GARNI = named("Garni & Geghard", { ka: "გარნი და გეღარდი", ru: "Гарни и Гегард" });
const SEVAN = named("Lake Sevan", { ka: "სევანის ტბა", ru: "Озеро Севан" });
const GOBUSTAN = named("Gobustan", { ka: "გობუსტანი", ru: "Гобустан" });
const SIDE = named("Side", { ka: "სიდე", ru: "Сиде" });
const ALANYA = named("Alanya", { ka: "ალანია", ru: "Аланья" });
const EPHESUS = named("Ephesus", { ka: "ეფესო", ru: "Эфес" });
const CAPPADOCIA = named("Cappadocia", { ka: "კაპადოკია", ru: "Каппадокия" });
const BURSA = named("Bursa", { ka: "ბურსა", ru: "Бурса" });
const TROODOS = named("Troodos", { ka: "ტროოდოსი", ru: "Троодос" });
const KOURION = named("Kourion", { ka: "კურიონი", ru: "Курион" });
const AYIA = named("Ayia Napa", { ka: "აია ნაპა", ru: "Айя-Напа" });
const PROTARAS = named("Protaras", { ka: "პროტარასი", ru: "Протарас" });

const AIRPORTS: Record<string, Spot[]> = {
  KUT: [
    { name: KUTAISI_CENTRE, km: "18", time: "25 min", tip: "sedan" },
    { name: PROMETHEUS, km: "25–30", time: "30–35 min", tip: "sedan" },
    { name: GELATI, km: "25–30", time: "30–40 min", tip: "standard" },
    { name: CANYONS, km: "45–55", time: "45–60 min", tip: "crossover" },
    { name: COAST, km: "120", time: "2 h", tip: "highway", also: { name: KOBULETI, km: "100", time: "1 h 40 min" } },
    { name: MESTIA, km: "215", time: "4–4.5 h", tip: "mountain" },
    { name: "Tbilisi", km: "230", time: "3.5 h", tip: "either" },
  ],
  TBS: [
    { name: "Tbilisi", km: "18", time: "30 min", tip: "sedan" },
    { name: "Mtskheta", km: "30", time: "40 min", tip: "sedan" },
    { name: KAZBEGI, km: "155", time: "3 h", tip: "mountain" },
    { name: SIGHNAGHI, km: "120", time: "2 h", tip: "sedan" },
    { name: "Borjomi", km: "170", time: "2.5 h", tip: "sedan" },
    { name: "Kutaisi", km: "240", time: "3.5 h", tip: "either" },
    { name: "Batumi", km: "380", time: "6 h", tip: "highway" },
  ],
  BUS: [
    { name: "Batumi", km: "5", time: "15 min", tip: "sedan" },
    { name: KOBULETI, km: "30", time: "35 min", tip: "sedan" },
    { name: "Kutaisi", km: "120", time: "2 h", tip: "highway" },
    { name: MESTIA, km: "270", time: "6.5 h", tip: "mountain" },
    { name: "Tbilisi", km: "370", time: "6 h", tip: "either" },
  ],
  EVN: [
    { name: "Yerevan", km: "12", time: "25 min", tip: "sedan" },
    { name: GARNI, km: "40", time: "50 min", tip: "sedan" },
    { name: SEVAN, km: "80", time: "1.5 h", tip: "sedan" },
    { name: "Dilijan", km: "110", time: "1.5 h", tip: "crossover" },
    { name: "Gyumri", km: "130", time: "2 h", tip: "highway" },
  ],
  GYD: [
    { name: "Baku", km: "25", time: "40 min", tip: "sedan" },
    { name: GOBUSTAN, km: "70", time: "1.5 h", tip: "sedan" },
    { name: "Gabala", km: "230", time: "3.5 h", tip: "either" },
    { name: "Ganja", km: "370", time: "4.5 h", tip: "highway" },
  ],
  LCA: [
    { name: "Larnaca", km: "8", time: "15 min", tip: "sedan" },
    { name: AYIA, km: "45", time: "40 min", tip: "sedan" },
    { name: PROTARAS, km: "55", time: "50 min", tip: "sedan" },
    { name: "Nicosia", km: "50", time: "45 min", tip: "sedan" },
    { name: "Limassol", km: "70", time: "50 min", tip: "highway" },
    { name: "Paphos", km: "140", time: "1.5 h", tip: "highway" },
  ],
  PFO: [
    { name: "Paphos", km: "15", time: "20 min", tip: "sedan" },
    { name: KOURION, km: "50", time: "45 min", tip: "sedan" },
    { name: "Limassol", km: "70", time: "50 min", tip: "highway" },
    { name: "Larnaca", km: "140", time: "1.5 h", tip: "highway" },
    { name: AYIA, km: "170", time: "2 h", tip: "highway" },
  ],
  IST: [
    { name: "Istanbul", km: "40", time: "50 min", tip: "sedan" },
    { name: BURSA, km: "150", time: "2 h", tip: "highway" },
  ],
  SAW: [
    { name: "Istanbul", km: "45", time: "1 h", tip: "sedan" },
    { name: BURSA, km: "120", time: "1.5 h", tip: "highway" },
  ],
  AYT: [
    { name: "Antalya", km: "15", time: "25 min", tip: "sedan" },
    { name: SIDE, km: "75", time: "1 h", tip: "highway" },
    { name: ALANYA, km: "135", time: "1.5 h", tip: "highway" },
  ],
  ADB: [
    { name: "Izmir", km: "18", time: "25 min", tip: "sedan" },
    { name: EPHESUS, km: "55", time: "50 min", tip: "sedan" },
    { name: "Cesme", km: "85", time: "1 h", tip: "highway" },
  ],
  ESB: [
    { name: "Ankara", km: "30", time: "35 min", tip: "sedan" },
    { name: CAPPADOCIA, km: "280", time: "3.5 h", tip: "highway" },
  ],
};

const CITY_DRIVES: Record<string, Spot[]> = {
  Kutaisi: [
    { name: PROMETHEUS, km: "20", time: "25 min", tip: "sedan" },
    { name: GELATI, km: "12", time: "20 min", tip: "standard" },
    { name: CANYONS, km: "45", time: "50 min", tip: "crossover" },
    { name: COAST, km: "140", time: "2.5 h", tip: "highway" },
    { name: MESTIA, km: "220", time: "4.5 h", tip: "mountain" },
    { name: "Tbilisi", km: "220", time: "3.5 h", tip: "either" },
  ],
  Tbilisi: [
    { name: "Mtskheta", km: "25", time: "30 min", tip: "sedan" },
    { name: "Rustavi", km: "25", time: "30 min", tip: "sedan" },
    { name: UPLISTSIKHE, km: "80", time: "1 h", tip: "sedan" },
    { name: KAZBEGI, km: "150", time: "2.5 h", tip: "mountain" },
    { name: SIGHNAGHI, km: "110", time: "2 h", tip: "sedan" },
    { name: "Borjomi", km: "160", time: "2.5 h", tip: "sedan" },
    { name: "Kutaisi", km: "220", time: "3.5 h", tip: "either" },
    { name: "Batumi", km: "370", time: "6 h", tip: "highway" },
  ],
  Batumi: [
    { name: KOBULETI, km: "25", time: "30 min", tip: "sedan" },
    { name: "Kutaisi", km: "140", time: "2.5 h", tip: "highway" },
    { name: MESTIA, km: "260", time: "6.5 h", tip: "mountain" },
    { name: "Tbilisi", km: "370", time: "6 h", tip: "either" },
  ],
  Mtskheta: [
    { name: "Tbilisi", km: "25", time: "30 min", tip: "sedan" },
    { name: KAZBEGI, km: "130", time: "2 h", tip: "mountain" },
    { name: "Gori", km: "70", time: "1 h", tip: "sedan" },
  ],
  Gori: [
    { name: UPLISTSIKHE, km: "15", time: "20 min", tip: "sedan" },
    { name: "Tbilisi", km: "80", time: "1 h", tip: "sedan" },
    { name: "Kutaisi", km: "150", time: "2.5 h", tip: "either" },
  ],
  Borjomi: [
    { name: BAKURIANI, km: "30", time: "40 min", tip: "mountain" },
    { name: "Akhaltsikhe", km: "50", time: "1 h", tip: "sedan" },
    { name: "Tbilisi", km: "160", time: "2.5 h", tip: "sedan" },
  ],
  Telavi: [
    { name: TSINANDALI, km: "10", time: "15 min", tip: "sedan" },
    { name: SIGHNAGHI, km: "40", time: "45 min", tip: "sedan" },
    { name: "Tbilisi", km: "100", time: "1.5 h", tip: "sedan" },
  ],
  Zugdidi: [
    { name: CANYONS, km: "40", time: "45 min", tip: "crossover" },
    { name: MESTIA, km: "140", time: "3.5 h", tip: "mountain" },
    { name: "Kutaisi", km: "100", time: "1.5 h", tip: "sedan" },
  ],
  Poti: [
    { name: "Batumi", km: "70", time: "1.5 h", tip: "sedan" },
    { name: "Kutaisi", km: "90", time: "1.5 h", tip: "sedan" },
  ],
  Kobuleti: [
    { name: "Batumi", km: "25", time: "30 min", tip: "sedan" },
    { name: "Kutaisi", km: "110", time: "2 h", tip: "highway" },
  ],
  Rustavi: [
    { name: "Tbilisi", km: "25", time: "30 min", tip: "sedan" },
    { name: "Mtskheta", km: "45", time: "50 min", tip: "sedan" },
  ],
  Akhaltsikhe: [
    { name: VARDZIA, km: "60", time: "1 h 15 min", tip: "crossover" },
    { name: "Borjomi", km: "50", time: "1 h", tip: "sedan" },
    { name: "Tbilisi", km: "200", time: "3.5 h", tip: "sedan" },
  ],
  Ozurgeti: [
    { name: "Batumi", km: "45", time: "50 min", tip: "sedan" },
    { name: "Kutaisi", km: "90", time: "1.5 h", tip: "sedan" },
  ],
  Senaki: [
    { name: CANYONS, km: "25", time: "30 min", tip: "crossover" },
    { name: "Kutaisi", km: "45", time: "40 min", tip: "sedan" },
  ],
  Khashuri: [
    { name: "Borjomi", km: "30", time: "30 min", tip: "sedan" },
    { name: "Gori", km: "45", time: "40 min", tip: "sedan" },
    { name: "Tbilisi", km: "120", time: "1.5 h", tip: "sedan" },
  ],
  Marneuli: [
    { name: "Tbilisi", km: "30", time: "40 min", tip: "sedan" },
    { name: "Mtskheta", km: "55", time: "1 h", tip: "sedan" },
  ],
  Yerevan: [
    { name: GARNI, km: "30", time: "40 min", tip: "sedan" },
    { name: SEVAN, km: "70", time: "1 h", tip: "sedan" },
    { name: "Dilijan", km: "100", time: "1.5 h", tip: "crossover" },
    { name: "Gyumri", km: "125", time: "1.5 h", tip: "highway" },
  ],
  Gyumri: [
    { name: "Yerevan", km: "125", time: "1.5 h", tip: "highway" },
  ],
  Baku: [
    { name: GOBUSTAN, km: "65", time: "1 h", tip: "sedan" },
    { name: "Gabala", km: "220", time: "3.5 h", tip: "either" },
    { name: "Ganja", km: "360", time: "4.5 h", tip: "highway" },
  ],
  Gabala: [
    { name: "Baku", km: "220", time: "3.5 h", tip: "either" },
    { name: "Sheki", km: "80", time: "1.5 h", tip: "crossover" },
  ],
  Ganja: [
    { name: "Baku", km: "360", time: "4.5 h", tip: "highway" },
  ],
  Larnaca: [
    { name: AYIA, km: "45", time: "40 min", tip: "sedan" },
    { name: PROTARAS, km: "50", time: "45 min", tip: "sedan" },
    { name: "Nicosia", km: "50", time: "45 min", tip: "sedan" },
    { name: "Limassol", km: "70", time: "50 min", tip: "highway" },
  ],
  "Ayia Napa": [
    { name: PROTARAS, km: "15", time: "20 min", tip: "sedan" },
    { name: "Larnaca", km: "45", time: "40 min", tip: "sedan" },
    { name: "Limassol", km: "100", time: "1.5 h", tip: "highway" },
  ],
  Protaras: [
    { name: AYIA, km: "15", time: "20 min", tip: "sedan" },
    { name: "Larnaca", km: "50", time: "50 min", tip: "sedan" },
  ],
  Limassol: [
    { name: KOURION, km: "15", time: "20 min", tip: "sedan" },
    { name: TROODOS, km: "50", time: "1 h", tip: "mountain" },
    { name: "Larnaca", km: "70", time: "50 min", tip: "highway" },
    { name: "Paphos", km: "70", time: "50 min", tip: "highway" },
    { name: AYIA, km: "100", time: "1.5 h", tip: "highway" },
  ],
  Paphos: [
    { name: "Limassol", km: "70", time: "50 min", tip: "highway" },
    { name: "Larnaca", km: "140", time: "1.5 h", tip: "highway" },
    { name: AYIA, km: "170", time: "2 h", tip: "highway" },
  ],
  Nicosia: [
    { name: "Larnaca", km: "50", time: "45 min", tip: "sedan" },
    { name: TROODOS, km: "70", time: "1.5 h", tip: "mountain" },
    { name: "Limassol", km: "80", time: "1 h", tip: "highway" },
  ],
  Istanbul: [
    { name: BURSA, km: "150", time: "2 h", tip: "highway" },
  ],
  Antalya: [
    { name: SIDE, km: "70", time: "1 h", tip: "highway" },
    { name: ALANYA, km: "130", time: "1.5 h", tip: "highway" },
  ],
  Izmir: [
    { name: EPHESUS, km: "80", time: "1 h", tip: "sedan" },
    { name: "Cesme", km: "80", time: "1 h", tip: "highway" },
  ],
  Ankara: [
    { name: CAPPADOCIA, km: "280", time: "3.5 h", tip: "highway" },
  ],
};

function lang(locale: string): Locale {
  return locale in TIPS ? (locale as Locale) : "en";
}

function titleOf(locale: string, name: string | Name): string {
  const code = lang(locale);
  if (typeof name === "string") return cityDisplayName(code, name) || name;
  return name[code] || cityDisplayName(code, name.en) || name.en;
}

function lines(spots: Spot[], locale: string): DriveLine[] {
  const code = lang(locale);
  return spots
    .filter((spot) => spot.km !== "0")
    .map((spot, index) => ({
      title: titleOf(locale, spot.name),
      distance: DISTANCE[code](spot.km, spot.time),
      tip: TIPS[code][spot.tip][index % 2],
      also: spot.also
        ? ALSO[code](titleOf(locale, spot.also.name), spot.also.km, spot.also.time)
        : undefined,
    }));
}

function combined(base: Spot[] | undefined, extra: Spot[] | undefined): Spot[] | undefined {
  if (!base?.length && !extra?.length) return undefined;
  return [...(base ?? []), ...(extra ?? [])];
}

/** Drives for an airport code, or for a city when the page is not that airport. */
export function locationRouteLines(code: string, locale: string, cityName?: string): DriveLine[] {
  const direct = code.trim().toUpperCase();
  const airportSpots = combined(AIRPORTS[direct], EXTRA_AIRPORTS[direct]);
  if (airportSpots) return lines(airportSpots, locale);
  const city = (cityName || "").trim();
  const citySpots = city ? combined(CITY_DRIVES[city], EXTRA_CITIES[city]) : undefined;
  if (citySpots) return lines(citySpots, locale);
  return [];
}
