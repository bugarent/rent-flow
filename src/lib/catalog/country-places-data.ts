/**
 * Airports and major cities per country for homepage search.
 * Compact tuples: airports [IATA, city, airport name], cities [slug, English name].
 */
export type AirportSeed = [iata: string, city: string, airportName: string];
export type CitySeed = [slug: string, name: string];
export type CountryPlaceSeed = {
  airports?: AirportSeed[];
  cities: CitySeed[];
};

export const COUNTRY_PLACES: Record<string, CountryPlaceSeed> = {
  GE: {
    airports: [
      ["TBS", "Tbilisi", "Tbilisi International Airport"],
      ["KUT", "Kutaisi", "Kutaisi International Airport"],
      ["BUS", "Batumi", "Batumi International Airport"],
    ],
    cities: [
      ["tbilisi", "Tbilisi"],
      ["kutaisi", "Kutaisi"],
      ["batumi", "Batumi"],
      ["rustavi", "Rustavi"],
      ["gori", "Gori"],
      ["zugdidi", "Zugdidi"],
      ["poti", "Poti"],
      ["telavi", "Telavi"],
      ["kobuleti", "Kobuleti"],
      ["mtskheta", "Mtskheta"],
      ["marneuli", "Marneuli"],
      ["khashuri", "Khashuri"],
      ["senaki", "Senaki"],
      ["ozurgeti", "Ozurgeti"],
      ["akhaltsikhe", "Akhaltsikhe"],
      ["borjomi", "Borjomi"],
    ],
  },
  AM: {
    airports: [
      ["EVN", "Yerevan", "Zvartnots International Airport"],
      ["LWN", "Gyumri", "Shirak Airport"],
    ],
    cities: [
      ["yerevan", "Yerevan"],
      ["gyumri", "Gyumri"],
      ["vanadzor", "Vanadzor"],
      ["vagharshapat", "Vagharshapat"],
      ["hrazdan", "Hrazdan"],
      ["kapan", "Kapan"],
      ["armavir", "Armavir"],
    ],
  },
  AZ: {
    airports: [
      ["GYD", "Baku", "Heydar Aliyev International Airport"],
      ["GNJ", "Ganja", "Ganja International Airport"],
      ["NAJ", "Nakhchivan", "Nakhchivan International Airport"],
      ["LLK", "Lankaran", "Lankaran International Airport"],
      ["GBB", "Gabala", "Gabala International Airport"],
    ],
    cities: [
      ["baku", "Baku"],
      ["ganja", "Ganja"],
      ["sumqayit", "Sumqayit"],
      ["lankaran", "Lankaran"],
      ["mingachevir", "Mingachevir"],
      ["shirvan", "Shirvan"],
      ["nakhchivan", "Nakhchivan"],
      ["shaki", "Shaki"],
      ["gabala", "Gabala"],
      ["khirdalan", "Khirdalan"],
    ],
  },
  TR: {
    airports: [
      ["IST", "Istanbul", "Istanbul Airport"],
      ["SAW", "Istanbul", "Istanbul Sabiha Gökçen"],
      ["AYT", "Antalya", "Antalya Airport"],
      ["ESB", "Ankara", "Ankara Esenboğa"],
      ["ADB", "Izmir", "Izmir Adnan Menderes"],
      ["BJV", "Bodrum", "Milas–Bodrum Airport"],
      ["DLM", "Dalaman", "Dalaman Airport"],
      ["TZX", "Trabzon", "Trabzon Airport"],
      ["GZT", "Gaziantep", "Gaziantep Airport"],
      ["ASR", "Kayseri", "Kayseri Erkilet"],
    ],
    cities: [
      ["istanbul", "Istanbul"],
      ["ankara", "Ankara"],
      ["izmir", "Izmir"],
      ["antalya", "Antalya"],
      ["bursa", "Bursa"],
      ["adana", "Adana"],
      ["gaziantep", "Gaziantep"],
      ["konya", "Konya"],
      ["trabzon", "Trabzon"],
      ["bodrum", "Bodrum"],
      ["alanya", "Alanya"],
      ["mersin", "Mersin"],
    ],
  },
  FR: {
    airports: [
      ["CDG", "Paris", "Paris Charles de Gaulle"],
      ["ORY", "Paris", "Paris Orly"],
      ["NCE", "Nice", "Nice Côte d'Azur"],
      ["LYS", "Lyon", "Lyon–Saint-Exupéry"],
      ["MRS", "Marseille", "Marseille Provence"],
      ["TLS", "Toulouse", "Toulouse–Blagnac"],
      ["BOD", "Bordeaux", "Bordeaux–Mérignac"],
      ["NTE", "Nantes", "Nantes Atlantique"],
    ],
    cities: [
      ["paris", "Paris"],
      ["marseille", "Marseille"],
      ["lyon", "Lyon"],
      ["toulouse", "Toulouse"],
      ["nice", "Nice"],
      ["nantes", "Nantes"],
      ["strasbourg", "Strasbourg"],
      ["bordeaux", "Bordeaux"],
      ["lille", "Lille"],
      ["montpellier", "Montpellier"],
    ],
  },
  DE: {
    airports: [
      ["FRA", "Frankfurt", "Frankfurt Airport"],
      ["MUC", "Munich", "Munich Airport"],
      ["BER", "Berlin", "Berlin Brandenburg"],
      ["DUS", "Dusseldorf", "Düsseldorf Airport"],
      ["HAM", "Hamburg", "Hamburg Airport"],
      ["CGN", "Cologne", "Cologne Bonn Airport"],
      ["STR", "Stuttgart", "Stuttgart Airport"],
    ],
    cities: [
      ["berlin", "Berlin"],
      ["hamburg", "Hamburg"],
      ["munich", "Munich"],
      ["cologne", "Cologne"],
      ["frankfurt", "Frankfurt"],
      ["stuttgart", "Stuttgart"],
      ["dusseldorf", "Düsseldorf"],
      ["dortmund", "Dortmund"],
      ["leipzig", "Leipzig"],
      ["dresden", "Dresden"],
    ],
  },
  IT: {
    airports: [
      ["FCO", "Rome", "Rome Fiumicino"],
      ["MXP", "Milan", "Milan Malpensa"],
      ["LIN", "Milan", "Milan Linate"],
      ["VCE", "Venice", "Venice Marco Polo"],
      ["NAP", "Naples", "Naples International"],
      ["BLQ", "Bologna", "Bologna Guglielmo Marconi"],
      ["PSA", "Pisa", "Pisa International"],
      ["CTA", "Catania", "Catania Fontanarossa"],
    ],
    cities: [
      ["rome", "Rome"],
      ["milan", "Milan"],
      ["naples", "Naples"],
      ["turin", "Turin"],
      ["palermo", "Palermo"],
      ["genoa", "Genoa"],
      ["bologna", "Bologna"],
      ["florence", "Florence"],
      ["venice", "Venice"],
      ["verona", "Verona"],
    ],
  },
  ES: {
    airports: [
      ["MAD", "Madrid", "Madrid Barajas"],
      ["BCN", "Barcelona", "Barcelona El Prat"],
      ["PMI", "Palma", "Palma de Mallorca"],
      ["AGP", "Malaga", "Málaga Airport"],
      ["ALC", "Alicante", "Alicante–Elche"],
      ["VLC", "Valencia", "Valencia Airport"],
      ["SVQ", "Seville", "Seville Airport"],
    ],
    cities: [
      ["madrid", "Madrid"],
      ["barcelona", "Barcelona"],
      ["valencia", "Valencia"],
      ["seville", "Seville"],
      ["zaragoza", "Zaragoza"],
      ["malaga", "Málaga"],
      ["murcia", "Murcia"],
      ["palma", "Palma"],
      ["bilbao", "Bilbao"],
      ["alicante", "Alicante"],
    ],
  },
  GB: {
    airports: [
      ["LHR", "London", "London Heathrow"],
      ["LGW", "London", "London Gatwick"],
      ["STN", "London", "London Stansted"],
      ["LTN", "London", "London Luton"],
      ["MAN", "Manchester", "Manchester Airport"],
      ["EDI", "Edinburgh", "Edinburgh Airport"],
      ["BHX", "Birmingham", "Birmingham Airport"],
      ["GLA", "Glasgow", "Glasgow Airport"],
    ],
    cities: [
      ["london", "London"],
      ["birmingham", "Birmingham"],
      ["manchester", "Manchester"],
      ["glasgow", "Glasgow"],
      ["liverpool", "Liverpool"],
      ["leeds", "Leeds"],
      ["edinburgh", "Edinburgh"],
      ["bristol", "Bristol"],
      ["cardiff", "Cardiff"],
      ["belfast", "Belfast"],
    ],
  },
  PL: {
    airports: [
      ["WAW", "Warsaw", "Warsaw Chopin"],
      ["WMI", "Warsaw", "Warsaw Modlin"],
      ["KRK", "Krakow", "Kraków John Paul II"],
      ["GDN", "Gdansk", "Gdańsk Lech Wałęsa"],
      ["WRO", "Wroclaw", "Wrocław Airport"],
      ["KTW", "Katowice", "Katowice Airport"],
      ["POZ", "Poznan", "Poznań–Ławica"],
    ],
    cities: [
      ["warsaw", "Warsaw"],
      ["krakow", "Kraków"],
      ["lodz", "Łódź"],
      ["wroclaw", "Wrocław"],
      ["poznan", "Poznań"],
      ["gdansk", "Gdańsk"],
      ["szczecin", "Szczecin"],
      ["bydgoszcz", "Bydgoszcz"],
      ["lublin", "Lublin"],
      ["katowice", "Katowice"],
    ],
  },
  GR: {
    airports: [
      ["ATH", "Athens", "Athens International"],
      ["SKG", "Thessaloniki", "Thessaloniki Airport"],
      ["HER", "Heraklion", "Heraklion Airport"],
      ["RHO", "Rhodes", "Rhodes Airport"],
      ["JMK", "Mykonos", "Mykonos Airport"],
      ["JTR", "Santorini", "Santorini Airport"],
    ],
    cities: [
      ["athens", "Athens"],
      ["thessaloniki", "Thessaloniki"],
      ["patras", "Patras"],
      ["heraklion", "Heraklion"],
      ["larissa", "Larissa"],
      ["volos", "Volos"],
      ["rhodes", "Rhodes"],
    ],
  },
  NL: {
    airports: [
      ["AMS", "Amsterdam", "Amsterdam Schiphol"],
      ["RTM", "Rotterdam", "Rotterdam The Hague"],
      ["EIN", "Eindhoven", "Eindhoven Airport"],
    ],
    cities: [
      ["amsterdam", "Amsterdam"],
      ["rotterdam", "Rotterdam"],
      ["the-hague", "The Hague"],
      ["utrecht", "Utrecht"],
      ["eindhoven", "Eindhoven"],
      ["groningen", "Groningen"],
    ],
  },
  CZ: {
    airports: [
      ["PRG", "Prague", "Prague Václav Havel"],
      ["BRQ", "Brno", "Brno–Tuřany"],
      ["OSR", "Ostrava", "Ostrava Airport"],
    ],
    cities: [
      ["prague", "Prague"],
      ["brno", "Brno"],
      ["ostrava", "Ostrava"],
      ["plzen", "Plzeň"],
      ["liberec", "Liberec"],
    ],
  },
  RO: {
    airports: [
      ["OTP", "Bucharest", "Bucharest Otopeni"],
      ["CLJ", "Cluj", "Cluj International"],
      ["TSR", "Timisoara", "Timișoara Airport"],
      ["IAS", "Iasi", "Iași Airport"],
    ],
    cities: [
      ["bucharest", "Bucharest"],
      ["cluj-napoca", "Cluj-Napoca"],
      ["timisoara", "Timișoara"],
      ["iasi", "Iași"],
      ["constanta", "Constanța"],
      ["craiova", "Craiova"],
      ["brasov", "Brașov"],
    ],
  },
  BG: {
    airports: [
      ["SOF", "Sofia", "Sofia Airport"],
      ["VAR", "Varna", "Varna Airport"],
      ["BOJ", "Burgas", "Burgas Airport"],
    ],
    cities: [
      ["sofia", "Sofia"],
      ["plovdiv", "Plovdiv"],
      ["varna", "Varna"],
      ["burgas", "Burgas"],
      ["ruse", "Ruse"],
    ],
  },
  UA: {
    airports: [
      ["KBP", "Kyiv", "Kyiv Boryspil"],
      ["IEV", "Kyiv", "Kyiv Zhuliany"],
      ["LWO", "Lviv", "Lviv Danylo Halytskyi"],
      ["ODS", "Odesa", "Odesa International"],
    ],
    cities: [
      ["kyiv", "Kyiv"],
      ["kharkiv", "Kharkiv"],
      ["odesa", "Odesa"],
      ["dnipro", "Dnipro"],
      ["lviv", "Lviv"],
      ["zaporizhzhia", "Zaporizhzhia"],
    ],
  },
  AE: {
    airports: [
      ["DXB", "Dubai", "Dubai International"],
      ["DWC", "Dubai", "Dubai World Central"],
      ["AUH", "Abu Dhabi", "Abu Dhabi International"],
      ["SHJ", "Sharjah", "Sharjah International"],
    ],
    cities: [
      ["dubai", "Dubai"],
      ["abu-dhabi", "Abu Dhabi"],
      ["sharjah", "Sharjah"],
      ["ajman", "Ajman"],
      ["ras-al-khaimah", "Ras Al Khaimah"],
      ["al-ain", "Al Ain"],
    ],
  },
  IL: {
    airports: [
      ["TLV", "Tel Aviv", "Tel Aviv Ben Gurion"],
      ["ETH", "Eilat", "Eilat Ramon"],
      ["HFA", "Haifa", "Haifa Airport"],
    ],
    cities: [
      ["tel-aviv", "Tel Aviv"],
      ["jerusalem", "Jerusalem"],
      ["haifa", "Haifa"],
      ["rishon-lezion", "Rishon LeZion"],
      ["petah-tikva", "Petah Tikva"],
      ["eilat", "Eilat"],
    ],
  },
  US: {
    airports: [
      ["JFK", "New York", "New York JFK"],
      ["EWR", "Newark", "Newark Liberty"],
      ["LAX", "Los Angeles", "Los Angeles International"],
      ["ORD", "Chicago", "Chicago O'Hare"],
      ["MIA", "Miami", "Miami International"],
      ["DFW", "Dallas", "Dallas/Fort Worth"],
      ["ATL", "Atlanta", "Atlanta Hartsfield-Jackson"],
      ["SFO", "San Francisco", "San Francisco International"],
      ["LAS", "Las Vegas", "Las Vegas Harry Reid"],
      ["SEA", "Seattle", "Seattle-Tacoma"],
      ["BOS", "Boston", "Boston Logan"],
      ["IAD", "Washington", "Washington Dulles"],
    ],
    cities: [
      ["new-york", "New York"],
      ["los-angeles", "Los Angeles"],
      ["chicago", "Chicago"],
      ["houston", "Houston"],
      ["phoenix", "Phoenix"],
      ["philadelphia", "Philadelphia"],
      ["san-antonio", "San Antonio"],
      ["san-diego", "San Diego"],
      ["dallas", "Dallas"],
      ["san-jose", "San Jose"],
      ["austin", "Austin"],
      ["miami", "Miami"],
      ["seattle", "Seattle"],
      ["denver", "Denver"],
      ["boston", "Boston"],
      ["las-vegas", "Las Vegas"],
      ["washington", "Washington"],
    ],
  },
  PT: {
    airports: [
      ["LIS", "Lisbon", "Lisbon Humberto Delgado"],
      ["OPO", "Porto", "Porto Airport"],
      ["FAO", "Faro", "Faro Airport"],
    ],
    cities: [
      ["lisbon", "Lisbon"],
      ["porto", "Porto"],
      ["braga", "Braga"],
      ["coimbra", "Coimbra"],
      ["faro", "Faro"],
    ],
  },
  AT: {
    airports: [
      ["VIE", "Vienna", "Vienna International"],
      ["SZG", "Salzburg", "Salzburg Airport"],
      ["INN", "Innsbruck", "Innsbruck Airport"],
    ],
    cities: [
      ["vienna", "Vienna"],
      ["graz", "Graz"],
      ["linz", "Linz"],
      ["salzburg", "Salzburg"],
      ["innsbruck", "Innsbruck"],
    ],
  },
  CH: {
    airports: [
      ["ZRH", "Zurich", "Zurich Airport"],
      ["GVA", "Geneva", "Geneva Airport"],
      ["BSL", "Basel", "EuroAirport Basel"],
    ],
    cities: [
      ["zurich", "Zurich"],
      ["geneva", "Geneva"],
      ["basel", "Basel"],
      ["bern", "Bern"],
      ["lausanne", "Lausanne"],
    ],
  },
  BE: {
    airports: [
      ["BRU", "Brussels", "Brussels Airport"],
      ["CRL", "Charleroi", "Brussels South Charleroi"],
    ],
    cities: [
      ["brussels", "Brussels"],
      ["antwerp", "Antwerp"],
      ["ghent", "Ghent"],
      ["charleroi", "Charleroi"],
      ["liege", "Liège"],
    ],
  },
  HU: {
    airports: [["BUD", "Budapest", "Budapest Ferenc Liszt"]],
    cities: [
      ["budapest", "Budapest"],
      ["debrecen", "Debrecen"],
      ["szeged", "Szeged"],
      ["miskolc", "Miskolc"],
      ["pecs", "Pécs"],
    ],
  },
  HR: {
    airports: [
      ["ZAG", "Zagreb", "Zagreb Airport"],
      ["SPU", "Split", "Split Airport"],
      ["DBV", "Dubrovnik", "Dubrovnik Airport"],
    ],
    cities: [
      ["zagreb", "Zagreb"],
      ["split", "Split"],
      ["rijeka", "Rijeka"],
      ["osijek", "Osijek"],
      ["zadar", "Zadar"],
      ["dubrovnik", "Dubrovnik"],
    ],
  },
  RS: {
    airports: [
      ["BEG", "Belgrade", "Belgrade Nikola Tesla"],
      ["INI", "Nis", "Niš Constantine the Great"],
    ],
    cities: [
      ["belgrade", "Belgrade"],
      ["novi-sad", "Novi Sad"],
      ["nis", "Niš"],
      ["kragujevac", "Kragujevac"],
    ],
  },
  SE: {
    airports: [
      ["ARN", "Stockholm", "Stockholm Arlanda"],
      ["GOT", "Gothenburg", "Gothenburg Landvetter"],
      ["MMX", "Malmo", "Malmö Airport"],
    ],
    cities: [
      ["stockholm", "Stockholm"],
      ["gothenburg", "Gothenburg"],
      ["malmo", "Malmö"],
      ["uppsala", "Uppsala"],
    ],
  },
  NO: {
    airports: [
      ["OSL", "Oslo", "Oslo Gardermoen"],
      ["BGO", "Bergen", "Bergen Airport"],
      ["TRD", "Trondheim", "Trondheim Airport"],
    ],
    cities: [
      ["oslo", "Oslo"],
      ["bergen", "Bergen"],
      ["trondheim", "Trondheim"],
      ["stavanger", "Stavanger"],
    ],
  },
  DK: {
    airports: [
      ["CPH", "Copenhagen", "Copenhagen Airport"],
      ["BLL", "Billund", "Billund Airport"],
      ["AAL", "Aalborg", "Aalborg Airport"],
    ],
    cities: [
      ["copenhagen", "Copenhagen"],
      ["aarhus", "Aarhus"],
      ["odense", "Odense"],
      ["aalborg", "Aalborg"],
    ],
  },
  FI: {
    airports: [
      ["HEL", "Helsinki", "Helsinki-Vantaa"],
      ["TMP", "Tampere", "Tampere-Pirkkala"],
    ],
    cities: [
      ["helsinki", "Helsinki"],
      ["espoo", "Espoo"],
      ["tampere", "Tampere"],
      ["oulu", "Oulu"],
      ["turku", "Turku"],
    ],
  },
  IE: {
    airports: [
      ["DUB", "Dublin", "Dublin Airport"],
      ["SNN", "Shannon", "Shannon Airport"],
      ["ORK", "Cork", "Cork Airport"],
    ],
    cities: [
      ["dublin", "Dublin"],
      ["cork", "Cork"],
      ["limerick", "Limerick"],
      ["galway", "Galway"],
    ],
  },
  RU: {
    airports: [
      ["SVO", "Moscow", "Moscow Sheremetyevo"],
      ["DME", "Moscow", "Moscow Domodedovo"],
      ["VKO", "Moscow", "Moscow Vnukovo"],
      ["LED", "Saint Petersburg", "Pulkovo Airport"],
      ["AER", "Sochi", "Sochi Airport"],
      ["KZN", "Kazan", "Kazan Airport"],
    ],
    cities: [
      ["moscow", "Moscow"],
      ["saint-petersburg", "Saint Petersburg"],
      ["novosibirsk", "Novosibirsk"],
      ["yekaterinburg", "Yekaterinburg"],
      ["kazan", "Kazan"],
      ["nizhny-novgorod", "Nizhny Novgorod"],
      ["sochi", "Sochi"],
    ],
  },
  KZ: {
    airports: [
      ["NQZ", "Astana", "Astana Nursultan Nazarbayev"],
      ["ALA", "Almaty", "Almaty International"],
    ],
    cities: [
      ["astana", "Astana"],
      ["almaty", "Almaty"],
      ["shymkent", "Shymkent"],
      ["aktobe", "Aktobe"],
    ],
  },
  UZ: {
    airports: [
      ["TAS", "Tashkent", "Tashkent International"],
      ["SKD", "Samarkand", "Samarkand International"],
    ],
    cities: [
      ["tashkent", "Tashkent"],
      ["samarkand", "Samarkand"],
      ["bukhara", "Bukhara"],
      ["namangan", "Namangan"],
    ],
  },
  SA: {
    airports: [
      ["RUH", "Riyadh", "Riyadh King Khalid"],
      ["JED", "Jeddah", "Jeddah King Abdulaziz"],
      ["DMM", "Dammam", "Dammam King Fahd"],
    ],
    cities: [
      ["riyadh", "Riyadh"],
      ["jeddah", "Jeddah"],
      ["mecca", "Mecca"],
      ["medina", "Medina"],
      ["dammam", "Dammam"],
    ],
  },
  QA: {
    airports: [["DOH", "Doha", "Doha Hamad International"]],
    cities: [
      ["doha", "Doha"],
      ["al-rayyan", "Al Rayyan"],
      ["al-wakrah", "Al Wakrah"],
    ],
  },
  EG: {
    airports: [
      ["CAI", "Cairo", "Cairo International"],
      ["HRG", "Hurghada", "Hurghada International"],
      ["SSH", "Sharm El Sheikh", "Sharm El Sheikh International"],
      ["ALY", "Alexandria", "Alexandria International"],
    ],
    cities: [
      ["cairo", "Cairo"],
      ["alexandria", "Alexandria"],
      ["giza", "Giza"],
      ["luxor", "Luxor"],
      ["hurghada", "Hurghada"],
      ["sharm-el-sheikh", "Sharm El Sheikh"],
    ],
  },
  IN: {
    airports: [
      ["DEL", "Delhi", "Delhi Indira Gandhi"],
      ["BOM", "Mumbai", "Mumbai Chhatrapati Shivaji"],
      ["BLR", "Bengaluru", "Bengaluru Airport"],
      ["MAA", "Chennai", "Chennai Airport"],
      ["HYD", "Hyderabad", "Hyderabad Rajiv Gandhi"],
      ["CCU", "Kolkata", "Kolkata Netaji Subhas Chandra Bose"],
    ],
    cities: [
      ["delhi", "Delhi"],
      ["mumbai", "Mumbai"],
      ["bengaluru", "Bengaluru"],
      ["hyderabad", "Hyderabad"],
      ["ahmedabad", "Ahmedabad"],
      ["chennai", "Chennai"],
      ["kolkata", "Kolkata"],
      ["pune", "Pune"],
      ["jaipur", "Jaipur"],
    ],
  },
  CN: {
    airports: [
      ["PEK", "Beijing", "Beijing Capital"],
      ["PKX", "Beijing", "Beijing Daxing"],
      ["PVG", "Shanghai", "Shanghai Pudong"],
      ["SHA", "Shanghai", "Shanghai Hongqiao"],
      ["CAN", "Guangzhou", "Guangzhou Baiyun"],
      ["SZX", "Shenzhen", "Shenzhen Bao'an"],
    ],
    cities: [
      ["beijing", "Beijing"],
      ["shanghai", "Shanghai"],
      ["guangzhou", "Guangzhou"],
      ["shenzhen", "Shenzhen"],
      ["chengdu", "Chengdu"],
      ["hangzhou", "Hangzhou"],
      ["xian", "Xi'an"],
    ],
  },
  JP: {
    airports: [
      ["HND", "Tokyo", "Tokyo Haneda"],
      ["NRT", "Tokyo", "Tokyo Narita"],
      ["KIX", "Osaka", "Osaka Kansai"],
      ["ITM", "Osaka", "Osaka Itami"],
      ["NGO", "Nagoya", "Nagoya Chubu Centrair"],
      ["FUK", "Fukuoka", "Fukuoka Airport"],
    ],
    cities: [
      ["tokyo", "Tokyo"],
      ["yokohama", "Yokohama"],
      ["osaka", "Osaka"],
      ["nagoya", "Nagoya"],
      ["sapporo", "Sapporo"],
      ["fukuoka", "Fukuoka"],
      ["kyoto", "Kyoto"],
    ],
  },
  KR: {
    airports: [
      ["ICN", "Seoul", "Seoul Incheon"],
      ["GMP", "Seoul", "Seoul Gimpo"],
      ["PUS", "Busan", "Busan Gimhae"],
    ],
    cities: [
      ["seoul", "Seoul"],
      ["busan", "Busan"],
      ["incheon", "Incheon"],
      ["daegu", "Daegu"],
      ["daejeon", "Daejeon"],
    ],
  },
  TH: {
    airports: [
      ["BKK", "Bangkok", "Bangkok Suvarnabhumi"],
      ["DMK", "Bangkok", "Bangkok Don Mueang"],
      ["HKT", "Phuket", "Phuket International"],
      ["CNX", "Chiang Mai", "Chiang Mai International"],
    ],
    cities: [
      ["bangkok", "Bangkok"],
      ["chiang-mai", "Chiang Mai"],
      ["pattaya", "Pattaya"],
      ["phuket", "Phuket"],
      ["khon-kaen", "Khon Kaen"],
    ],
  },
  VN: {
    airports: [
      ["SGN", "Ho Chi Minh City", "Tan Son Nhat International"],
      ["HAN", "Hanoi", "Noi Bai International"],
      ["DAD", "Da Nang", "Da Nang International"],
    ],
    cities: [
      ["ho-chi-minh-city", "Ho Chi Minh City"],
      ["hanoi", "Hanoi"],
      ["da-nang", "Da Nang"],
      ["hai-phong", "Hai Phong"],
      ["can-tho", "Can Tho"],
    ],
  },
  ID: {
    airports: [
      ["CGK", "Jakarta", "Jakarta Soekarno-Hatta"],
      ["DPS", "Denpasar", "Bali Ngurah Rai"],
      ["SUB", "Surabaya", "Surabaya Juanda"],
    ],
    cities: [
      ["jakarta", "Jakarta"],
      ["surabaya", "Surabaya"],
      ["bandung", "Bandung"],
      ["medan", "Medan"],
      ["denpasar", "Denpasar"],
    ],
  },
  MY: {
    airports: [
      ["KUL", "Kuala Lumpur", "Kuala Lumpur International"],
      ["PEN", "Penang", "Penang International"],
      ["BKI", "Kota Kinabalu", "Kota Kinabalu International"],
    ],
    cities: [
      ["kuala-lumpur", "Kuala Lumpur"],
      ["george-town", "George Town"],
      ["ipoh", "Ipoh"],
      ["johor-bahru", "Johor Bahru"],
      ["kota-kinabalu", "Kota Kinabalu"],
    ],
  },
  SG: {
    airports: [["SIN", "Singapore", "Singapore Changi"]],
    cities: [["singapore", "Singapore"]],
  },
  AU: {
    airports: [
      ["SYD", "Sydney", "Sydney Kingsford Smith"],
      ["MEL", "Melbourne", "Melbourne Airport"],
      ["BNE", "Brisbane", "Brisbane Airport"],
      ["PER", "Perth", "Perth Airport"],
    ],
    cities: [
      ["sydney", "Sydney"],
      ["melbourne", "Melbourne"],
      ["brisbane", "Brisbane"],
      ["perth", "Perth"],
      ["adelaide", "Adelaide"],
      ["gold-coast", "Gold Coast"],
    ],
  },
  NZ: {
    airports: [
      ["AKL", "Auckland", "Auckland Airport"],
      ["WLG", "Wellington", "Wellington Airport"],
      ["CHC", "Christchurch", "Christchurch Airport"],
    ],
    cities: [
      ["auckland", "Auckland"],
      ["wellington", "Wellington"],
      ["christchurch", "Christchurch"],
      ["hamilton", "Hamilton"],
    ],
  },
  CA: {
    airports: [
      ["YYZ", "Toronto", "Toronto Pearson"],
      ["YVR", "Vancouver", "Vancouver International"],
      ["YUL", "Montreal", "Montréal-Trudeau"],
      ["YYC", "Calgary", "Calgary International"],
    ],
    cities: [
      ["toronto", "Toronto"],
      ["montreal", "Montreal"],
      ["vancouver", "Vancouver"],
      ["calgary", "Calgary"],
      ["ottawa", "Ottawa"],
      ["edmonton", "Edmonton"],
    ],
  },
  MX: {
    airports: [
      ["MEX", "Mexico City", "Mexico City International"],
      ["CUN", "Cancun", "Cancún International"],
      ["GDL", "Guadalajara", "Guadalajara International"],
      ["MTY", "Monterrey", "Monterrey International"],
    ],
    cities: [
      ["mexico-city", "Mexico City"],
      ["guadalajara", "Guadalajara"],
      ["monterrey", "Monterrey"],
      ["puebla", "Puebla"],
      ["cancun", "Cancún"],
      ["tijuana", "Tijuana"],
    ],
  },
  BR: {
    airports: [
      ["GRU", "Sao Paulo", "São Paulo Guarulhos"],
      ["CGH", "Sao Paulo", "São Paulo Congonhas"],
      ["GIG", "Rio de Janeiro", "Rio de Janeiro Galeão"],
      ["BSB", "Brasilia", "Brasília International"],
    ],
    cities: [
      ["sao-paulo", "São Paulo"],
      ["rio-de-janeiro", "Rio de Janeiro"],
      ["brasilia", "Brasília"],
      ["salvador", "Salvador"],
      ["fortaleza", "Fortaleza"],
      ["belo-horizonte", "Belo Horizonte"],
    ],
  },
  AR: {
    airports: [
      ["EZE", "Buenos Aires", "Buenos Aires Ezeiza"],
      ["AEP", "Buenos Aires", "Buenos Aires Aeroparque"],
      ["COR", "Cordoba", "Córdoba Airport"],
    ],
    cities: [
      ["buenos-aires", "Buenos Aires"],
      ["cordoba", "Córdoba"],
      ["rosario", "Rosario"],
      ["mendoza", "Mendoza"],
    ],
  },
  ZA: {
    airports: [
      ["JNB", "Johannesburg", "Johannesburg OR Tambo"],
      ["CPT", "Cape Town", "Cape Town International"],
      ["DUR", "Durban", "Durban King Shaka"],
    ],
    cities: [
      ["johannesburg", "Johannesburg"],
      ["cape-town", "Cape Town"],
      ["durban", "Durban"],
      ["pretoria", "Pretoria"],
    ],
  },
  MA: {
    airports: [
      ["CMN", "Casablanca", "Casablanca Mohammed V"],
      ["RAK", "Marrakesh", "Marrakesh Menara"],
      ["TNG", "Tangier", "Tangier Ibn Battouta"],
    ],
    cities: [
      ["casablanca", "Casablanca"],
      ["rabat", "Rabat"],
      ["fes", "Fes"],
      ["marrakesh", "Marrakesh"],
      ["tangier", "Tangier"],
    ],
  },
  NG: {
    airports: [
      ["LOS", "Lagos", "Lagos Murtala Muhammed"],
      ["ABV", "Abuja", "Abuja Nnamdi Azikiwe"],
    ],
    cities: [
      ["lagos", "Lagos"],
      ["kano", "Kano"],
      ["ibadan", "Ibadan"],
      ["abuja", "Abuja"],
      ["port-harcourt", "Port Harcourt"],
    ],
  },
  KE: {
    airports: [
      ["NBO", "Nairobi", "Nairobi Jomo Kenyatta"],
      ["MBA", "Mombasa", "Mombasa Moi International"],
    ],
    cities: [
      ["nairobi", "Nairobi"],
      ["mombasa", "Mombasa"],
      ["kisumu", "Kisumu"],
      ["nakuru", "Nakuru"],
    ],
  },
  CY: {
    airports: [
      ["LCA", "Larnaca", "Larnaca International"],
      ["PFO", "Paphos", "Paphos International"],
    ],
    cities: [
      ["nicosia", "Nicosia"],
      ["limassol", "Limassol"],
      ["larnaca", "Larnaca"],
      ["paphos", "Paphos"],
    ],
  },
  MT: {
    airports: [["MLA", "Valletta", "Malta International"]],
    cities: [
      ["valletta", "Valletta"],
      ["sliema", "Sliema"],
      ["st-julians", "St. Julian's"],
    ],
  },
  IS: {
    airports: [["KEF", "Reykjavik", "Keflavík International"]],
    cities: [
      ["reykjavik", "Reykjavik"],
      ["kopavogur", "Kópavogur"],
      ["akureyri", "Akureyri"],
    ],
  },
  LU: {
    airports: [["LUX", "Luxembourg", "Luxembourg Airport"]],
    cities: [
      ["luxembourg", "Luxembourg"],
      ["esch-sur-alzette", "Esch-sur-Alzette"],
    ],
  },
  SK: {
    airports: [["BTS", "Bratislava", "Bratislava Airport"]],
    cities: [
      ["bratislava", "Bratislava"],
      ["kosice", "Košice"],
      ["presov", "Prešov"],
    ],
  },
  SI: {
    airports: [["LJU", "Ljubljana", "Ljubljana Jože Pučnik"]],
    cities: [
      ["ljubljana", "Ljubljana"],
      ["maribor", "Maribor"],
      ["celje", "Celje"],
    ],
  },
  LT: {
    airports: [["VNO", "Vilnius", "Vilnius Airport"]],
    cities: [
      ["vilnius", "Vilnius"],
      ["kaunas", "Kaunas"],
      ["klaipeda", "Klaipėda"],
    ],
  },
  LV: {
    airports: [["RIX", "Riga", "Riga International"]],
    cities: [
      ["riga", "Riga"],
      ["daugavpils", "Daugavpils"],
      ["liepaja", "Liepāja"],
    ],
  },
  EE: {
    airports: [["TLL", "Tallinn", "Tallinn Airport"]],
    cities: [
      ["tallinn", "Tallinn"],
      ["tartu", "Tartu"],
      ["narva", "Narva"],
    ],
  },
  MD: {
    airports: [["RMO", "Chisinau", "Chișinău International"]],
    cities: [
      ["chisinau", "Chișinău"],
      ["tiraspol", "Tiraspol"],
      ["balti", "Bălți"],
    ],
  },
  AL: {
    airports: [["TIA", "Tirana", "Tirana International"]],
    cities: [
      ["tirana", "Tirana"],
      ["durres", "Durrës"],
      ["vlore", "Vlorë"],
      ["shkoder", "Shkodër"],
    ],
  },
  MK: {
    airports: [["SKP", "Skopje", "Skopje International"]],
    cities: [
      ["skopje", "Skopje"],
      ["bitola", "Bitola"],
      ["ohrid", "Ohrid"],
    ],
  },
  BA: {
    airports: [
      ["SJJ", "Sarajevo", "Sarajevo International"],
      ["BNX", "Banja Luka", "Banja Luka International"],
    ],
    cities: [
      ["sarajevo", "Sarajevo"],
      ["banja-luka", "Banja Luka"],
      ["tuzla", "Tuzla"],
      ["mostar", "Mostar"],
    ],
  },
  ME: {
    airports: [
      ["TGD", "Podgorica", "Podgorica Airport"],
      ["TIV", "Tivat", "Tivat Airport"],
    ],
    cities: [
      ["podgorica", "Podgorica"],
      ["niksic", "Nikšić"],
      ["budva", "Budva"],
      ["kotor", "Kotor"],
    ],
  },
  XK: {
    airports: [["PRN", "Pristina", "Pristina International"]],
    cities: [
      ["pristina", "Pristina"],
      ["prizren", "Prizren"],
      ["peja", "Peja"],
    ],
  },
  BY: {
    airports: [["MSQ", "Minsk", "Minsk National"]],
    cities: [
      ["minsk", "Minsk"],
      ["gomel", "Gomel"],
      ["mogilev", "Mogilev"],
      ["vitebsk", "Vitebsk"],
    ],
  },
  JO: {
    airports: [["AMM", "Amman", "Amman Queen Alia"]],
    cities: [
      ["amman", "Amman"],
      ["zarqa", "Zarqa"],
      ["irbid", "Irbid"],
      ["aqaba", "Aqaba"],
    ],
  },
  LB: {
    airports: [["BEY", "Beirut", "Beirut Rafic Hariri"]],
    cities: [
      ["beirut", "Beirut"],
      ["tripoli", "Tripoli"],
      ["sidon", "Sidon"],
    ],
  },
  KW: {
    airports: [["KWI", "Kuwait City", "Kuwait International"]],
    cities: [
      ["kuwait-city", "Kuwait City"],
      ["hawalli", "Hawalli"],
      ["salmiya", "Salmiya"],
    ],
  },
  BH: {
    airports: [["BAH", "Manama", "Bahrain International"]],
    cities: [
      ["manama", "Manama"],
      ["riffa", "Riffa"],
      ["muharraq", "Muharraq"],
    ],
  },
  OM: {
    airports: [
      ["MCT", "Muscat", "Muscat International"],
      ["SLL", "Salalah", "Salalah Airport"],
    ],
    cities: [
      ["muscat", "Muscat"],
      ["salalah", "Salalah"],
      ["sohar", "Sohar"],
    ],
  },
  IQ: {
    airports: [
      ["BGW", "Baghdad", "Baghdad International"],
      ["EBL", "Erbil", "Erbil International"],
      ["BSR", "Basra", "Basra International"],
    ],
    cities: [
      ["baghdad", "Baghdad"],
      ["basra", "Basra"],
      ["mosul", "Mosul"],
      ["erbil", "Erbil"],
    ],
  },
  IR: {
    airports: [
      ["IKA", "Tehran", "Tehran Imam Khomeini"],
      ["THR", "Tehran", "Tehran Mehrabad"],
      ["SYZ", "Shiraz", "Shiraz International"],
      ["MHD", "Mashhad", "Mashhad International"],
    ],
    cities: [
      ["tehran", "Tehran"],
      ["mashhad", "Mashhad"],
      ["isfahan", "Isfahan"],
      ["karaj", "Karaj"],
      ["shiraz", "Shiraz"],
      ["tabriz", "Tabriz"],
    ],
  },
  PK: {
    airports: [
      ["ISB", "Islamabad", "Islamabad International"],
      ["KHI", "Karachi", "Karachi Jinnah"],
      ["LHE", "Lahore", "Lahore Allama Iqbal"],
    ],
    cities: [
      ["karachi", "Karachi"],
      ["lahore", "Lahore"],
      ["faisalabad", "Faisalabad"],
      ["rawalpindi", "Rawalpindi"],
      ["islamabad", "Islamabad"],
    ],
  },
  BD: {
    airports: [["DAC", "Dhaka", "Dhaka Hazrat Shahjalal"]],
    cities: [
      ["dhaka", "Dhaka"],
      ["chittagong", "Chittagong"],
      ["khulna", "Khulna"],
    ],
  },
  PH: {
    airports: [
      ["MNL", "Manila", "Manila Ninoy Aquino"],
      ["CEB", "Cebu", "Cebu Mactan"],
      ["DVO", "Davao", "Davao International"],
    ],
    cities: [
      ["manila", "Manila"],
      ["quezon-city", "Quezon City"],
      ["davao", "Davao"],
      ["cebu", "Cebu"],
    ],
  },
  TW: {
    airports: [
      ["TPE", "Taipei", "Taipei Taoyuan"],
      ["TSA", "Taipei", "Taipei Songshan"],
      ["KHH", "Kaohsiung", "Kaohsiung International"],
    ],
    cities: [
      ["taipei", "Taipei"],
      ["kaohsiung", "Kaohsiung"],
      ["taichung", "Taichung"],
      ["tainan", "Tainan"],
    ],
  },
  HK: {
    airports: [["HKG", "Hong Kong", "Hong Kong International"]],
    cities: [["hong-kong", "Hong Kong"]],
  },
  MO: {
    airports: [["MFM", "Macau", "Macau International"]],
    cities: [["macau", "Macau"]],
  },
  LK: {
    airports: [["CMB", "Colombo", "Colombo Bandaranaike"]],
    cities: [
      ["colombo", "Colombo"],
      ["kandy", "Kandy"],
      ["galle", "Galle"],
    ],
  },
  NP: {
    airports: [["KTM", "Kathmandu", "Kathmandu Tribhuvan"]],
    cities: [
      ["kathmandu", "Kathmandu"],
      ["pokhara", "Pokhara"],
      ["lalitpur", "Lalitpur"],
    ],
  },
  KH: {
    airports: [
      ["PNH", "Phnom Penh", "Phnom Penh International"],
      ["REP", "Siem Reap", "Siem Reap Angkor"],
    ],
    cities: [
      ["phnom-penh", "Phnom Penh"],
      ["siem-reap", "Siem Reap"],
      ["battambang", "Battambang"],
    ],
  },
  MM: {
    airports: [["RGN", "Yangon", "Yangon International"]],
    cities: [
      ["yangon", "Yangon"],
      ["mandalay", "Mandalay"],
      ["naypyidaw", "Naypyidaw"],
    ],
  },
  LA: {
    airports: [["VTE", "Vientiane", "Vientiane Wattay"]],
    cities: [
      ["vientiane", "Vientiane"],
      ["luang-prabang", "Luang Prabang"],
      ["pakse", "Pakse"],
    ],
  },
  MN: {
    airports: [["UBN", "Ulaanbaatar", "Ulaanbaatar Chinggis Khaan"]],
    cities: [
      ["ulaanbaatar", "Ulaanbaatar"],
      ["erdenet", "Erdenet"],
      ["darkhan", "Darkhan"],
    ],
  },
  CL: {
    airports: [["SCL", "Santiago", "Santiago Arturo Merino Benítez"]],
    cities: [
      ["santiago", "Santiago"],
      ["valparaiso", "Valparaíso"],
      ["concepcion", "Concepción"],
      ["antofagasta", "Antofagasta"],
    ],
  },
  CO: {
    airports: [
      ["BOG", "Bogota", "Bogotá El Dorado"],
      ["MDE", "Medellin", "Medellín José María Córdova"],
      ["CTG", "Cartagena", "Cartagena Rafael Núñez"],
    ],
    cities: [
      ["bogota", "Bogotá"],
      ["medellin", "Medellín"],
      ["cali", "Cali"],
      ["barranquilla", "Barranquilla"],
      ["cartagena", "Cartagena"],
    ],
  },
  PE: {
    airports: [["LIM", "Lima", "Lima Jorge Chávez"]],
    cities: [
      ["lima", "Lima"],
      ["arequipa", "Arequipa"],
      ["trujillo", "Trujillo"],
      ["cusco", "Cusco"],
    ],
  },
  EC: {
    airports: [
      ["UIO", "Quito", "Quito Mariscal Sucre"],
      ["GYE", "Guayaquil", "Guayaquil José Joaquín de Olmedo"],
    ],
    cities: [
      ["quito", "Quito"],
      ["guayaquil", "Guayaquil"],
      ["cuenca", "Cuenca"],
    ],
  },
  UY: {
    airports: [["MVD", "Montevideo", "Montevideo Carrasco"]],
    cities: [
      ["montevideo", "Montevideo"],
      ["salto", "Salto"],
      ["punta-del-este", "Punta del Este"],
    ],
  },
  PY: {
    airports: [["ASU", "Asuncion", "Asunción Silvio Pettirossi"]],
    cities: [
      ["asuncion", "Asunción"],
      ["ciudad-del-este", "Ciudad del Este"],
      ["encarnacion", "Encarnación"],
    ],
  },
  BO: {
    airports: [
      ["VVI", "Santa Cruz", "Santa Cruz Viru Viru"],
      ["LPB", "La Paz", "La Paz El Alto"],
    ],
    cities: [
      ["santa-cruz", "Santa Cruz"],
      ["el-alto", "El Alto"],
      ["la-paz", "La Paz"],
      ["cochabamba", "Cochabamba"],
    ],
  },
  VE: {
    airports: [["CCS", "Caracas", "Caracas Simón Bolívar"]],
    cities: [
      ["caracas", "Caracas"],
      ["maracaibo", "Maracaibo"],
      ["valencia", "Valencia"],
      ["barquisimeto", "Barquisimeto"],
    ],
  },
  PA: {
    airports: [["PTY", "Panama City", "Panama City Tocumen"]],
    cities: [
      ["panama-city", "Panama City"],
      ["san-miguelito", "San Miguelito"],
      ["colon", "Colón"],
    ],
  },
  CR: {
    airports: [["SJO", "San Jose", "San José Juan Santamaría"]],
    cities: [
      ["san-jose", "San José"],
      ["alajuela", "Alajuela"],
      ["cartago", "Cartago"],
    ],
  },
  DO: {
    airports: [
      ["SDQ", "Santo Domingo", "Santo Domingo Las Américas"],
      ["PUJ", "Punta Cana", "Punta Cana International"],
    ],
    cities: [
      ["santo-domingo", "Santo Domingo"],
      ["santiago", "Santiago"],
      ["punta-cana", "Punta Cana"],
    ],
  },
  CU: {
    airports: [["HAV", "Havana", "Havana José Martí"]],
    cities: [
      ["havana", "Havana"],
      ["santiago-de-cuba", "Santiago de Cuba"],
      ["camaguey", "Camagüey"],
    ],
  },
  JM: {
    airports: [
      ["KIN", "Kingston", "Kingston Norman Manley"],
      ["MBJ", "Montego Bay", "Montego Bay Sangster"],
    ],
    cities: [
      ["kingston", "Kingston"],
      ["montego-bay", "Montego Bay"],
      ["spanish-town", "Spanish Town"],
    ],
  },
  TN: {
    airports: [
      ["TUN", "Tunis", "Tunis Carthage"],
      ["DJE", "Djerba", "Djerba-Zarzis"],
    ],
    cities: [
      ["tunis", "Tunis"],
      ["sfax", "Sfax"],
      ["sousse", "Sousse"],
      ["kairouan", "Kairouan"],
    ],
  },
  DZ: {
    airports: [["ALG", "Algiers", "Algiers Houari Boumediene"]],
    cities: [
      ["algiers", "Algiers"],
      ["oran", "Oran"],
      ["constantine", "Constantine"],
    ],
  },
  GH: {
    airports: [["ACC", "Accra", "Accra Kotoka"]],
    cities: [
      ["accra", "Accra"],
      ["kumasi", "Kumasi"],
      ["tamale", "Tamale"],
    ],
  },
  ET: {
    airports: [["ADD", "Addis Ababa", "Addis Ababa Bole"]],
    cities: [
      ["addis-ababa", "Addis Ababa"],
      ["dire-dawa", "Dire Dawa"],
      ["mekelle", "Mekelle"],
    ],
  },
  TZ: {
    airports: [
      ["DAR", "Dar es Salaam", "Dar es Salaam Julius Nyerere"],
      ["JRO", "Kilimanjaro", "Kilimanjaro International"],
      ["ZNZ", "Zanzibar", "Zanzibar Abeid Amani Karume"],
    ],
    cities: [
      ["dar-es-salaam", "Dar es Salaam"],
      ["dodoma", "Dodoma"],
      ["mwanza", "Mwanza"],
      ["zanzibar", "Zanzibar"],
    ],
  },
  UG: {
    airports: [["EBB", "Kampala", "Entebbe International"]],
    cities: [
      ["kampala", "Kampala"],
      ["gulu", "Gulu"],
      ["mbarara", "Mbarara"],
    ],
  },
  SN: {
    airports: [["DSS", "Dakar", "Dakar Blaise Diagne"]],
    cities: [
      ["dakar", "Dakar"],
      ["touba", "Touba"],
      ["thies", "Thiès"],
    ],
  },
  CI: {
    airports: [["ABJ", "Abidjan", "Abidjan Félix-Houphouët-Boigny"]],
    cities: [
      ["abidjan", "Abidjan"],
      ["bouake", "Bouaké"],
      ["yamoussoukro", "Yamoussoukro"],
    ],
  },
  AO: {
    airports: [["LAD", "Luanda", "Luanda Quatro de Fevereiro"]],
    cities: [
      ["luanda", "Luanda"],
      ["huambo", "Huambo"],
      ["lobito", "Lobito"],
    ],
  },
  MZ: {
    airports: [["MPM", "Maputo", "Maputo International"]],
    cities: [
      ["maputo", "Maputo"],
      ["matola", "Matola"],
      ["beira", "Beira"],
    ],
  },
  CM: {
    airports: [
      ["DLA", "Douala", "Douala International"],
      ["NSI", "Yaounde", "Yaoundé Nsimalen"],
    ],
    cities: [
      ["douala", "Douala"],
      ["yaounde", "Yaoundé"],
      ["garoua", "Garoua"],
    ],
  },
  CD: {
    airports: [["FIH", "Kinshasa", "Kinshasa N'djili"]],
    cities: [
      ["kinshasa", "Kinshasa"],
      ["lubumbashi", "Lubumbashi"],
      ["mbuji-mayi", "Mbuji-Mayi"],
    ],
  },
  LY: {
    airports: [["TIP", "Tripoli", "Tripoli Mitiga"]],
    cities: [
      ["tripoli", "Tripoli"],
      ["benghazi", "Benghazi"],
      ["misrata", "Misrata"],
    ],
  },
  SD: {
    airports: [["KRT", "Khartoum", "Khartoum International"]],
    cities: [
      ["khartoum", "Khartoum"],
      ["omdurman", "Omdurman"],
      ["port-sudan", "Port Sudan"],
    ],
  },
  YE: {
    airports: [["SAH", "Sanaa", "Sana'a International"]],
    cities: [
      ["sanaa", "Sana'a"],
      ["aden", "Aden"],
      ["taiz", "Taiz"],
    ],
  },
  SY: {
    airports: [["DAM", "Damascus", "Damascus International"]],
    cities: [
      ["damascus", "Damascus"],
      ["aleppo", "Aleppo"],
      ["homs", "Homs"],
    ],
  },
  AF: {
    airports: [["KBL", "Kabul", "Kabul Hamid Karzai"]],
    cities: [
      ["kabul", "Kabul"],
      ["kandahar", "Kandahar"],
      ["herat", "Herat"],
    ],
  },
  KG: {
    airports: [["FRU", "Bishkek", "Bishkek Manas"]],
    cities: [
      ["bishkek", "Bishkek"],
      ["osh", "Osh"],
      ["jalal-abad", "Jalal-Abad"],
    ],
  },
  TJ: {
    airports: [["DYU", "Dushanbe", "Dushanbe International"]],
    cities: [
      ["dushanbe", "Dushanbe"],
      ["khujand", "Khujand"],
      ["bokhtar", "Bokhtar"],
    ],
  },
  TM: {
    airports: [["ASB", "Ashgabat", "Ashgabat International"]],
    cities: [
      ["ashgabat", "Ashgabat"],
      ["turkmenabat", "Turkmenabat"],
      ["dashoguz", "Daşoguz"],
    ],
  },
  PS: {
    airports: [],
    cities: [
      ["gaza", "Gaza"],
      ["ramallah", "Ramallah"],
      ["hebron", "Hebron"],
      ["nablus", "Nablus"],
    ],
  },
  AD: {
    airports: [],
    cities: [
      ["andorra-la-vella", "Andorra la Vella"],
      ["escaldes-engordany", "Escaldes-Engordany"],
    ],
  },
  MC: {
    airports: [],
    cities: [["monaco", "Monaco"]],
  },
  SM: {
    airports: [],
    cities: [["san-marino", "San Marino"]],
  },
  VA: {
    airports: [],
    cities: [["vatican-city", "Vatican City"]],
  },
  LI: {
    airports: [],
    cities: [
      ["vaduz", "Vaduz"],
      ["schaan", "Schaan"],
    ],
  },
};

/** Capitals / major fallbacks for countries not listed above. */
export const FALLBACK_PLACES: Record<string, CountryPlaceSeed> = {
  AG: { airports: [["ANU", "St. John's", "V.C. Bird International"]], cities: [["st-johns", "St. John's"]] },
  BS: { airports: [["NAS", "Nassau", "Lynden Pindling International"]], cities: [["nassau", "Nassau"], ["freeport", "Freeport"]] },
  BB: { airports: [["BGI", "Bridgetown", "Grantley Adams International"]], cities: [["bridgetown", "Bridgetown"]] },
  BZ: { airports: [["BZE", "Belize City", "Philip S. W. Goldson"]], cities: [["belize-city", "Belize City"], ["belmopan", "Belmopan"]] },
  GT: { airports: [["GUA", "Guatemala City", "La Aurora International"]], cities: [["guatemala-city", "Guatemala City"]] },
  HN: { airports: [["TGU", "Tegucigalpa", "Toncontín International"]], cities: [["tegucigalpa", "Tegucigalpa"], ["san-pedro-sula", "San Pedro Sula"]] },
  SV: { airports: [["SAL", "San Salvador", "El Salvador International"]], cities: [["san-salvador", "San Salvador"]] },
  NI: { airports: [["MGA", "Managua", "Augusto C. Sandino"]], cities: [["managua", "Managua"]] },
  HT: { airports: [["PAP", "Port-au-Prince", "Toussaint Louverture"]], cities: [["port-au-prince", "Port-au-Prince"]] },
  TT: { airports: [["POS", "Port of Spain", "Piarco International"]], cities: [["port-of-spain", "Port of Spain"]] },
  GY: { airports: [["GEO", "Georgetown", "Cheddi Jagan International"]], cities: [["georgetown", "Georgetown"]] },
  SR: { airports: [["PBM", "Paramaribo", "Johan Adolf Pengel"]], cities: [["paramaribo", "Paramaribo"]] },
  BT: { airports: [["PBH", "Thimphu", "Paro Airport"]], cities: [["thimphu", "Thimphu"]] },
  BN: { airports: [["BWN", "Bandar Seri Begawan", "Brunei International"]], cities: [["bandar-seri-begawan", "Bandar Seri Begawan"]] },
  MV: { airports: [["MLE", "Male", "Velana International"]], cities: [["male", "Malé"]] },
  KP: { airports: [["FNJ", "Pyongyang", "Pyongyang International"]], cities: [["pyongyang", "Pyongyang"]] },
  TL: { airports: [["DIL", "Dili", "Presidente Nicolau Lobato"]], cities: [["dili", "Dili"]] },
  FJ: { airports: [["NAN", "Nadi", "Nadi International"]], cities: [["suva", "Suva"], ["nadi", "Nadi"]] },
  PG: { airports: [["POM", "Port Moresby", "Jacksons International"]], cities: [["port-moresby", "Port Moresby"]] },
  WS: { airports: [["APW", "Apia", "Faleolo International"]], cities: [["apia", "Apia"]] },
  SB: { airports: [["HIR", "Honiara", "Honiara International"]], cities: [["honiara", "Honiara"]] },
  TO: { airports: [["TBU", "Nuku'alofa", "Fuaʻamotu International"]], cities: [["nukualofa", "Nuku'alofa"]] },
  VU: { airports: [["VLI", "Port Vila", "Bauerfield International"]], cities: [["port-vila", "Port Vila"]] },
  BJ: { airports: [["COO", "Cotonou", "Cadjehoun Airport"]], cities: [["cotonou", "Cotonou"], ["porto-novo", "Porto-Novo"]] },
  BW: { airports: [["GBE", "Gaborone", "Sir Seretse Khama"]], cities: [["gaborone", "Gaborone"]] },
  BF: { airports: [["OUA", "Ouagadougou", "Ouagadougou Airport"]], cities: [["ouagadougou", "Ouagadougou"]] },
  BI: { airports: [["BJM", "Bujumbura", "Bujumbura International"]], cities: [["bujumbura", "Bujumbura"], ["gitega", "Gitega"]] },
  CV: { airports: [["RAI", "Praia", "Nelson Mandela International"]], cities: [["praia", "Praia"]] },
  CF: { airports: [["BGF", "Bangui", "Bangui M'Poko"]], cities: [["bangui", "Bangui"]] },
  TD: { airports: [["NDJ", "N'Djamena", "N'Djamena International"]], cities: [["ndjamena", "N'Djamena"]] },
  KM: { airports: [["HAH", "Moroni", "Prince Said Ibrahim"]], cities: [["moroni", "Moroni"]] },
  CG: { airports: [["BZV", "Brazzaville", "Maya-Maya Airport"]], cities: [["brazzaville", "Brazzaville"], ["pointe-noire", "Pointe-Noire"]] },
  DJ: { airports: [["JIB", "Djibouti", "Djibouti-Ambouli"]], cities: [["djibouti", "Djibouti"]] },
  GQ: { airports: [["SSG", "Malabo", "Malabo International"]], cities: [["malabo", "Malabo"]] },
  ER: { airports: [["ASM", "Asmara", "Asmara International"]], cities: [["asmara", "Asmara"]] },
  SZ: { airports: [["SHO", "Mbabane", "King Mswati III International"]], cities: [["mbabane", "Mbabane"], ["manzini", "Manzini"]] },
  GA: { airports: [["LBV", "Libreville", "Libreville Leon M'ba"]], cities: [["libreville", "Libreville"]] },
  GM: { airports: [["BJL", "Banjul", "Banjul International"]], cities: [["banjul", "Banjul"]] },
  GN: { airports: [["CKY", "Conakry", "Conakry International"]], cities: [["conakry", "Conakry"]] },
  GW: { airports: [["OXB", "Bissau", "Osvaldo Vieira International"]], cities: [["bissau", "Bissau"]] },
  LS: { airports: [["MSU", "Maseru", "Moshoeshoe I International"]], cities: [["maseru", "Maseru"]] },
  LR: { airports: [["ROB", "Monrovia", "Roberts International"]], cities: [["monrovia", "Monrovia"]] },
  MG: { airports: [["TNR", "Antananarivo", "Ivato International"]], cities: [["antananarivo", "Antananarivo"]] },
  MW: { airports: [["LLW", "Lilongwe", "Lilongwe International"]], cities: [["lilongwe", "Lilongwe"], ["blantyre", "Blantyre"]] },
  ML: { airports: [["BKO", "Bamako", "Bamako-Sénou"]], cities: [["bamako", "Bamako"]] },
  MR: { airports: [["NKC", "Nouakchott", "Nouakchott-Oumtounsy"]], cities: [["nouakchott", "Nouakchott"]] },
  MU: { airports: [["MRU", "Port Louis", "Sir Seewoosagur Ramgoolam"]], cities: [["port-louis", "Port Louis"]] },
  NA: { airports: [["WDH", "Windhoek", "Hosea Kutako International"]], cities: [["windhoek", "Windhoek"]] },
  NE: { airports: [["NIM", "Niamey", "Diori Hamani International"]], cities: [["niamey", "Niamey"]] },
  RW: { airports: [["KGL", "Kigali", "Kigali International"]], cities: [["kigali", "Kigali"]] },
  ST: { airports: [["TMS", "Sao Tome", "São Tomé International"]], cities: [["sao-tome", "São Tomé"]] },
  SC: { airports: [["SEZ", "Victoria", "Seychelles International"]], cities: [["victoria", "Victoria"]] },
  SL: { airports: [["FNA", "Freetown", "Freetown Lungi"]], cities: [["freetown", "Freetown"]] },
  SO: { airports: [["MGQ", "Mogadishu", "Aden Adde International"]], cities: [["mogadishu", "Mogadishu"]] },
  SS: { airports: [["JUB", "Juba", "Juba International"]], cities: [["juba", "Juba"]] },
  TG: { airports: [["LFW", "Lome", "Lomé-Tokoin"]], cities: [["lome", "Lomé"]] },
  ZM: { airports: [["LUN", "Lusaka", "Kenneth Kaunda International"]], cities: [["lusaka", "Lusaka"]] },
  ZW: { airports: [["HRE", "Harare", "Robert Gabriel Mugabe"]], cities: [["harare", "Harare"], ["bulawayo", "Bulawayo"]] },
  LC: { airports: [["UVF", "Castries", "Hewanorra International"]], cities: [["castries", "Castries"]] },
  VC: { airports: [["SVD", "Kingstown", "Argyle International"]], cities: [["kingstown", "Kingstown"]] },
  GD: { airports: [["GND", "St. George's", "Maurice Bishop International"]], cities: [["st-georges", "St. George's"]] },
  KN: { airports: [["SKB", "Basseterre", "Robert L. Bradshaw"]], cities: [["basseterre", "Basseterre"]] },
  DM: { airports: [["DOM", "Roseau", "Douglas-Charles Airport"]], cities: [["roseau", "Roseau"]] },
};
