import type { Locale } from "@/lib/i18n/config";
import { cityDisplayName } from "@/lib/i18n/place-label";

export type LocationFaq = { question: string; answer: string };
type Benefit = { strong: string; text: string };

export type LocationSectionCopy = {
  benefitsTitle: string;
  benefits: Benefit[];
  carsTitle: string;
  perDay: string;
  notesTitle: string;
  airportNotes: string[];
  cityNotes: string[];
  routesTitle: string;
  routeLine: (km: string, time: string) => string;
  sedan: string;
  either: string;
  faqTitle: string;
  airportFaqs: LocationFaq[];
  cityFaqs: LocationFaq[];
};

function section(
  partial: Omit<LocationSectionCopy, "routeLine" | "sedan" | "either"> & {
    routeLine: LocationSectionCopy["routeLine"];
    sedan: string;
    either: string;
  },
): LocationSectionCopy {
  return partial;
}

const COPY: Record<Locale, LocationSectionCopy> = {
  en: section({
    benefitsTitle: "What is included",
    benefits: [
      { strong: "Local partners", text: "let you compare cars that are actually offered at this place." },
      { strong: "The price", text: "includes the rental days and the extras you choose." },
      { strong: "TPL insurance", text: "is included. The deposit and the amount due at pickup are shown before you pay." },
    ],
    carsTitle: "Cars at this location",
    perDay: "/ day",
    notesTitle: "Pickup and driving",
    airportNotes: [
      "The car is handed over at the airport when you land. The partner confirms the meeting point after booking.",
      "A sedan is enough for city roads and the airport transfer. Choose an SUV for mountain and unpaved roads.",
      "Bring your driving licence and passport. The payment card and the deposit are confirmed on the booking page.",
    ],
    cityNotes: [
      "You collect the car in the city, or at the airport when that partner offers delivery.",
      "A sedan suits city driving. An SUV is the better choice for mountain roads and rough surfaces.",
      "Bring your driving licence and passport. Insurance and the deposit are shown before you confirm.",
    ],
    routesTitle: "Nearby drives",
    routeLine: (km, time) => `About ${km} km, about ${time}.`,
    sedan: "A sedan is enough.",
    either: "A sedan or an SUV both work.",
    faqTitle: "Questions",
    airportFaqs: [
      {
        question: "Where do I meet the car at the airport?",
        answer:
          "The partner meets you at the airport after you land and confirms the meeting point in the booking. You do not need to go into the city first.",
      },
      {
        question: "Can I collect the car in the city instead of the airport?",
        answer:
          "Yes, when the partner offers that place. Choose the airport or the city in the search and the price updates for that pickup.",
      },
      {
        question: "What documents, insurance and deposit do I need?",
        answer:
          "Bring a driving licence and passport. TPL insurance is included. Any deposit and the amount due at pickup are shown on the car before you book.",
      },
      {
        question: "Can I take the car on a longer road trip?",
        answer:
          "Yes. Check the mileage and the countries the partner allows. A sedan fits main roads. Use an SUV where the route leaves paved roads.",
      },
    ],
    cityFaqs: [
      {
        question: "Is pickup in the city or at the airport?",
        answer:
          "Search shows the places that partner actually serves. Pick the city or the airport and the cars and delivery price follow that choice.",
      },
      {
        question: "What should I bring?",
        answer:
          "A driving licence and passport. The deposit, insurance and what you pay at pickup are listed on the car page before you confirm.",
      },
      {
        question: "Which car is better for a road trip?",
        answer:
          "A sedan is comfortable on main roads and in town. Choose an SUV for mountain roads and unpaved sections.",
      },
      {
        question: "Can I change the return place?",
        answer:
          "Yes, if the partner delivers to that place. Set the return in the search and any fee is included in the total.",
      },
    ],
  }),
  ka: section({
    benefitsTitle: "რა შედის",
    benefits: [
      { strong: "ადგილობრივი პარტნიორები", text: "გაძლევთ საშუალებას შეადაროთ მანქანები, რომლებიც ამ ადგილზე ნამდვილად არის." },
      { strong: "ფასი", text: "მოიცავს ქირის დღეებს და იმ დამატებებს, რომლებსაც თავად აირჩევთ." },
      { strong: "TPL დაზღვევა", text: "შედის. დეპოზიტი და აღებისას გადასახდელი თანხა გადახდამდე ჩანს." },
    ],
    carsTitle: "მანქანები ამ ლოკაციაზე",
    perDay: "/ დღე",
    notesTitle: "აღება და გზა",
    airportNotes: [
      "მანქანას აეროპორტში გიბარებენ ჩამოსვლისას. შეხვედრის წერტილს პარტნიორი ჯავშნის შემდეგ ადასტურებს.",
      "სედანი საკმარისია ქალაქისა და აეროპორტის გზისთვის. მთასა და გრუნტის გზაზე აირჩიეთ ჯიპი.",
      "თან იქონიეთ მართვის მოწმობა და პასპორტი. ბარათი და დეპოზიტი ჯავშნის გვერდზე ჩანს.",
    ],
    cityNotes: [
      "მანქანას იღებთ ქალაქში, ან აეროპორტში, თუ პარტნიორი იქ მიწოდებას სთავაზობს.",
      "სედანი ქალაქში მოსახერხებელია. მთის და გრუნტის გზისთვის უკეთესია ჯიპი.",
      "თან იქონიეთ მართვის მოწმობა და პასპორტი. დაზღვევა და დეპოზიტი დადასტურებამდე ჩანს.",
    ],
    routesTitle: "ახლომდებარე გზები",
    routeLine: (km, time) => `დაახლოებით ${km} კმ, დაახლოებით ${time}.`,
    sedan: "სედანი საკმარისია.",
    either: "სედანიც და ჯიპიც გამოდგება.",
    faqTitle: "კითხვები",
    airportFaqs: [
      {
        question: "სად გადმომცემენ მანქანას აეროპორტში?",
        answer:
          "პარტნიორი გხვდებათ აეროპორტში ჩამოსვლის შემდეგ და შეხვედრის წერტილს ჯავშანში ადასტურებს. ჯერ ქალაქში გადასვლა საჭირო არ არის.",
      },
      {
        question: "შემიძლია მანქანა ქალაქში ავიღო აეროპორტის ნაცვლად?",
        answer:
          "დიახ, თუ პარტნიორი ამ ადგილს ემსახურება. ძიებაში აირჩიეთ აეროპორტი ან ქალაქი და ფასი ამ აღების ადგილზე გადაითვლება.",
      },
      {
        question: "რა დოკუმენტი, დაზღვევა და დეპოზიტი მჭირდება?",
        answer:
          "თან იქონიეთ მართვის მოწმობა და პასპორტი. TPL დაზღვევა შედის. დეპოზიტი და აღებისას გადასახდელი თანხა ჯავშნამდე ჩანს.",
      },
      {
        question: "შემიძლია მანქანა გრძელ გზაზე წავიყვანო?",
        answer:
          "დიახ. შეამოწმეთ გარბენი და ის ქვეყნები, რომლებზეც პარტნიორი ნებას რთავს. მთავარ გზაზე სედანი გამოდგება. გრუნტის გზაზე აირჩიეთ ჯიპი.",
      },
    ],
    cityFaqs: [
      {
        question: "აღება ქალაქშია თუ აეროპორტში?",
        answer:
          "ძიება აჩვენებს იმ ადგილებს, რომლებსაც პარტნიორი ნამდვილად ემსახურება. აირჩიეთ ქალაქი ან აეროპორტი და მანქანები და მიწოდების ფასი ამ არჩევანს მიჰყვება.",
      },
      {
        question: "რა უნდა მქონდეს თან?",
        answer: "მართვის მოწმობა და პასპორტი. დეპოზიტი, დაზღვევა და აღებისას გადასახდელი თანხა დადასტურებამდე ჩანს.",
      },
      {
        question: "რომელი მანქანა სჯობს გზისთვის?",
        answer: "სედანი მოსახერხებელია მთავარ გზასა და ქალაქში. მთისა და გრუნტის გზისთვის აირჩიეთ ჯიპი.",
      },
      {
        question: "შემიძლია დაბრუნების ადგილი შევცვალო?",
        answer: "დიახ, თუ პარტნიორი იმ ადგილას აწვდის. დაბრუნება ძიებაში მიუთითეთ და საკომისიო, თუ არის, ჯამში შედის.",
      },
    ],
  }),
  ru: section({
    benefitsTitle: "Что входит",
    benefits: [
      { strong: "Местные партнёры", text: "дают сравнить автомобили, которые реально предлагают в этом месте." },
      { strong: "Цена", text: "включает дни аренды и те опции, которые вы сами выберете." },
      { strong: "Страховка TPL", text: "включена. Залог и сумма при получении видны до оплаты." },
    ],
    carsTitle: "Авто в этой локации",
    perDay: "/ сутки",
    notesTitle: "Получение и дорога",
    airportNotes: [
      "Автомобиль выдают в аэропорту после прилёта. Точку встречи партнёр подтверждает после брони.",
      "Седана достаточно для города и трансфера. Для гор и грунтовых дорог лучше внедорожник.",
      "Возьмите права и паспорт. Карта и залог указаны на странице брони.",
    ],
    cityNotes: [
      "Автомобиль забираете в городе или в аэропорту, если партнёр туда подаёт.",
      "Седан удобен в городе. Для горных и грунтовых дорог лучше внедорожник.",
      "Возьмите права и паспорт. Страховка и залог видны до подтверждения.",
    ],
    routesTitle: "Поездки рядом",
    routeLine: (km, time) => `Около ${km} км, около ${time}.`,
    sedan: "Седана достаточно.",
    either: "Подойдут и седан, и внедорожник.",
    faqTitle: "Вопросы",
    airportFaqs: [
      {
        question: "Где забрать автомобиль в аэропорту?",
        answer:
          "Партнёр встречает вас в аэропорту после прилёта и подтверждает точку встречи в брони. Сначала ехать в город не нужно.",
      },
      {
        question: "Можно забрать авто в городе, а не в аэропорту?",
        answer:
          "Да, если партнёр обслуживает это место. Выберите аэропорт или город в поиске — цена пересчитается для этой точки.",
      },
      {
        question: "Какие документы, страховка и залог нужны?",
        answer:
          "Нужны права и паспорт. Страховка TPL включена. Залог и сумма при получении указаны до брони.",
      },
      {
        question: "Можно уехать на автомобиле в дальнюю поездку?",
        answer:
          "Да. Проверьте пробег и страны, которые разрешает партнёр. На основных дорогах хватит седана. Вне асфальта лучше внедорожник.",
      },
    ],
    cityFaqs: [
      {
        question: "Получение в городе или в аэропорту?",
        answer:
          "Поиск показывает места, которые партнёр реально обслуживает. Выберите город или аэропорт — список авто и цена подачи зависят от этого.",
      },
      {
        question: "Что взять с собой?",
        answer: "Права и паспорт. Залог, страховка и сумма при получении видны до подтверждения.",
      },
      {
        question: "Какое авто лучше для поездки?",
        answer: "Седан удобен на основных дорогах и в городе. Для гор и грунта выбирайте внедорожник.",
      },
      {
        question: "Можно сменить место возврата?",
        answer: "Да, если партнёр подаёт туда. Укажите возврат в поиске — сбор, если он есть, войдёт в итог.",
      },
    ],
  }),
  de: section({
    benefitsTitle: "Das ist enthalten",
    benefits: [
      { strong: "Lokale Partner", text: "zeigen Autos, die an diesem Ort wirklich angeboten werden." },
      { strong: "Der Preis", text: "enthält die Miettage und die Extras, die Sie wählen." },
      { strong: "TPL-Versicherung", text: "ist enthalten. Kaution und Restbetrag sehen Sie vor der Zahlung." },
    ],
    carsTitle: "Autos an diesem Ort",
    perDay: "/ Tag",
    notesTitle: "Übergabe und Fahrt",
    airportNotes: [
      "Das Auto wird am Flughafen nach der Landung übergeben. Der Treffpunkt steht nach der Buchung fest.",
      "Eine Limousine reicht für die Stadt und den Transfer. Für Berge und Schotter ist ein SUV besser.",
      "Führerschein und Reisepass mitbringen. Karte und Kaution stehen auf der Buchungsseite.",
    ],
    cityNotes: [
      "Sie holen das Auto in der Stadt ab, oder am Flughafen, wenn der Partner dorthin liefert.",
      "Eine Limousine passt zur Stadt. Für Berge und schlechte Wege ist ein SUV besser.",
      "Führerschein und Reisepass mitbringen. Versicherung und Kaution sehen Sie vor der Bestätigung.",
    ],
    routesTitle: "Fahrten in der Nähe",
    routeLine: (km, time) => `Etwa ${km} km, etwa ${time}.`,
    sedan: "Eine Limousine reicht.",
    either: "Limousine oder SUV passen beide.",
    faqTitle: "Fragen",
    airportFaqs: [
      { question: "Wo treffe ich das Auto am Flughafen?", answer: "Der Partner trifft Sie nach der Landung am Flughafen und bestätigt den Treffpunkt in der Buchung. Zuerst in die Stadt zu fahren ist nicht nötig." },
      { question: "Kann ich das Auto in der Stadt statt am Flughafen holen?", answer: "Ja, wenn der Partner diesen Ort anbietet. Wählen Sie Flughafen oder Stadt in der Suche, der Preis gilt dann für diese Abholung." },
      { question: "Welche Dokumente, Versicherung und Kaution brauche ich?", answer: "Führerschein und Reisepass. Die TPL-Versicherung ist enthalten. Kaution und Restbetrag stehen vor der Buchung am Auto." },
      { question: "Kann ich eine längere Reise machen?", answer: "Ja. Prüfen Sie Kilometer und erlaubte Länder. Auf Hauptstraßen reicht eine Limousine. Abseits der Asphaltstraße ist ein SUV besser." },
    ],
    cityFaqs: [
      { question: "Hole ich das Auto in der Stadt oder am Flughafen?", answer: "Die Suche zeigt Orte, die der Partner wirklich bedient. Stadt oder Flughafen bestimmen die Autos und den Lieferpreis." },
      { question: "Was muss ich mitbringen?", answer: "Führerschein und Reisepass. Kaution, Versicherung und der Betrag bei der Abholung stehen vor der Bestätigung." },
      { question: "Welches Auto passt zur Reise?", answer: "Eine Limousine ist auf Hauptstraßen und in der Stadt angenehm. Für Berge und Schotter wählen Sie einen SUV." },
      { question: "Kann ich den Rückgabeort ändern?", answer: "Ja, wenn der Partner dorthin liefert. Setzen Sie die Rückgabe in der Suche. Eine Gebühr, falls es eine gibt, steht in der Summe." },
    ],
  }),
  es: section({
    benefitsTitle: "Qué incluye",
    benefits: [
      { strong: "Socios locales", text: "permiten comparar coches que sí se ofrecen en este lugar." },
      { strong: "El precio", text: "incluye los días de alquiler y los extras que elija." },
      { strong: "El seguro TPL", text: "está incluido. La fianza y lo que se paga al recoger se ven antes de pagar." },
    ],
    carsTitle: "Coches en este lugar",
    perDay: "/ día",
    notesTitle: "Recogida y ruta",
    airportNotes: [
      "El coche se entrega en el aeropuerto al aterrizar. El punto de encuentro se confirma tras la reserva.",
      "Un sedán basta para la ciudad y el traslado. Para montaña y caminos de tierra conviene un SUV.",
      "Lleve el permiso de conducir y el pasaporte. La tarjeta y la fianza figuran en la reserva.",
    ],
    cityNotes: [
      "Recoge el coche en la ciudad, o en el aeropuerto si ese socio ofrece la entrega.",
      "Un sedán va bien en ciudad. Un SUV es mejor en montaña y en firme irregular.",
      "Lleve el permiso y el pasaporte. El seguro y la fianza se ven antes de confirmar.",
    ],
    routesTitle: "Rutas cercanas",
    routeLine: (km, time) => `Unos ${km} km, unos ${time}.`,
    sedan: "Un sedán es suficiente.",
    either: "Sirven un sedán o un SUV.",
    faqTitle: "Preguntas",
    airportFaqs: [
      { question: "¿Dónde recojo el coche en el aeropuerto?", answer: "El socio le espera en el aeropuerto al aterrizar y confirma el punto en la reserva. No hace falta ir antes a la ciudad." },
      { question: "¿Puedo recoger el coche en la ciudad y no en el aeropuerto?", answer: "Sí, si el socio ofrece ese lugar. Elija aeropuerto o ciudad en la búsqueda y el precio se calcula para esa recogida." },
      { question: "¿Qué documentos, seguro y fianza necesito?", answer: "Permiso de conducir y pasaporte. El seguro TPL está incluido. La fianza y lo pendiente al recoger se ven antes de reservar." },
      { question: "¿Puedo hacer un viaje más largo?", answer: "Sí. Revise el kilometraje y los países permitidos. En carretera principal basta un sedán. Fuera del asfalto conviene un SUV." },
    ],
    cityFaqs: [
      { question: "¿La recogida es en la ciudad o en el aeropuerto?", answer: "La búsqueda muestra los lugares que el socio atiende. Ciudad o aeropuerto cambian los coches y el precio de entrega." },
      { question: "¿Qué debo llevar?", answer: "Permiso y pasaporte. La fianza, el seguro y lo que se paga al recoger se ven antes de confirmar." },
      { question: "¿Qué coche conviene para la ruta?", answer: "Un sedán va bien en carretera y en la ciudad. Para montaña y tierra elija un SUV." },
      { question: "¿Puedo cambiar el lugar de devolución?", answer: "Sí, si el socio entrega allí. Indique la devolución en la búsqueda y la tasa, si la hay, entra en el total." },
    ],
  }),
  fr: section({
    benefitsTitle: "Ce qui est inclus",
    benefits: [
      { strong: "Des partenaires locaux", text: "permettent de comparer les voitures réellement proposées ici." },
      { strong: "Le prix", text: "comprend les jours de location et les options que vous choisissez." },
      { strong: "L’assurance TPL", text: "est incluse. La caution et le solde à la prise en charge sont indiqués avant le paiement." },
    ],
    carsTitle: "Voitures à cet endroit",
    perDay: "/ jour",
    notesTitle: "Prise en charge et route",
    airportNotes: [
      "La voiture est remise à l’aéroport à l’arrivée. Le point de rendez-vous est confirmé après la réservation.",
      "Une berline suffit en ville et pour le transfert. En montagne et sur piste, un SUV est préférable.",
      "Apportez le permis et le passeport. La carte et la caution figurent sur la réservation.",
    ],
    cityNotes: [
      "Vous prenez la voiture en ville, ou à l’aéroport si le partenaire livre là.",
      "Une berline convient en ville. Un SUV est préférable en montagne et sur route difficile.",
      "Apportez le permis et le passeport. Assurance et caution sont visibles avant confirmation.",
    ],
    routesTitle: "Trajets à proximité",
    routeLine: (km, time) => `Environ ${km} km, environ ${time}.`,
    sedan: "Une berline suffit.",
    either: "Berline ou SUV conviennent.",
    faqTitle: "Questions",
    airportFaqs: [
      { question: "Où récupérer la voiture à l’aéroport ?", answer: "Le partenaire vous attend à l’aéroport après l’atterrissage et confirme le point dans la réservation. Inutile de passer d’abord en ville." },
      { question: "Puis-je prendre la voiture en ville plutôt qu’à l’aéroport ?", answer: "Oui, si le partenaire dessert ce lieu. Choisissez l’aéroport ou la ville dans la recherche : le prix suit ce retrait." },
      { question: "Quels documents, quelle assurance et quelle caution ?", answer: "Permis et passeport. L’assurance TPL est incluse. La caution et le solde à la prise en charge sont indiqués avant la réservation." },
      { question: "Puis-je partir pour un plus long trajet ?", answer: "Oui. Vérifiez le kilométrage et les pays autorisés. Sur route principale, une berline suffit. Hors bitume, prenez un SUV." },
    ],
    cityFaqs: [
      { question: "Le retrait est-il en ville ou à l’aéroport ?", answer: "La recherche montre les lieux réellement desservis. Ville ou aéroport changent les voitures et le prix de livraison." },
      { question: "Que dois-je apporter ?", answer: "Permis et passeport. Caution, assurance et somme à la prise en charge sont visibles avant confirmation." },
      { question: "Quelle voiture pour la route ?", answer: "Une berline est agréable sur les grands axes et en ville. En montagne et sur piste, choisissez un SUV." },
      { question: "Puis-je changer le lieu de retour ?", answer: "Oui, si le partenaire livre là. Indiquez le retour dans la recherche. Un frais éventuel entre dans le total." },
    ],
  }),
  it: section({
    benefitsTitle: "Cosa è incluso",
    benefits: [
      { strong: "Partner locali", text: "permettono di confrontare le auto davvero offerte in questo luogo." },
      { strong: "Il prezzo", text: "include i giorni di noleggio e gli extra che scegli." },
      { strong: "L’assicurazione TPL", text: "è inclusa. Deposito e importo al ritiro si vedono prima del pagamento." },
    ],
    carsTitle: "Auto in questa località",
    perDay: "/ giorno",
    notesTitle: "Ritiro e strada",
    airportNotes: [
      "L’auto si ritira in aeroporto all’arrivo. Il punto d’incontro è confermato dopo la prenotazione.",
      "Una berlina basta in città e per il transfer. In montagna e sullo sterrato conviene un SUV.",
      "Porta patente e passaporto. Carta e deposito sono indicati nella prenotazione.",
    ],
    cityNotes: [
      "Ritiri l’auto in città, oppure in aeroporto se il partner consegna lì.",
      "Una berlina va bene in città. Un SUV è meglio in montagna e su fondi irregolari.",
      "Porta patente e passaporto. Assicurazione e deposito si vedono prima della conferma.",
    ],
    routesTitle: "Percorsi vicini",
    routeLine: (km, time) => `Circa ${km} km, circa ${time}.`,
    sedan: "Una berlina è sufficiente.",
    either: "Vanno bene berlina o SUV.",
    faqTitle: "Domande",
    airportFaqs: [
      { question: "Dove ritiro l’auto in aeroporto?", answer: "Il partner ti aspetta in aeroporto dopo l’atterraggio e conferma il punto nella prenotazione. Non serve andare prima in città." },
      { question: "Posso ritirare l’auto in città invece che in aeroporto?", answer: "Sì, se il partner serve quel luogo. Scegli aeroporto o città nella ricerca e il prezzo segue quel ritiro." },
      { question: "Quali documenti, assicurazione e deposito servono?", answer: "Patente e passaporto. L’assicurazione TPL è inclusa. Deposito e importo al ritiro sono indicati prima della prenotazione." },
      { question: "Posso fare un viaggio più lungo?", answer: "Sì. Controlla chilometraggio e paesi consentiti. Sulle strade principali basta una berlina. Fuori dall’asfalto meglio un SUV." },
    ],
    cityFaqs: [
      { question: "Il ritiro è in città o in aeroporto?", answer: "La ricerca mostra i luoghi che il partner serve davvero. Città o aeroporto cambiano le auto e il prezzo di consegna." },
      { question: "Cosa devo portare?", answer: "Patente e passaporto. Deposito, assicurazione e importo al ritiro si vedono prima della conferma." },
      { question: "Quale auto è meglio per il viaggio?", answer: "Una berlina è comoda sulle strade principali e in città. Per montagna e sterrato scegli un SUV." },
      { question: "Posso cambiare il luogo di riconsegna?", answer: "Sì, se il partner consegna lì. Imposta la riconsegna nella ricerca: un eventuale costo entra nel totale." },
    ],
  }),
  nl: section({
    benefitsTitle: "Wat is inbegrepen",
    benefits: [
      { strong: "Lokale partners", text: "laten u auto’s vergelijken die op deze plek echt worden aangeboden." },
      { strong: "De prijs", text: "bevat de huurdagen en de extra’s die u kiest." },
      { strong: "TPL-verzekering", text: "is inbegrepen. Borg en het bedrag bij ophalen ziet u vóór betaling." },
    ],
    carsTitle: "Auto’s op deze locatie",
    perDay: "/ dag",
    notesTitle: "Ophalen en rijden",
    airportNotes: [
      "De auto wordt op de luchthaven afgegeven na aankomst. Het trefpunt staat vast na de boeking.",
      "Een sedan volstaat in de stad en voor de transfer. Kies een SUV voor bergen en onverharde wegen.",
      "Neem rijbewijs en paspoort mee. Kaart en borg staan op de boekingspagina.",
    ],
    cityNotes: [
      "U haalt de auto in de stad op, of op de luchthaven als die partner daar levert.",
      "Een sedan past in de stad. Een SUV is beter in de bergen en op slecht wegdek.",
      "Neem rijbewijs en paspoort mee. Verzekering en borg ziet u vóór bevestiging.",
    ],
    routesTitle: "Ritten in de buurt",
    routeLine: (km, time) => `Ongeveer ${km} km, ongeveer ${time}.`,
    sedan: "Een sedan is genoeg.",
    either: "Een sedan of een SUV kan allebei.",
    faqTitle: "Vragen",
    airportFaqs: [
      { question: "Waar haal ik de auto op de luchthaven op?", answer: "De partner ontmoet u na de landing op de luchthaven en bevestigt het punt in de boeking. Eerst naar de stad is niet nodig." },
      { question: "Kan ik de auto in de stad ophalen in plaats van op de luchthaven?", answer: "Ja, als de partner die plek aanbiedt. Kies luchthaven of stad in de zoekopdracht en de prijs geldt voor die ophaalplek." },
      { question: "Welke documenten, verzekering en borg heb ik nodig?", answer: "Rijbewijs en paspoort. TPL-verzekering is inbegrepen. Borg en het restbedrag staan vóór de boeking bij de auto." },
      { question: "Kan ik een langere rit maken?", answer: "Ja. Controleer kilometers en toegestane landen. Op hoofdwegen volstaat een sedan. Buiten het asfalt is een SUV beter." },
    ],
    cityFaqs: [
      { question: "Haal ik de auto in de stad of op de luchthaven op?", answer: "De zoekopdracht toont plekken die de partner echt bedient. Stad of luchthaven bepalen de auto’s en de bezorgprijs." },
      { question: "Wat moet ik meenemen?", answer: "Rijbewijs en paspoort. Borg, verzekering en het bedrag bij ophalen ziet u vóór bevestiging." },
      { question: "Welke auto past bij de rit?", answer: "Een sedan is prettig op hoofdwegen en in de stad. Voor bergen en onverhard kiest u een SUV." },
      { question: "Kan ik de inleverplaats wijzigen?", answer: "Ja, als de partner daar levert. Zet de inleverplaats in de zoekopdracht. Een eventuele toeslag zit in het totaal." },
    ],
  }),
  pl: section({
    benefitsTitle: "Co jest w cenie",
    benefits: [
      { strong: "Lokalni partnerzy", text: "pozwalają porównać auta, które naprawdę są w tym miejscu." },
      { strong: "Cena", text: "obejmuje dni wynajmu i dodatki, które sam wybierzesz." },
      { strong: "Ubezpieczenie TPL", text: "jest wliczone. Kaucja i kwota przy odbiorze są widoczne przed płatnością." },
    ],
    carsTitle: "Auta w tej lokalizacji",
    perDay: "/ dzień",
    notesTitle: "Odbiór i trasa",
    airportNotes: [
      "Auto odbierasz na lotnisku po przylocie. Miejsce spotkania partner potwierdza po rezerwacji.",
      "Sedan wystarczy w mieście i na transfer. W góry i na szuter lepszy jest SUV.",
      "Weź prawo jazdy i paszport. Karta i kaucja są na stronie rezerwacji.",
    ],
    cityNotes: [
      "Auto odbierasz w mieście albo na lotnisku, jeśli partner tam dowozi.",
      "Sedan pasuje do miasta. W góry i na gorszą nawierzchnię wybierz SUV.",
      "Weź prawo jazdy i paszport. Ubezpieczenie i kaucja są widoczne przed potwierdzeniem.",
    ],
    routesTitle: "Trasy w pobliżu",
    routeLine: (km, time) => `Około ${km} km, około ${time}.`,
    sedan: "Sedan wystarczy.",
    either: "Pasuje sedan albo SUV.",
    faqTitle: "Pytania",
    airportFaqs: [
      { question: "Gdzie odbiorę auto na lotnisku?", answer: "Partner spotyka się z Tobą na lotnisku po przylocie i potwierdza punkt w rezerwacji. Nie musisz najpierw jechać do miasta." },
      { question: "Czy mogę odebrać auto w mieście zamiast na lotnisku?", answer: "Tak, jeśli partner obsługuje to miejsce. Wybierz lotnisko albo miasto w wyszukiwarce, a cena policzy się dla tego odbioru." },
      { question: "Jakie dokumenty, ubezpieczenie i kaucja są potrzebne?", answer: "Prawo jazdy i paszport. Ubezpieczenie TPL jest wliczone. Kaucja i kwota przy odbiorze są widoczne przed rezerwacją." },
      { question: "Czy mogę pojechać w dłuższą trasę?", answer: "Tak. Sprawdź limit kilometrów i dozwolone kraje. Na głównych drogach wystarczy sedan. Poza asfaltem lepszy jest SUV." },
    ],
    cityFaqs: [
      { question: "Odbiór jest w mieście czy na lotnisku?", answer: "Wyszukiwarka pokazuje miejsca, które partner naprawdę obsługuje. Miasto albo lotnisko zmienia listę aut i cenę dowozu." },
      { question: "Co zabrać ze sobą?", answer: "Prawo jazdy i paszport. Kaucja, ubezpieczenie i kwota przy odbiorze są widoczne przed potwierdzeniem." },
      { question: "Które auto lepsze na trasę?", answer: "Sedan jest wygodny na głównych drogach i w mieście. W góry i na szuter wybierz SUV." },
      { question: "Czy mogę zmienić miejsce zwrotu?", answer: "Tak, jeśli partner tam dowozi. Ustaw zwrot w wyszukiwarce, a ewentualna opłata wejdzie w sumę." },
    ],
  }),
  tr: section({
    benefitsTitle: "Neler dahil",
    benefits: [
      { strong: "Yerel iş ortakları", text: "bu noktada gerçekten sunulan araçları karşılaştırmanızı sağlar." },
      { strong: "Fiyat", text: "kiralama günlerini ve sizin seçtiğiniz ekstraları içerir." },
      { strong: "TPL sigortası", text: "dahildir. Depozito ve teslimde ödenecek tutar ödemeden önce görünür." },
    ],
    carsTitle: "Bu konumdaki araçlar",
    perDay: "/ gün",
    notesTitle: "Teslim ve yol",
    airportNotes: [
      "Araç inişten sonra havalimanında teslim edilir. Buluşma noktası rezervasyondan sonra netleşir.",
      "Şehir ve transfer için sedan yeterlidir. Dağ ve toprak yolda SUV daha uygundur.",
      "Ehliyet ve pasaport getirin. Kart ve depozito rezervasyon sayfasında yazar.",
    ],
    cityNotes: [
      "Aracı şehirde alırsınız ya da iş ortağı teslim ediyorsa havalimanında.",
      "Sedan şehir için uygundur. Dağ ve bozuk yolda SUV daha iyidir.",
      "Ehliyet ve pasaport getirin. Sigorta ve depozito onaydan önce görünür.",
    ],
    routesTitle: "Yakın rotalar",
    routeLine: (km, time) => `Yaklaşık ${km} km, yaklaşık ${time}.`,
    sedan: "Sedan yeterlidir.",
    either: "Sedan da SUV da olur.",
    faqTitle: "Sorular",
    airportFaqs: [
      { question: "Havalimanında aracı nereden alırım?", answer: "İş ortağı sizi inişten sonra havalimanında karşılar ve buluşma noktasını rezervasyonda doğrular. Önce şehre gitmeniz gerekmez." },
      { question: "Aracı havalimanı yerine şehirde alabilir miyim?", answer: "Evet, iş ortağı o yeri sunuyorsa. Aramada havalimanını veya şehri seçin; fiyat o teslim noktasına göre güncellenir." },
      { question: "Hangi belge, sigorta ve depozito gerekir?", answer: "Ehliyet ve pasaport. TPL sigortası dahildir. Depozito ve teslimde kalan tutar rezervasyondan önce araçta yazar." },
      { question: "Daha uzun bir yola çıkabilir miyim?", answer: "Evet. Kilometre sınırını ve izinli ülkeleri kontrol edin. Ana yolda sedan yeter. Asfalt dışında SUV daha uygundur." },
    ],
    cityFaqs: [
      { question: "Teslim şehirde mi, havalimanında mı?", answer: "Arama, iş ortağının gerçekten hizmet verdiği yerleri gösterir. Şehir veya havalimanı araçları ve teslim ücretini değiştirir." },
      { question: "Yanımda ne olmalı?", answer: "Ehliyet ve pasaport. Depozito, sigorta ve teslimde ödenecek tutar onaydan önce görünür." },
      { question: "Yol için hangi araç daha iyi?", answer: "Sedan ana yolda ve şehirde rahattır. Dağ ve toprak yol için SUV seçin." },
      { question: "İade yerini değiştirebilir miyim?", answer: "Evet, iş ortağı oraya teslim ediyorsa. İadeyi aramada belirtin; varsa ücret toplama girer." },
    ],
  }),
  ar: section({
    benefitsTitle: "ماذا يشمل",
    benefits: [
      { strong: "شركاء محليون", text: "يتيحون مقارنة السيارات المعروضة فعلًا في هذا المكان." },
      { strong: "السعر", text: "يشمل أيام الإيجار والإضافات التي تختارها." },
      { strong: "تأمين TPL", text: "مشمول. يظهر العربون والمبلغ عند الاستلام قبل الدفع." },
    ],
    carsTitle: "سيارات في هذا المكان",
    perDay: "/ يوم",
    notesTitle: "الاستلام والطريق",
    airportNotes: [
      "تُسلَّم السيارة في المطار بعد الوصول. يؤكد الشريك نقطة اللقاء بعد الحجز.",
      "السيدان تكفي للمدينة وللنقل من المطار. للجبل والطرق الترابية اختر SUV.",
      "أحضِر رخصة القيادة وجواز السفر. البطاقة والعربون ظاهران في صفحة الحجز.",
    ],
    cityNotes: [
      "تستلم السيارة في المدينة، أو في المطار إذا كان الشريك يوصل إليها.",
      "السيدان مناسبة للمدينة. الـ SUV أفضل للجبل والطرق الوعرة.",
      "أحضِر الرخصة وجواز السفر. التأمين والعربون ظاهران قبل التأكيد.",
    ],
    routesTitle: "طرق قريبة",
    routeLine: (km, time) => `حوالي ${km} كم، حوالي ${time}.`,
    sedan: "السيدان كافية.",
    either: "تناسب السيدان أو الـ SUV.",
    faqTitle: "أسئلة",
    airportFaqs: [
      { question: "أين أستلم السيارة في المطار؟", answer: "يقابلك الشريك في المطار بعد الهبوط ويؤكد نقطة اللقاء في الحجز. لا حاجة للذهاب إلى المدينة أولًا." },
      { question: "هل يمكن استلام السيارة في المدينة بدل المطار؟", answer: "نعم إذا كان الشريك يخدم ذلك المكان. اختر المطار أو المدينة في البحث ويتحدّث السعر لنقطة الاستلام." },
      { question: "ما الوثائق والتأمين والعربون؟", answer: "رخصة قيادة وجواز سفر. تأمين TPL مشمول. العربون والمبلغ عند الاستلام ظاهران قبل الحجز." },
      { question: "هل يمكن القيام برحلة أطول؟", answer: "نعم. راجع حد المسافة والدول المسموحة. على الطرق الرئيسية تكفي السيدان. خارج الأسفلت اختر SUV." },
    ],
    cityFaqs: [
      { question: "هل الاستلام في المدينة أم في المطار؟", answer: "يعرض البحث الأماكن التي يخدمها الشريك فعلًا. المدينة أو المطار يغيّران السيارات وسعر التوصيل." },
      { question: "ماذا أحضر معي؟", answer: "رخصة وجواز سفر. العربون والتأمين والمبلغ عند الاستلام ظاهرة قبل التأكيد." },
      { question: "أي سيارة أنسب للطريق؟", answer: "السيدان مريحة على الطرق الرئيسية وفي المدينة. للجبل والتراب اختر SUV." },
      { question: "هل يمكن تغيير مكان الإرجاع؟", answer: "نعم إذا كان الشريك يوصل إلى هناك. حدّد الإرجاع في البحث وأي رسوم تدخل في المجموع." },
    ],
  }),
  zh: section({
    benefitsTitle: "包含内容",
    benefits: [
      { strong: "本地合作方", text: "让您比较这个地点真正提供的车辆。" },
      { strong: "价格", text: "包含租车天数和您选择的附加项。" },
      { strong: "TPL 保险", text: "已包含。押金和取车时应付金额在付款前显示。" },
    ],
    carsTitle: "此地的车辆",
    perDay: "/ 天",
    notesTitle: "取车与驾驶",
    airportNotes: [
      "降落后在机场交接车辆。会面地点在预订后由合作方确认。",
      "市区和机场接送用轿车即可。山路和非铺装路请选择 SUV。",
      "请携带驾照和护照。付款卡和押金在预订页上确认。",
    ],
    cityNotes: [
      "在市区取车；若合作方提供送车，也可在机场取。",
      "轿车适合市区。山路和较差路面更适合 SUV。",
      "请携带驾照和护照。保险和押金在确认前显示。",
    ],
    routesTitle: "附近路程",
    routeLine: (km, time) => `约 ${km} 公里，约 ${time}。`,
    sedan: "轿车即可。",
    either: "轿车或 SUV 都可以。",
    faqTitle: "常见问题",
    airportFaqs: [
      { question: "在机场哪里取车？", answer: "合作方在您降落后于机场见面，并在订单中确认会面点。不必先进城。" },
      { question: "可以在市区而不是机场取车吗？", answer: "可以，只要合作方提供该地点。在搜索中选择机场或市区，价格会按该取车点更新。" },
      { question: "需要哪些证件、保险和押金？", answer: "请带驾照和护照。TPL 保险已包含。押金和取车应付金额在预订前显示在车辆页。" },
      { question: "可以开去更远的路线吗？", answer: "可以。请查看里程和允许的国家。主干道用轿车即可。离开铺装路面时选择 SUV。" },
    ],
    cityFaqs: [
      { question: "是在市区取车还是在机场取车？", answer: "搜索显示合作方实际服务的地点。选择市区或机场后，车辆和送车价格随之变化。" },
      { question: "需要带什么？", answer: "驾照和护照。押金、保险和取车应付金额在确认前列出。" },
      { question: "长途更适合哪类车？", answer: "轿车适合主干道和市区。山路和非铺装路请选择 SUV。" },
      { question: "可以更改还车地点吗？", answer: "可以，只要合作方送到该地。在搜索中设置还车点，如有费用会计入总价。" },
    ],
  }),
  ko: section({
    benefitsTitle: "포함 내용",
    benefits: [
      { strong: "현지 파트너", text: "이 장소에서 실제로 제공되는 차를 비교할 수 있습니다." },
      { strong: "요금", text: "대여 일수와 직접 고른 추가 항목이 포함됩니다." },
      { strong: "TPL 보험", text: "이 포함됩니다. 보증금과 인수 시 금액은 결제 전에 보입니다." },
    ],
    carsTitle: "이 장소의 차량",
    perDay: "/ 일",
    notesTitle: "인수와 운전",
    airportNotes: [
      "착륙 후 공항에서 차를 받습니다. 만나는 장소는 예약 후 파트너가 확인합니다.",
      "시내와 공항 이동은 세단으로 충분합니다. 산길과 비포장도로는 SUV가 낫습니다.",
      "면허증과 여권을 지참하세요. 카드와 보증금은 예약 페이지에 나옵니다.",
    ],
    cityNotes: [
      "시내에서 차를 받거나, 파트너가 배달하면 공항에서 받습니다.",
      "세단은 시내에 알맞습니다. 산길과 거친 노면은 SUV가 낫습니다.",
      "면허증과 여권을 지참하세요. 보험과 보증금은 확인 전에 보입니다.",
    ],
    routesTitle: "가까운 경로",
    routeLine: (km, time) => `약 ${km} km, 약 ${time}.`,
    sedan: "세단으로 충분합니다.",
    either: "세단과 SUV 모두 가능합니다.",
    faqTitle: "질문",
    airportFaqs: [
      { question: "공항에서 차는 어디에서 받나요?", answer: "파트너가 착륙 후 공항에서 만나고 예약에 만나는 장소를 확인합니다. 먼저 시내로 갈 필요가 없습니다." },
      { question: "공항 대신 시내에서 받을 수 있나요?", answer: "파트너가 그 장소를 제공하면 가능합니다. 검색에서 공항이나 도시를 고르면 요금이 그 인수 지점에 맞게 바뀝니다." },
      { question: "서류, 보험, 보증금은 무엇이 필요한가요?", answer: "면허증과 여권을 지참하세요. TPL 보험이 포함됩니다. 보증금과 인수 시 금액은 예약 전에 차량에 표시됩니다." },
      { question: "더 긴 여행에 차를 가져갈 수 있나요?", answer: "가능합니다. 주행 거리와 허용 국가를 확인하세요. 주요 도로는 세단으로 충분하고, 포장도로를 벗어나면 SUV가 낫습니다." },
    ],
    cityFaqs: [
      { question: "인수는 시내인가요, 공항인가요?", answer: "검색은 파트너가 실제로 서비스하는 장소를 보여 줍니다. 도시나 공항에 따라 차량과 배달 요금이 달라집니다." },
      { question: "무엇을 가져가야 하나요?", answer: "면허증과 여권입니다. 보증금, 보험, 인수 시 금액은 확인 전에 나옵니다." },
      { question: "여행에는 어떤 차가 나은가요?", answer: "세단은 주요 도로와 시내에 편합니다. 산길과 비포장도로는 SUV를 고르세요." },
      { question: "반납 장소를 바꿀 수 있나요?", answer: "파트너가 그곳으로 배달하면 가능합니다. 검색에서 반납지를 정하면 수수료가 있을 때 합계에 포함됩니다." },
    ],
  }),
  th: section({
    benefitsTitle: "สิ่งที่รวมอยู่",
    benefits: [
      { strong: "พาร์ทเนอร์ท้องถิ่น", text: "ให้เปรียบเทียบรถที่มีให้บริการจริงที่จุดนี้" },
      { strong: "ราคา", text: "รวมจำนวนวันเช่าและบริการเสริมที่คุณเลือก" },
      { strong: "ประกัน TPL", text: "รวมอยู่แล้ว มัดจำและยอดที่จ่ายตอนรับรถแสดงก่อนชำระเงิน" },
    ],
    carsTitle: "รถที่จุดนี้",
    perDay: "/ วัน",
    notesTitle: "การรับรถและการขับ",
    airportNotes: [
      "รับรถที่สนามบินหลังเครื่องลง จุดนัดพบจะยืนยันหลังจอง",
      "ซีดานพอสำหรับในเมืองและรับส่งสนามบิน ทางเขาและทางลูกรังควรเลือก SUV",
      "นำใบขับขี่และพาสปอร์ตมา บัตรและมัดจำแสดงในหน้าจอง",
    ],
    cityNotes: [
      "รับรถในเมือง หรือที่สนามบินถ้าพาร์ทเนอร์ส่งรถที่นั่น",
      "ซีดานเหมาะกับในเมือง ทางเขาและถนนขรุขระควรใช้ SUV",
      "นำใบขับขี่และพาสปอร์ตมา ประกันและมัดจำแสดงก่อนยืนยัน",
    ],
    routesTitle: "เส้นทางใกล้เคียง",
    routeLine: (km, time) => `ประมาณ ${km} กม. ประมาณ ${time}`,
    sedan: "ซีดานเพียงพอ",
    either: "ใช้ได้ทั้งซีดานและ SUV",
    faqTitle: "คำถาม",
    airportFaqs: [
      { question: "รับรถที่สนามบินตรงไหน?", answer: "พาร์ทเนอร์พบคุณที่สนามบินหลังเครื่องลง และยืนยันจุดนัดในใบจอง ไม่ต้องเข้าเมืองก่อน" },
      { question: "รับรถในเมืองแทนสนามบินได้ไหม?", answer: "ได้ ถ้าพาร์ทเนอร์ให้บริการจุดนั้น เลือกสนามบินหรือเมืองในการค้นหา ราคาจะคิดตามจุดรับนั้น" },
      { question: "ต้องใช้เอกสาร ประกัน และมัดจำอะไร?", answer: "ใบขับขี่และพาสปอร์ต ประกัน TPL รวมอยู่แล้ว มัดจำและยอดที่จ่ายตอนรับรถแสดงก่อนจอง" },
      { question: "ขับไปเที่ยวไกลได้ไหม?", answer: "ได้ ตรวจระยะทางและประเทศที่อนุญาต ทางหลักใช้ซีดานได้ นอกทางลาดยางควรใช้ SUV" },
    ],
    cityFaqs: [
      { question: "รับรถในเมืองหรือที่สนามบิน?", answer: "การค้นหาแสดงจุดที่พาร์ทเนอร์ให้บริการจริง เมืองหรือสนามบินจะเปลี่ยนรายการรถและค่าส่ง" },
      { question: "ต้องพกอะไรไป?", answer: "ใบขับขี่และพาสปอร์ต มัดจำ ประกัน และยอดตอนรับรถแสดงก่อนยืนยัน" },
      { question: "รถแบบไหนเหมาะกับการเดินทาง?", answer: "ซีดานสบายบนทางหลักและในเมือง ทางเขาและทางลูกรังเลือก SUV" },
      { question: "เปลี่ยนจุดคืนรถได้ไหม?", answer: "ได้ ถ้าพาร์ทเนอร์ส่งถึงจุดนั้น ตั้งจุดคืนในการค้นหา ค่าธรรมเนียมถ้ามีจะรวมในยอด" },
    ],
  }),
};

function pack(locale: string): LocationSectionCopy {
  return COPY[locale as Locale] ?? COPY.en;
}

export function locationSectionCopy(locale: string): LocationSectionCopy {
  return pack(locale);
}

export function locationFaqs(locale: string, kind: "airport" | "city"): LocationFaq[] {
  const copy = pack(locale);
  return kind === "airport" ? copy.airportFaqs : copy.cityFaqs;
}

type RouteSeed = { placeEn: string; km: string; time: string; tip: "sedan" | "either" };

/** Approximate drives from a hub. Add a code and every location page of that place can show it. */
const ROUTES: Record<string, RouteSeed[]> = {
  KUT: [
    { placeEn: "Kutaisi", km: "18", time: "25 min", tip: "sedan" },
    { placeEn: "Tbilisi", km: "230", time: "3.5 h", tip: "either" },
    { placeEn: "Batumi", km: "150", time: "2.5 h", tip: "either" },
  ],
  TBS: [
    { placeEn: "Tbilisi", km: "18", time: "30 min", tip: "sedan" },
    { placeEn: "Mtskheta", km: "25", time: "30 min", tip: "sedan" },
    { placeEn: "Kazbegi", km: "150", time: "2.5 h", tip: "either" },
  ],
  BUS: [
    { placeEn: "Batumi", km: "5", time: "15 min", tip: "sedan" },
    { placeEn: "Kutaisi", km: "150", time: "2.5 h", tip: "either" },
    { placeEn: "Tbilisi", km: "370", time: "6 h", tip: "either" },
  ],
};

const CITY_HUB: Record<string, string> = {
  Kutaisi: "KUT",
  Tbilisi: "TBS",
  Batumi: "BUS",
};

export function locationRouteLines(
  code: string,
  locale: string,
  cityName?: string,
): Array<{ title: string; detail: string }> {
  const direct = code.trim().toUpperCase();
  const hub = ROUTES[direct] ? direct : CITY_HUB[cityName || ""] || "";
  const rows = ROUTES[hub];
  if (!rows?.length) return [];
  const copy = pack(locale);
  const lang = (locale in COPY ? locale : "en") as Locale;
  return rows.map((row) => ({
    title: cityDisplayName(lang, row.placeEn) || row.placeEn,
    detail: `${copy.routeLine(row.km, row.time)} ${row.tip === "sedan" ? copy.sedan : copy.either}`,
  }));
}
