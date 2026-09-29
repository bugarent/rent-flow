import type { Locale } from "@/lib/i18n/config";

type Kind = "terms" | "privacy";

const TERMS: Partial<Record<Locale, string>> = {
  en: `Terms and Conditions — RentAirportCars.com
Please read these terms carefully before using the platform.

1. General provisions and the role of the platform
1.1. Who we are: RentAirportCars.com is an international online intermediary. We connect clients with local car-rental providers, mainly at airports and major cities.
1.2. Our role: The platform acts only as an independent intermediary. We do not own, operate, or rent the vehicles. Every vehicle is owned and managed by our partners.
1.3. What the platform provides: online booking tools; verification of partners and their vehicles; secure processing of the advance service fee; support for communication between client and partner.
1.4. Legal agreement: By registering, booking, or using the service you confirm that you have read and accept these terms. The actual rental contract is formed only between the client and the partner when the vehicle is handed over.

2. Booking and payment
2.1. A booking is confirmed only after the partial advance payment is successfully processed. You then receive a voucher.
2.2. The total rental price has two parts: an advance service fee paid through the platform (our intermediary commission, not the full rental price) and the remaining balance paid directly to the partner at pickup, by the method shown on the listing (cash or card).
2.3. Prices are set by partners. We may correct obvious technical or pricing errors before confirmation.
2.4. Transactions use the main currency shown on the site. On-site payment may use local currency at the applicable exchange rate.

3. Cancellation and refunds
3.1. Free cancellation: the advance is refunded in full (transfer fees charged when paying or refunding are excluded) if you cancel at least 5 days before the scheduled pickup.
3.2. Late cancellation and no-show: if you cancel less than 5 days before pickup, or you do not appear and do not warn the partner (unless an extra service you bought covers this), the advance is not refunded.
3.3. If the partner cannot supply the booked vehicle, they must offer an equal or higher class at no extra cost. If no alternative is available, the platform refunds the advance in full. The platform is not liable for the partner’s failure but will help the client as far as possible.

4. Requirements at pickup
4.1. Minimum age 21 and at least 1 year of driving experience, unless the vehicle page says otherwise. Some premium cars may require age 25+.
4.2. You must present a valid passport, a valid national driving licence accepted in the destination country, an international driving permit when the national licence is not accepted, and a credit or debit card in the partner’s name if a deposit must be blocked.
4.3. The partner may refuse the vehicle if age or documents are not met, or if the driver is under the influence of alcohol or drugs. In that case the advance is not refunded.

5. Insurance and vehicle condition
5.1. The cover shown on the listing (TPL, CDW, full cover) is defined by the partner and is always subject to limits, exclusions, and an excess.
5.2. After any accident, damage, or theft you must immediately inform the partner and the platform, call the police and obtain a report, and not leave the scene without permission.
5.3. The partner must hand over a clean, roadworthy vehicle. You must return it in the same condition, including fuel level and cleanliness.

6. Prohibited use
You may not drive under the influence of alcohol, drugs, or medicines that impair reaction; use the vehicle for illegal purposes, racing, towing, or taking it out of the country without written consent; hand the vehicle to a third party who is not on the insurance; carry pets without permission; or enter areas the owner has listed as forbidden.

7. Limitation of liability
7.1. As an intermediary we are not liable for accidents, damage, fines, injury during the rental, disputes between partner and client, or indirect loss caused by interruption or a technical fault.
7.2. In any case the platform’s total liability does not exceed the advance service fee the client paid.

8. Data protection
We process personal data under our Privacy Policy. Using the platform means you agree to processing needed to complete the booking and, unless you opt out, for marketing.

9. Governing law
These terms follow the applicable national law and international norms. Disputes are decided by the competent court.

10. Changes
We may change these terms at any time. Changes apply when published on the website. Continued use means you accept them.`,
  de: `Allgemeine Geschäftsbedingungen — RentAirportCars.com
Bitte lesen Sie diese Bedingungen, bevor Sie die Plattform nutzen.

1. Allgemeine Bestimmungen
1.1. RentAirportCars.com ist ein internationaler Online-Vermittler. Wir verbinden Kunden mit lokalen Autovermietern, vor allem an Flughäfen und in großen Städten.
1.2. Die Plattform handelt nur als unabhängiger Vermittler. Wir besitzen, betreiben oder vermieten die Fahrzeuge nicht. Jedes Fahrzeug gehört dem Partner und wird von ihm geführt.
1.3. Wir bieten Buchungswerkzeuge, Prüfung der Partner und Fahrzeuge, sichere Verarbeitung der Anzahlung und Unterstützung der Kommunikation.
1.4. Mit Registrierung, Buchung oder Nutzung akzeptieren Sie diese Bedingungen. Der eigentliche Mietvertrag entsteht erst zwischen Kunde und Partner bei der Übergabe.

2. Buchung und Zahlung
2.1. Eine Buchung gilt erst nach erfolgreicher Teilanzahlung als bestätigt. Danach erhalten Sie einen Voucher.
2.2. Der Mietpreis besteht aus der Service-Anzahlung über die Plattform (unsere Vermittlungsgebühr, nicht der volle Mietpreis) und dem Restbetrag, den Sie beim Partner vor Ort in der angegebenen Weise zahlen.
2.3. Preise setzen die Partner. Offensichtliche Fehler dürfen wir vor der Bestätigung korrigieren.
2.4. Zahlungen laufen in der auf der Website genannten Hauptwährung. Vor Ort kann die lokale Währung zum jeweiligen Kurs gelten.

3. Stornierung und Erstattung
3.1. Kostenlose Stornierung: die Anzahlung wird vollständig erstattet (Überweisungsgebühren ausgenommen), wenn Sie mindestens 5 Tage vor der Abholung stornieren.
3.2. Bei Stornierung weniger als 5 Tage vorher oder bei Nichterscheinen ohne Mitteilung (sofern kein gebuchter Zusatz dies abdeckt) wird die Anzahlung nicht erstattet.
3.3. Kann der Partner das Fahrzeug nicht stellen, muss er dieselbe oder eine höhere Klasse ohne Aufpreis anbieten. Gibt es keine Alternative, erstattet die Plattform die Anzahlung. Für das Versäumnis des Partners haften wir nicht, helfen aber dem Kunden.

4. Anforderungen bei der Abholung
4.1. Mindestalter 21 Jahre und mindestens 1 Jahr Fahrpraxis, sofern die Fahrzeugseite nichts anderes sagt. Premiumfahrzeuge können 25+ verlangen.
4.2. Nötig sind gültiger Reisepass, anerkannter nationaler Führerschein, bei Bedarf ein internationaler Führerschein und eine Karte auf den Namen des Partners, falls eine Kaution blockiert wird.
4.3. Der Partner darf die Ausgabe verweigern, wenn Alter oder Dokumente fehlen oder der Fahrer unter Alkohol- oder Drogeneinfluss steht. Die Anzahlung wird dann nicht erstattet.

5. Versicherung und Zustand
5.1. Der auf dem Inserat genannte Schutz (Haftpflicht, CDW, Vollkasko) wird vom Partner festgelegt und unterliegt Grenzen, Ausschlüssen und einer Selbstbeteiligung.
5.2. Nach Unfall, Schaden oder Diebstahl müssen Sie Partner und Plattform sofort informieren, die Polizei rufen und einen Bericht einholen und den Ort nicht ohne Erlaubnis verlassen.
5.3. Der Partner übergibt ein sauberes, verkehrssicheres Fahrzeug. Sie geben es im gleichen Zustand zurück, einschließlich Kraftstoff und Sauberkeit.

6. Verbotene Nutzung
Untersagt sind Fahren unter Alkohol, Drogen oder reaktionshemmenden Medikamenten; illegale Nutzung, Rennen, Abschleppen oder Ausfuhr ohne schriftliche Zustimmung; Übergabe an nicht versicherte Dritte; Tiere ohne Erlaubnis; Einfahrt in vom Eigentümer verbotene Gebiete.

7. Haftungsbeschränkung
7.1. Als Vermittler haften wir nicht für Unfälle, Schäden, Bußgelder, Verletzungen, Streit zwischen Partner und Kunde oder mittelbare Schäden durch Ausfall oder Technikfehler.
7.2. Die Gesamthaftung der Plattform übersteigt nicht die gezahlte Service-Anzahlung.

8. Datenschutz
Personenbezogene Daten verarbeiten wir nach der Datenschutzerklärung. Die Nutzung bedeutet Zustimmung zur Verarbeitung für die Buchung und, sofern Sie nicht widersprechen, für Marketing.

9. Anwendbares Recht
Es gilt das maßgebliche nationale Recht einschließlich internationaler Normen. Streitigkeiten entscheidet das zuständige Gericht.

10. Änderungen
Wir können diese Bedingungen jederzeit ändern. Sie gelten mit Veröffentlichung. Weitere Nutzung gilt als Zustimmung.`,
  es: `Términos y condiciones — RentAirportCars.com
Lea estos términos antes de usar la plataforma.

1. Disposiciones generales
1.1. RentAirportCars.com es un intermediario en línea internacional. Conectamos clientes con proveedores locales de alquiler, sobre todo en aeropuertos y grandes ciudades.
1.2. La plataforma actúa solo como intermediario independiente. No somos propietarios, operadores ni arrendadores. Cada vehículo pertenece al socio y lo gestiona él.
1.3. Ofrecemos herramientas de reserva, verificación de socios y vehículos, cobro seguro del anticipo y apoyo a la comunicación.
1.4. Al registrarse, reservar o usar el servicio acepta estos términos. El contrato real de alquiler se forma solo entre el cliente y el socio al entregar el vehículo.

2. Reserva y pago
2.1. La reserva se confirma solo cuando el anticipo parcial se procesa con éxito. Entonces recibe un vale.
2.2. El precio tiene dos partes: el anticipo de servicio pagado en la plataforma (nuestra comisión, no el alquiler completo) y el saldo que se paga al socio en la recogida, por el método del anuncio.
2.3. Los precios los fijan los socios. Podemos corregir errores técnicos evidentes antes de confirmar.
2.4. Las operaciones usan la moneda principal del sitio. En el lugar puede usarse la moneda local al tipo de cambio aplicable.

3. Cancelación y reembolsos
3.1. Cancelación gratuita: el anticipo se devuelve íntegro (salvo comisiones de transferencia) si cancela al menos 5 días antes de la recogida.
3.2. Si cancela con menos de 5 días o no se presenta y no avisa (salvo que un extra contratado lo cubra), el anticipo no se devuelve.
3.3. Si el socio no puede entregar el vehículo, debe ofrecer uno igual o superior sin coste extra. Si no hay alternativa, la plataforma devuelve el anticipo. No respondemos por el incumplimiento del socio, pero ayudamos al cliente.

4. Requisitos en la recogida
4.1. Edad mínima 21 años y al menos 1 año de permiso, salvo que la ficha indique otra cosa. Algunos vehículos premium pueden exigir 25+.
4.2. Debe presentar pasaporte válido, permiso nacional aceptado en el destino, permiso internacional cuando haga falta y una tarjeta a nombre del socio si hay que bloquear un depósito.
4.3. El socio puede negar el vehículo si no se cumple la edad o la documentación, o si el conductor está bajo efectos del alcohol o drogas. En ese caso el anticipo no se devuelve.

5. Seguro y estado del vehículo
5.1. La cobertura del anuncio (RC, CDW, completa) la define el socio y está sujeta a límites, exclusiones y franquicia.
5.2. Tras un accidente, daño o robo debe avisar de inmediato al socio y a la plataforma, llamar a la policía y obtener un parte, y no abandonar el lugar sin permiso.
5.3. El socio entrega un vehículo limpio y en condiciones. Usted lo devuelve igual, incluido el combustible y la limpieza.

6. Usos prohibidos
No conduzca bajo alcohol, drogas o medicamentos que alteren la reacción; no use el vehículo para fines ilegales, carreras, remolque o salida del país sin consentimiento escrito; no lo ceda a un tercero no asegurado; no lleve mascotas sin permiso; no entre en zonas prohibidas por el propietario.

7. Límite de responsabilidad
7.1. Como intermediarios no respondemos de accidentes, daños, multas, lesiones, disputas entre socio y cliente ni de pérdidas indirectas por interrupción o fallo técnico.
7.2. La responsabilidad total de la plataforma no supera el anticipo de servicio pagado.

8. Datos
Tratamos los datos según la política de privacidad. El uso implica aceptar el tratamiento necesario para la reserva y, si no se opone, para marketing.

9. Ley aplicable
Rigen la ley nacional aplicable y las normas internacionales. Las disputas las decide el tribunal competente.

10. Cambios
Podemos modificar estos términos en cualquier momento. Rigen al publicarse. Seguir usando el servicio implica aceptarlos.`,
  fr: `Conditions d’utilisation — RentAirportCars.com
Veuillez lire ces conditions avant d’utiliser la plateforme.

1. Dispositions générales
1.1. RentAirportCars.com est un intermédiaire en ligne international. Nous mettons en relation des clients et des loueurs locaux, surtout dans les aéroports et les grandes villes.
1.2. La plateforme agit uniquement comme intermédiaire indépendant. Nous ne possédons, n’exploitons ni ne louons les véhicules. Chaque véhicule appartient au partenaire et est géré par lui.
1.3. Nous fournissons des outils de réservation, la vérification des partenaires et des véhicules, le traitement sécurisé de l’acompte et l’aide à la communication.
1.4. En vous inscrivant, en réservant ou en utilisant le service, vous acceptez ces conditions. Le contrat de location réel se forme seulement entre le client et le partenaire à la remise du véhicule.

2. Réservation et paiement
2.1. La réservation n’est confirmée qu’après le traitement réussi de l’acompte partiel. Vous recevez alors un voucher.
2.2. Le prix comprend l’acompte de service payé sur la plateforme (notre commission, pas le prix total) et le solde payé au partenaire au retrait, selon le mode indiqué.
2.3. Les prix sont fixés par les partenaires. Nous pouvons corriger une erreur technique évidente avant confirmation.
2.4. Les paiements utilisent la devise principale du site. Sur place, la devise locale peut s’appliquer au taux en vigueur.

3. Annulation et remboursement
3.1. Annulation gratuite : l’acompte est remboursé intégralement (frais de virement exclus) si vous annulez au moins 5 jours avant le retrait.
3.2. En cas d’annulation à moins de 5 jours ou de non-présentation sans avertissement (sauf extra couvrant ce cas), l’acompte n’est pas remboursé.
3.3. Si le partenaire ne peut pas fournir le véhicule, il doit proposer une classe égale ou supérieure sans supplément. À défaut, la plateforme rembourse l’acompte. Nous ne sommes pas responsables de la défaillance du partenaire, mais nous aidons le client.

4. Conditions au retrait
4.1. Âge minimum 21 ans et au moins 1 an de permis, sauf indication contraire. Certains véhicules premium peuvent exiger 25 ans.
4.2. Passeport valide, permis national accepté dans le pays, permis international si nécessaire, et carte au nom du partenaire si une caution doit être bloquée.
4.3. Le partenaire peut refuser le véhicule si l’âge ou les documents manquent, ou si le conducteur est sous l’influence d’alcool ou de drogues. L’acompte n’est alors pas remboursé.

5. Assurance et état du véhicule
5.1. La couverture indiquée (RC, CDW, tous risques) est définie par le partenaire et soumise à des limites, exclusions et une franchise.
5.2. Après un accident, un dommage ou un vol, prévenez aussitôt le partenaire et la plateforme, appelez la police et obtenez un rapport, et ne quittez pas les lieux sans autorisation.
5.3. Le partenaire remet un véhicule propre et en état. Vous le rendez dans le même état, carburant et propreté compris.

6. Usages interdits
Conduite sous alcool, drogues ou médicaments altérant les réflexes ; usage illégal, course, remorquage ou sortie du pays sans accord écrit ; remise à un tiers non assuré ; animaux sans permission ; zones interdites par le propriétaire.

7. Limitation de responsabilité
7.1. En tant qu’intermédiaire, nous ne répondons pas des accidents, dommages, amendes, blessures, litiges entre partenaire et client, ni des pertes indirectes liées à une interruption ou une panne.
7.2. La responsabilité totale de la plateforme ne dépasse pas l’acompte de service payé.

8. Données
Nous traitons les données selon la politique de confidentialité. L’usage vaut accord pour le traitement nécessaire à la réservation et, sauf opposition, pour le marketing.

9. Droit applicable
Le droit national applicable et les normes internationales s’appliquent. Les litiges sont tranchés par le tribunal compétent.

10. Modifications
Nous pouvons modifier ces conditions à tout moment. Elles s’appliquent dès leur publication. Poursuivre l’usage vaut acceptation.`,
  it: `Termini e condizioni — RentAirportCars.com
Legga questi termini prima di usare la piattaforma.

1. Disposizioni generali
1.1. RentAirportCars.com è un intermediario online internazionale. Mettiamo in contatto i clienti con noleggiatori locali, soprattutto in aeroporti e grandi città.
1.2. La piattaforma agisce solo come intermediario indipendente. Non possediamo, gestiamo né noleggiamo i veicoli. Ogni veicolo appartiene al partner.
1.3. Offriamo strumenti di prenotazione, verifica di partner e veicoli, incasso sicuro dell’acconto e supporto alla comunicazione.
1.4. Registrandosi, prenotando o usando il servizio accetta questi termini. Il contratto di noleggio nasce solo tra cliente e partner alla consegna.

2. Prenotazione e pagamento
2.1. La prenotazione è confermata solo dopo l’acconto parziale. Poi riceve un voucher.
2.2. Il prezzo ha due parti: l’acconto di servizio sulla piattaforma (la nostra commissione, non l’intero noleggio) e il saldo pagato al partner al ritiro, nel modo indicato.
2.3. I prezzi li fissano i partner. Possiamo correggere errori tecnici evidenti prima della conferma.
2.4. I pagamenti usano la valuta principale del sito. Sul posto può valere la valuta locale al cambio applicabile.

3. Cancellazione e rimborsi
3.1. Cancellazione gratuita: l’acconto è rimborsato per intero (escluse le commissioni di trasferimento) se cancella almeno 5 giorni prima del ritiro.
3.2. Se cancella a meno di 5 giorni o non si presenta senza avvisare (salvo un extra che lo copra), l’acconto non è rimborsato.
3.3. Se il partner non può fornire il veicolo, deve offrirne uno di classe uguale o superiore senza costi extra. Se non c’è alternativa, la piattaforma rimborsa l’acconto. Non rispondiamo dell’inadempienza del partner, ma aiutiamo il cliente.

4. Requisiti al ritiro
4.1. Età minima 21 anni e almeno 1 anno di patente, salvo diversa indicazione. Alcune auto premium possono richiedere 25+.
4.2. Passaporto valido, patente nazionale accettata nel paese, permesso internazionale se serve e carta intestata al partner se va bloccato un deposito.
4.3. Il partner può rifiutare il veicolo se età o documenti non bastano, o se il conducente è sotto alcol o droghe. In tal caso l’acconto non è rimborsato.

5. Assicurazione e condizioni
5.1. La copertura in scheda (RC, CDW, completa) è definita dal partner ed è soggetta a limiti, esclusioni e franchigia.
5.2. Dopo incidente, danno o furto deve avvisare subito partner e piattaforma, chiamare la polizia e ottenere un verbale, e non lasciare il luogo senza permesso.
5.3. Il partner consegna un veicolo pulito e idoneo. Lei lo restituisce nello stesso stato, carburante e pulizia compresi.

6. Usi vietati
Guida sotto alcol, droghe o farmaci che riducono i riflessi; uso illecito, gare, traino o uscita dal paese senza consenso scritto; consegna a terzi non assicurati; animali senza permesso; zone vietate dal proprietario.

7. Limite di responsabilità
7.1. Come intermediari non rispondiamo di incidenti, danni, multe, lesioni, controversie tra partner e cliente né di perdite indirette per interruzione o guasto.
7.2. La responsabilità totale della piattaforma non supera l’acconto di servizio pagato.

8. Dati
Trattiamo i dati secondo l’informativa privacy. L’uso implica il consenso al trattamento per la prenotazione e, salvo opposizione, per il marketing.

9. Legge applicabile
Si applica la legge nazionale competente e le norme internazionali. Le controversie le decide il tribunale competente.

10. Modifiche
Possiamo modificare questi termini in qualsiasi momento. Valgono dalla pubblicazione. Continuare a usare il servizio significa accettarli.`,
  nl: `Algemene voorwaarden — RentAirportCars.com
Lees deze voorwaarden voordat u het platform gebruikt.

1. Algemene bepalingen
1.1. RentAirportCars.com is een internationale online tussenpersoon. Wij koppelen klanten aan lokale verhuurders, vooral op luchthavens en in grote steden.
1.2. Het platform treedt alleen op als onafhankelijke tussenpersoon. Wij bezitten, exploiteren of verhuren de voertuigen niet. Elk voertuig is van de partner.
1.3. Wij bieden boekingstools, controle van partners en voertuigen, veilige verwerking van de aanbetaling en hulp bij communicatie.
1.4. Door te registreren, te boeken of de dienst te gebruiken aanvaardt u deze voorwaarden. De echte huurovereenkomst ontstaat pas tussen klant en partner bij de overdracht.

2. Boeking en betaling
2.1. Een boeking is pas bevestigd nadat de gedeeltelijke aanbetaling is verwerkt. U ontvangt dan een voucher.
2.2. De prijs bestaat uit de service-aanbetaling via het platform (onze commissie, niet de volledige huur) en het restbedrag dat u bij ophalen aan de partner betaalt.
2.3. Prijzen bepalen de partners. Duidelijke fouten mogen wij vóór bevestiging corrigeren.
2.4. Betalingen lopen in de hoofdvaluta van de site. Ter plaatse kan de lokale valuta tegen de geldende koers gelden.

3. Annulering en terugbetaling
3.1. Gratis annuleren: de aanbetaling wordt volledig terugbetaald (overboekingskosten uitgezonderd) als u minstens 5 dagen voor ophalen annuleert.
3.2. Bij annulering binnen 5 dagen of no-show zonder bericht (tenzij een extra dit dekt) wordt de aanbetaling niet terugbetaald.
3.3. Kan de partner het voertuig niet leveren, dan moet hij een gelijke of hogere klasse zonder meerprijs aanbieden. Is er geen alternatief, dan betaalt het platform de aanbetaling terug. Wij zijn niet aansprakelijk voor het verzuim van de partner, maar helpen de klant.

4. Eisen bij ophalen
4.1. Minimumleeftijd 21 jaar en minstens 1 jaar rijervaring, tenzij de voertuigpagina anders zegt. Premiumauto’s kunnen 25+ eisen.
4.2. Geldig paspoort, erkend nationaal rijbewijs, internationaal rijbewijs indien nodig, en een kaart op naam van de partner als een borg moet worden geblokkeerd.
4.3. De partner mag weigeren als leeftijd of documenten ontbreken of de bestuurder onder invloed is. De aanbetaling wordt dan niet terugbetaald.

5. Verzekering en staat
5.1. De dekking op de advertentie (WA, CDW, volledig) bepaalt de partner en kent limieten, uitsluitingen en eigen risico.
5.2. Na ongeval, schade of diefstal moet u partner en platform direct informeren, de politie bellen en een rapport halen, en de plek niet zonder toestemming verlaten.
5.3. De partner levert een schoon, rijwaardig voertuig. U levert het in dezelfde staat terug, inclusief brandstof en netheid.

6. Verboden gebruik
Rijden onder alcohol, drugs of reactievertragende medicijnen; illegaal gebruik, racen, slepen of het land uit zonder schriftelijke toestemming; overdracht aan een niet-verzekerde derde; huisdieren zonder toestemming; gebieden die de eigenaar verbiedt.

7. Beperking van aansprakelijkheid
7.1. Als tussenpersoon zijn wij niet aansprakelijk voor ongevallen, schade, boetes, letsel, geschillen tussen partner en klant of indirecte schade door storing of een technisch gebrek.
7.2. De totale aansprakelijkheid van het platform is niet hoger dan de betaalde service-aanbetaling.

8. Gegevens
Wij verwerken gegevens volgens het privacybeleid. Gebruik betekent instemming met verwerking voor de boeking en, tenzij u bezwaar maakt, voor marketing.

9. Toepasselijk recht
Het relevante nationale recht en internationale normen gelden. Geschillen beslist de bevoegde rechter.

10. Wijzigingen
Wij kunnen deze voorwaarden op elk moment wijzigen. Ze gelden na publicatie. Verder gebruik betekent aanvaarding.`,
  pl: `Regulamin — RentAirportCars.com
Przeczytaj te warunki przed użyciem platformy.

1. Postanowienia ogólne
1.1. RentAirportCars.com jest międzynarodowym pośrednikiem online. Łączymy klientów z lokalnymi wypożyczalniami, głównie na lotniskach i w dużych miastach.
1.2. Platforma działa wyłącznie jako niezależny pośrednik. Nie jesteśmy właścicielami, operatorami ani wynajmującymi. Każdy pojazd należy do partnera.
1.3. Zapewniamy narzędzia rezerwacji, weryfikację partnerów i pojazdów, bezpieczną obsługę zaliczki oraz wsparcie komunikacji.
1.4. Rejestracja, rezerwacja lub korzystanie z usługi oznacza akceptację regulaminu. Właściwa umowa najmu powstaje tylko między klientem a partnerem przy wydaniu pojazdu.

2. Rezerwacja i płatność
2.1. Rezerwacja jest potwierdzona dopiero po zaksięgowaniu częściowej zaliczki. Wtedy otrzymujesz voucher.
2.2. Cena składa się z zaliczki serwisowej na platformie (nasza prowizja, nie pełny najem) oraz reszty płaconej partnerowi przy odbiorze.
2.3. Ceny ustalają partnerzy. Możemy poprawić oczywisty błąd techniczny przed potwierdzeniem.
2.4. Płatności idą w głównej walucie strony. Na miejscu może obowiązywać waluta lokalna po kursie.

3. Anulowanie i zwroty
3.1. Bezpłatne anulowanie: zaliczka wraca w całości (bez opłat przelewu), jeśli anulujesz co najmniej 5 dni przed odbiorem.
3.2. Anulowanie później niż 5 dni albo nieobecność bez powiadomienia (chyba że obejmuje to wykupiony dodatek) oznacza brak zwrotu zaliczki.
3.3. Jeśli partner nie może wydać auta, musi zaproponować klasę równą lub wyższą bez dopłaty. Gdy nie ma alternatywy, platforma zwraca zaliczkę. Nie odpowiadamy za niedopełnienie partnera, ale pomagamy klientowi.

4. Wymagania przy odbiorze
4.1. Minimalny wiek 21 lat i co najmniej 1 rok prawa jazdy, chyba że strona pojazdu stanowi inaczej. Auta premium mogą wymagać 25+.
4.2. Ważny paszport, uznawane krajowe prawo jazdy, międzynarodowe prawo jazdy gdy jest wymagane oraz karta na dane partnera, jeśli blokowany jest depozyt.
4.3. Partner może odmówić wydania, gdy brakuje wieku lub dokumentów albo kierowca jest pod wpływem alkoholu lub narkotyków. Zaliczka wtedy nie wraca.

5. Ubezpieczenie i stan pojazdu
5.1. Ochrona z ogłoszenia (OC, CDW, pełna) jest określona przez partnera i podlega limitom, wyłączeniom i udziałowi własnemu.
5.2. Po wypadku, szkodzie lub kradzieży natychmiast powiadom partnera i platformę, wezwij policję i uzyskaj protokół oraz nie opuszczaj miejsca bez zgody.
5.3. Partner wydaje czysty, sprawny pojazd. Zwracasz go w tym samym stanie, łącznie z paliwem i czystością.

6. Zakazy
Jazda pod wpływem alkoholu, narkotyków lub leków osłabiających reakcję; użycie niezgodne z prawem, wyścigi, holowanie lub wywóz z kraju bez pisemnej zgody; przekazanie osobie trzeciej spoza ubezpieczenia; zwierzęta bez zgody; wjazd na tereny zabronione przez właściciela.

7. Ograniczenie odpowiedzialności
7.1. Jako pośrednik nie odpowiadamy za wypadki, szkody, mandaty, urazy, spory między partnerem a klientem ani za pośrednie straty z powodu przerwy lub usterki.
7.2. Całkowita odpowiedzialność platformy nie przekracza zapłaconej zaliczki serwisowej.

8. Dane
Dane przetwarzamy według polityki prywatności. Korzystanie oznacza zgodę na przetwarzanie potrzebne do rezerwacji oraz, jeśli się nie sprzeciwisz, do marketingu.

9. Prawo
Obowiązuje właściwe prawo krajowe i normy międzynarodowe. Spory rozstrzyga właściwy sąd.

10. Zmiany
Możemy zmienić regulamin w dowolnej chwili. Zmiany obowiązują po publikacji. Dalsze korzystanie oznacza zgodę.`,
  tr: `Şartlar ve koşullar — RentAirportCars.com
Platformu kullanmadan önce bu şartları dikkatle okuyun.

1. Genel hükümler ve platformun rolü
1.1. Kimiz: RentAirportCars.com uluslararası bir çevrimiçi aracıdır. Müşterileri, özellikle havalimanları ve büyük şehirlerdeki yerel araç kiralama sağlayıcılarıyla buluştururuz.
1.2. Rolümüz: Platform yalnızca bağımsız aracıdır. Araçların sahibi, işletmecisi veya kiraya vereni değiliz. Her araç ortağa aittir ve ortak tarafından yönetilir.
1.3. Platformun sağladıkları: çevrimiçi rezervasyon araçları; ortakların ve araçların doğrulanması; peşin hizmet bedelinin güvenli tahsilatı; müşteri ile ortak arasındaki iletişime destek.
1.4. Hukuki kabul: Kayıt, rezervasyon veya hizmet kullanımı bu şartları okuduğunuzu ve kabul ettiğinizi gösterir. Asıl kiralama sözleşmesi yalnızca araç tesliminde müşteri ile ortak arasında kurulur.

2. Rezervasyon ve ödeme
2.1. Rezervasyon, kısmi peşin ödeme başarıyla işlendikten sonra kesinleşir. Ardından bir voucher alırsınız.
2.2. Toplam ücret iki parçadır: platform üzerinden ödenen peşin hizmet bedeli (aracılık komisyonumuzdur, kiranın tamamı değildir) ve teslimde ortağa, ilanda belirtilen yöntemle ödenen bakiye.
2.3. Fiyatları ortaklar belirler. Onaydan önce açık teknik veya fiyat hatalarını düzeltebiliriz.
2.4. İşlemler sitede gösterilen ana para birimindedir. Yerde ödeme, geçerli kura göre yerel para birimiyle yapılabilir.

3. İptal ve iade
3.1. Ücretsiz iptal: planlanan teslimden en az 5 gün önce iptal ederseniz peşin ödeme (havale komisyonları hariç) tam iade edilir.
3.2. Teslimden 5 günden kısa sürede iptal veya haber vermeden gelmeme (satın alınan bir ek hizmet bunu kapsamıyorsa) halinde peşin ödeme iade edilmez.
3.3. Ortak aracı sağlayamazsa ek ücret olmadan aynı veya daha üst sınıf önermelidir. Alternatif yoksa platform peşin ödemeyi tam iade eder. Ortağın yükümlülüğünü yerine getirmemesinden sorumlu değiliz; müşteriye mümkün olduğunca yardımcı oluruz.

4. Teslimde şartlar
4.1. Araç sayfasında başka bir şey yazmıyorsa asgari yaş 21 ve en az 1 yıl sürüş deneyimi gerekir. Bazı üst sınıf araçlarda 25+ istenebilir.
4.2. Geçerli pasaport, varış ülkesinde kabul edilen ulusal ehliyet, gerektiğinde uluslararası sürüş izni ve depozito blokesi için ortağın adına kart gösterilmelidir.
4.3. Yaş veya belgeler uygun değilse ya da sürücü alkol veya uyuşturucu etkisindeyse ortak aracı vermeyi reddedebilir. Bu durumda peşin ödeme iade edilmez.

5. Sigorta ve araç durumu
5.1. İlandaki güvence (TPL, CDW, tam güvence) ortağa aittir ve her zaman limit, istisna ve muafiyete tabidir.
5.2. Kaza, hasar veya hırsızlıkta ortağı ve platformu hemen bilgilendirmeli, polisi arayıp tutanak almalı ve izinsiz olay yerini terk etmemelisiniz.
5.3. Ortak temiz ve yolcuğu uygun bir araç teslim eder. Aracı aynı durumda, yakıt ve temizlik dahil, iade edersiniz.

6. Yasaklar
Alkol, uyuşturucu veya tepkiyi yavaşlatan ilaç etkisinde araç kullanmak; yasa dışı amaç, yarış, çekme veya yazılı izin olmadan ülkeden çıkarmak; sigortada olmayan üçüncü kişiye vermek; izinsiz evcil hayvan taşımak; sahibinin yasakladığı alanlara girmek yasaktır.

7. Sorumluluk sınırı
7.1. Aracı olarak kiralama sırasındaki kaza, hasar, ceza, yaralanma, ortak ile müşteri arasındaki uyuşmazlık veya kesinti ve teknik arızadan doğan dolaylı zarardan sorumlu değiliz.
7.2. Platformun toplam sorumluluğu, müşterinin ödediği peşin hizmet bedelini aşmaz.

8. Veriler
Kişisel verileri Gizlilik Politikasına göre işleriz. Platformu kullanmak, rezervasyonu tamamlamak için gerekli işlemeye ve e-posta aboneliğinden çıkmadıysanız pazarlamaya onay verdiğiniz anlamına gelir.

9. Uygulanacak hukuk
Bu şartlar ilgili ülke hukuku ve uluslararası normlara tabidir. Uyuşmazlıkları yetkili mahkeme çözer.

10. Değişiklikler
Şartları istediğimiz zaman değiştirebiliriz. Değişiklikler sitede yayımlandığında yürürlüğe girer. Sonrasında hizmeti kullanmak kabul anlamına gelir.`,
  ru: `Правила и условия — RentAirportCars.com
Пожалуйста, внимательно прочитайте эти правила перед использованием платформы.

1. Общие положения и роль платформы
1.1. Кто мы: RentAirportCars.com — международный онлайн-посредник. Мы связываем клиентов с местными прокатными компаниями, в основном в аэропортах и крупных городах.
1.2. Наша роль: платформа действует только как независимый посредник. Мы не владеем автомобилями, не эксплуатируем и не сдаём их. Каждый автомобиль принадлежит партнёру и управляется им.
1.3. Что даёт платформа: инструменты онлайн-бронирования; проверку партнёров и их автомобилей; безопасную обработку предоплаты за услугу; поддержку связи клиента и партнёра.
1.4. Соглашение: регистрация, бронирование или использование сервиса означает, что вы прочитали и приняли эти правила. Настоящий договор аренды заключается только между клиентом и партнёром в момент передачи автомобиля.

2. Бронирование и оплата
2.1. Бронь подтверждена только после успешной частичной предоплаты. После этого вы получаете ваучер.
2.2. Полная стоимость состоит из двух частей: предоплаты за услугу через платформу (наша комиссия посредника, а не вся аренда) и остатка, который платится партнёру при получении способом, указанным в объявлении.
2.3. Цены устанавливают партнёры. Мы можем исправить явную техническую или ценовую ошибку до подтверждения.
2.4. Платежи идут в основной валюте сайта. На месте может применяться местная валюта по действующему курсу.

3. Отмена и возврат
3.1. Бесплатная отмена: предоплата возвращается полностью (кроме комиссий перевода при оплате и возврате), если отмена сделана не менее чем за 5 дней до выдачи.
3.2. Отмена менее чем за 5 дней или неявка без предупреждения партнёра (если купленная доп. услуга этого не покрывает) — предоплата не возвращается.
3.3. Если партнёр не может выдать забронированный автомобиль, он обязан предложить равный или более высокий класс без доплаты. Если альтернативы нет, платформа полностью возвращает предоплату. Мы не отвечаем за неисполнение партнёром, но максимально помогаем клиенту.

4. Требования при получении
4.1. Минимальный возраст 21 год и стаж не менее 1 года, если на странице автомобиля не указано иное. Для части автомобилей премиум-класса может требоваться 25+.
4.2. Нужны действующий паспорт, национальные права, признаваемые в стране назначения, международное удостоверение, если национальные права не принимаются, и карта на имя партнёра, если блокируется депозит.
4.3. Партнёр может отказать в выдаче, если не соблюдены возраст или документы либо водитель находится в состоянии опьянения. Предоплата в этом случае не возвращается.

5. Страхование и состояние автомобиля
5.1. Тип страховки в объявлении (TPL, CDW, полная) определяет партнёр. Она всегда имеет лимиты, исключения и франшизу.
5.2. При аварии, повреждении или угоне нужно немедленно сообщить партнёру и платформе, вызвать полицию и получить протокол и не покидать место без разрешения.
5.3. Партнёр передаёт чистый исправный автомобиль. Клиент возвращает его в том же состоянии, включая топливо и чистоту.

6. Запрещено
Управлять автомобилем в состоянии алкогольного, наркотического или лекарственного опьянения, снижающего реакцию; использовать его незаконно, для гонок, буксировки или вывоза из страны без письменного согласия; передавать третьему лицу, не указанному в страховке; перевозить животных без разрешения; заезжать на территории, которые владелец внёс в запрещённый список.

7. Ограничение ответственности
7.1. Как посредник мы не отвечаем за аварии, ущерб, штрафы, вред здоровью в период аренды, споры между партнёром и клиентом и косвенные убытки из-за сбоя или технической ошибки.
7.2. В любом случае общая ответственность платформы не превышает уплаченную предоплату за услугу.

8. Данные
Мы обрабатываем персональные данные по Политике конфиденциальности. Использование платформы означает согласие на обработку для завершения брони и, если вы не отказались от рассылки, для маркетинга.

9. Право
Правила регулируются правом соответствующей страны с учётом международных норм. Споры рассматривает компетентный суд.

10. Изменения
Платформа может изменить правила в любое время. Изменения действуют с момента публикации. Дальнейшее использование означает согласие.`,
  ar: `الشروط والأحكام — RentAirportCars.com
يُرجى قراءة هذه الشروط بعناية قبل استخدام المنصة.

1. أحكام عامة ودور المنصة
1.1. من نحن: RentAirportCars.com وسيط إلكتروني دولي. نربط العملاء بمزودي تأجير محليين، خصوصًا في المطارات والمدن الكبرى.
1.2. دورنا: تعمل المنصة وسيطًا مستقلًا فقط. لسنا مالكين للمركبات ولا مشغّلين ولا مؤجّرين. كل مركبة يملكها الشريك ويديرها.
1.3. ما تقدمه المنصة: أدوات حجز إلكترونية، والتحقق من الشركاء ومركباتهم، ومعالجة آمنة للدفعة المقدمة، ودعم التواصل بين العميل والشريك.
1.4. الاتفاق: بالتسجيل أو الحجز أو استخدام الخدمة تؤكد أنك قرأت هذه الشروط وقبلتها. عقد الإيجار الفعلي ينشأ فقط بين العميل والشريك عند تسليم المركبة.

2. الحجز والدفع
2.1. يُعد الحجز مؤكدًا فقط بعد نجاح معالجة الدفعة المقدمة الجزئية، ثم تصلك قسيمة.
2.2. السعر الإجمالي جزءان: رسوم خدمة مقدمة عبر المنصة (عمولتنا وليست كامل الإيجار) والرصيد المتبقي يُدفع للشريك عند الاستلام بالطريقة المبينة في الإعلان.
2.3. الأسعار يحددها الشركاء. يجوز لنا تصحيح خطأ تقني أو سعري واضح قبل التأكيد.
2.4. تتم العمليات بالعملة الرئيسية الظاهرة في الموقع. قد يُستخدم الدفع المحلي بعملة البلد حسب سعر الصرف.

3. الإلغاء والاسترداد
3.1. إلغاء مجاني: تُرد الدفعة المقدمة كاملة (باستثناء عمولات التحويل) إذا أُلغي الحجز قبل موعد الاستلام بخمسة أيام على الأقل.
3.2. الإلغاء قبل أقل من خمسة أيام أو عدم الحضور دون إبلاغ الشريك (ما لم تغطِّ خدمة إضافية ذلك) يعني عدم رد الدفعة المقدمة.
3.3. إذا تعذر على الشريك توفير المركبة، يجب أن يعرض فئة مساوية أو أعلى دون تكلفة إضافية. وإن لم تتوفر بدائل، ترد المنصة الدفعة كاملة. لسنا مسؤولين عن إخلال الشريك، لكننا نساعد العميل قدر الإمكان.

4. متطلبات الاستلام
4.1. الحد الأدنى للعمر 21 سنة وخبرة قيادة سنة واحدة على الأقل، ما لم تذكر صفحة المركبة غير ذلك. قد تشترط بعض السيارات الفاخرة 25+.
4.2. يجب إبراز جواز سفر ساري، ورخصة قيادة وطنية مقبولة في بلد الوجهة، ورخصة دولية عند اللزوم، وبطاقة باسم الشريك إذا لزم حجز وديعة.
4.3. يجوز للشريك رفض التسليم إذا لم تُستوفَ السن أو الوثائق، أو إذا كان السائق تحت تأثير الكحول أو المخدرات. حينها لا تُرد الدفعة المقدمة.

5. التأمين وحالة المركبة
5.1. نوع التأمين في الإعلان (TPL أو CDW أو الشامل) يحدده الشريك ويخضع دائمًا للحدود والاستثناءات ونسبة التحمل.
5.2. بعد أي حادث أو ضرر أو سرقة يجب إبلاغ الشريك والمنصة فورًا، واستدعاء الشرطة وأخذ محضر، وعدم مغادرة المكان دون إذن.
5.3. يسلم الشريك مركبة نظيفة وسليمة. ويعيدها العميل بالحالة نفسها، بما في ذلك الوقود والنظافة.

6. المحظورات
يُحظر القيادة تحت تأثير الكحول أو المخدرات أو أدوية تضعف رد الفعل؛ والاستخدام غير المشروع أو السباق أو القطر أو إخراج المركبة من البلد دون موافقة خطية؛ وتسليمها لطرف ثالث غير مؤمَّن؛ ونقل الحيوانات دون إذن؛ ودخول مناطق حظرها المالك.

7. حد المسؤولية
7.1. بصفتنا وسيطًا لا نتحمل مسؤولية الحوادث أو الأضرار أو الغرامات أو الإصابات أو النزاعات بين الشريك والعميل أو الخسارة غير المباشرة بسبب انقطاع أو عطل تقني.
7.2. لا تتجاوز مسؤولية المنصة الإجمالية مبلغ الدفعة المقدمة التي دفعها العميل.

8. البيانات
نعالج البيانات الشخصية وفق سياسة الخصوصية. استخدام المنصة يعني الموافقة على المعالجة اللازمة لإتمام الحجز، وللتسويق ما لم ترفض الاشتراك بالبريد.

9. القانون
تخضع هذه الشروط لقانون البلد المعني والمعايير الدولية. تفصل المحكمة المختصة في النزاعات.

10. التغييرات
يجوز للمنصة تعديل هذه الشروط في أي وقت. يسري التعديل عند نشره. استمرار الاستخدام يعني القبول.`,
  zh: `条款与条件 — RentAirportCars.com
使用本平台前，请仔细阅读这些条款。

1. 总则与平台角色
1.1. 我们是谁：RentAirportCars.com 是国际在线中介。我们把客户与当地租车服务商连接起来，主要在机场和大城市。
1.2. 我们的角色：平台只作为独立中介。我们不拥有、不运营、也不出租车辆。每辆车都由合作方拥有并管理。
1.3. 平台提供：在线预订工具；合作方及其车辆的核验；预付服务费的安全处理；客户与合作方之间的沟通支持。
1.4. 法律同意：注册、预订或使用服务，即表示你已阅读并接受这些条款。真正的租车合同只在交车时于客户与合作方之间成立。

2. 预订与付款
2.1. 只有部分预付款成功处理后，预订才确认。之后你会收到凭证。
2.2. 总价分两部分：通过平台支付的预付服务费（这是我们的中介佣金，不是全部租金），以及取车时按信息所示方式直接付给合作方的余额（现金或银行卡）。
2.3. 价格由合作方制定。确认前我们可以更正明显的技术或价格错误。
2.4. 交易使用网站所示的主要货币。现场付款可能按适用汇率使用当地货币。

3. 取消与退款
3.1. 免费取消：若在计划取车前至少 5 天取消，预付款全额退还（付款或退款时的转账手续费除外）。
3.2. 延迟取消与未出现：若在取车前不足 5 天取消，或未出现且未通知合作方（除非你购买的附加服务涵盖此情况），预付款不退。
3.3. 若合作方无法提供所订车辆，必须无偿提供同级或更高级别车辆。若没有替代车辆，平台全额退还预付款。平台不对合作方的违约负责，但会尽可能帮助客户。

4. 取车要求
4.1. 除非车辆页面另有说明，最低年龄 21 岁，驾龄至少 1 年。部分高端车辆可能要求 25 岁以上。
4.2. 必须出示有效护照、目的地国家承认的本国驾照、在本国驾照不被承认时的国际驾照，以及在需要冻结押金时以合作方名义持有的信用卡或借记卡。
4.3. 若年龄或证件不符，或驾驶员处于酒精或药物影响下，合作方可以拒绝交车。此时预付款不退。

5. 保险与车辆状况
5.1. 信息中所示保险类型（第三者责任、车损、全险）由合作方确定，并始终受限额、除外责任和免赔额约束。
5.2. 发生事故、损坏或盗窃后，必须立即通知合作方和平台，报警并取得记录，未经允许不得离开现场。
5.3. 合作方应交付干净、可安全行驶并经过检查的车辆。客户应按接收时的状况归还，包括油量和清洁程度。

6. 禁止行为
不得在酒精、毒品或影响反应的药物作用下驾驶；不得用于非法目的、赛车、拖车，或未经书面同意把车开出国；不得把车交给未列入保险的第三人；未经许可不得携带宠物；不得进入车主列为禁止的区域。

7. 责任限制
7.1. 作为中介，我们对租期内的事故、损坏、罚款、乘客健康损害、合作方与客户之间的争议，以及因中断或技术故障造成的间接损失不承担责任。
7.2. 在任何情况下，平台的全部责任不超过客户已付的预付服务费。

8. 数据保护
我们按照隐私政策处理个人数据。使用平台即表示你同意为完成预订而处理数据；除非你拒绝邮件订阅，也同意用于营销。

9. 适用法律
本条款受相关国家法律及国际规范约束。争议由有管辖权的法院审理。

10. 变更
平台可随时修改这些条款。变更在网站公布后生效。此后继续使用即表示接受。`,
  ko: `이용약관 — RentAirportCars.com
플랫폼을 사용하기 전에 이 약관을 주의 깊게 읽어 주세요.

1. 총칙과 플랫폼의 역할
1.1. 우리는 누구인가: RentAirportCars.com은 국제 온라인 중개자입니다. 고객을 현지 렌터카 업체와 연결하며, 주로 공항과 큰 도시에서 이루어집니다.
1.2. 역할: 플랫폼은 독립 중개자일 뿐입니다. 차량을 소유하거나 운영하거나 대여하지 않습니다. 모든 차량은 파트너가 소유하고 관리합니다.
1.3. 제공 내용: 온라인 예약 도구, 파트너와 차량 확인, 선결제 서비스 요금의 안전한 처리, 고객과 파트너 사이 소통 지원.
1.4. 동의: 가입, 예약 또는 서비스 이용은 이 약관을 읽고 받아들였다는 뜻입니다. 실제 대여 계약은 차량을 인도할 때 고객과 파트너 사이에만 성립합니다.

2. 예약과 결제
2.1. 부분 선결제가 성공적으로 처리된 뒤에만 예약이 확정됩니다. 그다음 바우처를 받습니다.
2.2. 총액은 두 부분입니다. 플랫폼으로 내는 선결제 서비스 요금(중개 수수료이며 전체 대여료가 아님)과 픽업 때 파트너에게 안내에 적힌 방법으로 내는 잔액입니다.
2.3. 가격은 파트너가 정합니다. 확정 전에 명백한 기술·가격 오류를 고칠 수 있습니다.
2.4. 거래는 사이트에 표시된 기본 통화로 처리됩니다. 현장에서는 해당 환율의 현지 통화가 쓰일 수 있습니다.

3. 취소와 환불
3.1. 무료 취소: 예정된 픽업 최소 5일 전에 취소하면 선결제금이 전액 환불됩니다(송금 수수료 제외).
3.2. 픽업 5일 미만의 취소 또는 파트너에게 알리지 않은 노쇼(구매한 부가 서비스가 이를 포함하지 않는 한)는 선결제금이 환불되지 않습니다.
3.3. 파트너가 예약한 차량을 제공할 수 없으면 추가 비용 없이 같거나 더 높은 등급을 제안해야 합니다. 대안이 없으면 플랫폼이 선결제금을 전액 환불합니다. 파트너의 불이행에 대해 책임지지는 않지만 고객을 최대한 돕습니다.

4. 픽업 요건
4.1. 차량 페이지에 다른 내용이 없으면 최소 나이 21세, 운전 경력 1년입니다. 일부 고급 차량은 25세 이상일 수 있습니다.
4.2. 유효한 여권, 목적지 국가에서 인정되는 국내 면허, 필요할 때 국제 운전 허가, 보증금 동결이 필요하면 파트너 명의의 카드를 제시해야 합니다.
4.3. 나이·서류가 맞지 않거나 운전자가 음주·약물 상태이면 파트너는 인도를 거부할 수 있습니다. 이때 선결제금은 환불되지 않습니다.

5. 보험과 차량 상태
5.1. 안내에 적힌 보험(TPL, CDW, 완전)은 파트너가 정하며 한도, 면책, 자기부담금이 있습니다.
5.2. 사고, 손상, 도난이 있으면 파트너와 플랫폼에 즉시 알리고, 경찰을 불러 기록을 받고, 허락 없이 현장을 떠나면 안 됩니다.
5.3. 파트너는 깨끗하고 운행 가능한 차량을 넘깁니다. 고객은 연료와 청결을 포함해 받은 상태 그대로 돌려줍니다.

6. 금지
반응을 떨어뜨리는 술, 약물, 약 복용 상태의 운전, 불법 목적·경주·견인·서면 동의 없는 국외 반출, 보험에 없는 제3자에게 맡기기, 허가 없는 반려동물, 소유자가 금지한 구역 진입은 금지입니다.

7. 책임 제한
7.1. 중개자로서 대여 중 사고, 손상, 벌금, 부상, 파트너와 고객의 분쟁, 중단이나 기술 오류로 인한 간접 손해에 책임지지 않습니다.
7.2. 어떤 경우에도 플랫폼의 총책임은 고객이 낸 선결제 서비스 요금을 넘지 않습니다.

8. 데이터
개인정보는 개인정보 처리방침에 따라 처리합니다. 플랫폼 이용은 예약 완료에 필요한 처리와, 메일 수신을 거부하지 않았다면 마케팅에도 동의한다는 뜻입니다.

9. 준거법
이 약관은 해당 국가 법률과 국제 규범을 따릅니다. 분쟁은 관할 법원이 판단합니다.

10. 변경
플랫폼은 언제든지 약관을 바꿀 수 있습니다. 변경은 웹사이트에 게시되는 즉시 효력이 있습니다. 그 후 이용은 동의를 의미합니다.`,
  th: `ข้อกำหนดและเงื่อนไข — RentAirportCars.com
โปรดอ่านข้อกำหนดนี้อย่างละเอียดก่อนใช้แพลตฟอร์ม

1. บททั่วไปและบทบาทของแพลตฟอร์ม
1.1. เราคือใคร: RentAirportCars.com เป็นตัวกลางออนไลน์ระหว่างประเทศ เราเชื่อมลูกค้ากับผู้ให้เช่ารถท้องถิ่น โดยเฉพาะที่สนามบินและเมืองใหญ่
1.2. บทบาทของเรา: แพลตฟอร์มทำหน้าที่เป็นตัวกลางอิสระเท่านั้น เราไม่ได้เป็นเจ้าของ ดำเนินการ หรือให้เช่ารถ รถทุกคันเป็นของพาร์ทเนอร์และบริหารโดยพาร์ทเนอร์
1.3. สิ่งที่แพลตฟอร์มให้: เครื่องมือจองออนไลน์ การตรวจสอบพาร์ทเนอร์และรถ การรับเงินล่วงหน้าอย่างปลอดภัย และการช่วยสื่อสารระหว่างลูกค้ากับพาร์ทเนอร์
1.4. ข้อตกลง: การลงทะเบียน จอง หรือใช้บริการ หมายความว่าคุณอ่านและยอมรับข้อกำหนดนี้ สัญญาเช่าจริงเกิดขึ้นระหว่างลูกค้ากับพาร์ทเนอร์ตอนส่งมอบรถเท่านั้น

2. การจองและการชำระเงิน
2.1. การจองยืนยันเมื่อชำระเงินล่วงหน้าบางส่วนสำเร็จ แล้วคุณจะได้บัตรยืนยัน
2.2. ราคาทั้งหมดมีสองส่วน: ค่าบริการล่วงหน้าที่จ่ายผ่านแพลตฟอร์ม (ค่าคอมมิชชันของเรา ไม่ใช่ค่าเช่าทั้งหมด) และยอดที่เหลือจ่ายให้พาร์ทเนอร์ตอนรับรถตามวิธีในประกาศ
2.3. พาร์ทเนอร์เป็นผู้ตั้งราคา เราอาจแก้ข้อผิดพลาดทางเทคนิคหรือราคาที่ชัดเจนก่อนยืนยัน
2.4. ธุรกรรมใช้สกุลเงินหลักบนเว็บไซต์ การจ่ายหน้างานอาจใช้สกุลเงินท้องถิ่นตามอัตราแลกเปลี่ยน

3. การยกเลิกและการคืนเงิน
3.1. ยกเลิกฟรี: คืนเงินล่วงหน้าเต็มจำนวน (ยกเว้นค่าธรรมเนียมโอน) หากยกเลิกอย่างน้อย 5 วันก่อนเวลารับรถ
3.2. หากยกเลิกน้อยกว่า 5 วัน หรือไม่มาโดยไม่แจ้งพาร์ทเนอร์ (เว้นแต่บริการเสริมที่ซื้อครอบคลุม) เงินล่วงหน้าไม่คืน
3.3. หากพาร์ทเนอร์จัดรถที่จองไม่ได้ ต้องเสนอรถระดับเดียวกันหรือสูงกว่าโดยไม่คิดเพิ่ม หากไม่มีทางเลือก แพลตฟอร์มคืนเงินล่วงหน้าเต็มจำนวน เราไม่รับผิดต่อการไม่ปฏิบัติของพาร์ทเนอร์ แต่จะช่วยลูกค้าเท่าที่ทำได้

4. ข้อกำหนดตอนรับรถ
4.1. อายุขั้นต่ำ 21 ปี และประสบการณ์ขับขี่อย่างน้อย 1 ปี เว้นแต่หน้ารถระบุไว้เป็นอย่างอื่น รถระดับพรีเมียมบางคันอาจต้องอายุ 25+
4.2. ต้องแสดงพาสปอร์ตที่ใช้ได้ ใบขับขี่ที่ประเทศปลายทางยอมรับ ใบขับขี่สากลเมื่อจำเป็น และบัตรในชื่อพาร์ทเนอร์หากต้องอายัดมัดจำ
4.3. พาร์ทเนอร์อาจปฏิเสธการส่งรถหากอายุหรือเอกสารไม่ครบ หรือผู้ขับอยู่ภายใต้อิทธิพลของแอลกอฮอล์หรือยา เงินล่วงหน้าจะไม่คืน

5. ประกันและสภาพรถ
5.1. ประเภทประกันในประกาศ (TPL, CDW, เต็มรูปแบบ) กำหนดโดยพาร์ทเนอร์ และมีวงเงิน ข้อยกเว้น และความเสียหายส่วนแรกเสมอ
5.2. เมื่อเกิดอุบัติเหตุ ความเสียหาย หรือการโจรกรรม ต้องแจ้งพาร์ทเนอร์และแพลตฟอร์มทันที เรียกตำรวจและรับรายงาน และไม่ออกจากที่เกิดเหตุโดยไม่ได้รับอนุญาต
5.3. พาร์ทเนอร์ต้องส่งรถที่สะอาดและพร้อมใช้ ลูกค้าต้องคืนในสภาพเดิม รวมระดับน้ำมันและความสะอาด

6. สิ่งที่ห้าม
ห้ามขับขณะเมาสุรา ยาเสพติด หรือยาที่ทำให้ปฏิกิริยาช้า ห้ามใช้ผิดกฎหมาย แข่งรถ ลากจูง หรือนำออกนอกประเทศโดยไม่ได้รับความยินยอมเป็นลายลักษณ์อักษร ห้ามมอบให้บุคคลที่สามที่ไม่อยู่ในประกัน ห้ามนำสัตว์เลี้ยงโดยไม่ได้รับอนุญาต และห้ามเข้าพื้นที่ที่เจ้าของระบุว่าห้าม

7. การจำกัดความรับผิด
7.1. ในฐานะตัวกลาง เราไม่รับผิดต่ออุบัติเหตุ ความเสียหาย ค่าปรับ การบาดเจ็บ ข้อพิพาทระหว่างพาร์ทเนอร์กับลูกค้า หรือความเสียหายทางอ้อมจากการหยุดชะงักหรือข้อขัดข้องทางเทคนิค
7.2. ความรับผิดทั้งหมดของแพลตฟอร์มไม่เกินเงินค่าบริการล่วงหน้าที่ลูกค้าจ่าย

8. ข้อมูล
เราประมวลผลข้อมูลส่วนบุคคลตามนโยบายความเป็นส่วนตัว การใช้แพลตฟอร์มหมายถึงคุณยอมรับการประมวลผลเพื่อทำการจอง และเพื่อการตลาดหากคุณไม่ปฏิเสธการรับอีเมล

9. กฎหมาย
ข้อกำหนดนี้อยู่ภายใต้กฎหมายของประเทศที่เกี่ยวข้องและบรรทัดฐานระหว่างประเทศ ข้อพิพาทพิจารณาโดยศาลที่มีเขตอำนาจ

10. การเปลี่ยนแปลง
แพลตฟอร์มอาจเปลี่ยนข้อกำหนดได้ทุกเมื่อ การเปลี่ยนแปลงมีผลเมื่อเผยแพร่บนเว็บไซต์ การใช้บริการต่อไปหมายถึงการยอมรับ`,
};

const PRIVACY: Partial<Record<Locale, string>> = {
  en: `Privacy Policy
This policy explains how RentAirportCars.com (“we”) collects, uses, and protects your personal data when you use the website and book a car. By using the platform you agree to this processing.

1. What we collect
We collect only what is needed for a safe booking: name, email, and phone; passport and driving-licence details required by the partner to form the contract; payment status and history (full card data such as the CVV are not stored by us — payments are handled by a licensed provider); technical data such as IP address, browser type, and visit history to improve the service.

2. Why we use it
To pass your request to the chosen partner so the car can be ready at the airport; to send confirmation, vouchers, and important notices; to provide support; and to prevent fraud and protect the platform.

3. Who we share it with
We do not sell your personal data. We share it only with partners, and only what is needed to prepare the car and meet you (name, phone, flight details); with payment providers to complete the transaction; and with authorities when the law, a court, or an official body requires it.

4. Security
We use current technical and organisational measures, including SSL encryption, to protect data from unauthorised access, alteration, or destruction.

5. Your rights
You may ask what data we process about you, ask us to correct inaccurate or outdated data, and ask for deletion (“right to be forgotten”), except where the law requires us to keep it, for example for accounting.

6. Changes
We may update this policy when needed. Changes apply when published on the website.

7. Contact
Questions about this policy or your data rights: contact us by email at the address published on the site.`,
  de: `Datenschutzerklärung
Diese Erklärung beschreibt, wie RentAirportCars.com („wir“) personenbezogene Daten erhebt, nutzt und schützt, wenn Sie die Website nutzen und ein Auto buchen. Mit der Nutzung stimmen Sie dieser Verarbeitung zu.

1. Welche Daten
Wir erheben nur das Nötige: Name, E-Mail und Telefon; Pass- und Führerscheindaten, die der Partner für den Vertrag braucht; Zahlungsstatus und -historie (vollständige Kartendaten wie die CVV speichern wir nicht — Zahlungen laufen über einen lizenzierten Anbieter); technische Daten wie IP-Adresse, Browsertyp und Besuchsverlauf zur Verbesserung des Dienstes.

2. Wozu
Um Ihre Anfrage an den Partner weiterzugeben, damit das Auto am Flughafen bereitsteht; um Bestätigung, Voucher und wichtige Hinweise zu senden; für den Support; und um Betrug zu verhindern.

3. Weitergabe
Wir verkaufen Ihre Daten nicht. Wir geben sie nur an Partner weiter, und nur soweit nötig (Name, Telefon, Flugdaten); an Zahlungsdienstleister; und an Behörden, wenn Gesetz, Gericht oder eine amtliche Stelle es verlangt.

4. Sicherheit
Wir nutzen aktuelle technische und organisatorische Maßnahmen einschließlich SSL-Verschlüsselung gegen unbefugten Zugriff, Änderung oder Löschung.

5. Ihre Rechte
Sie können Auskunft verlangen, unrichtige Daten berichtigen lassen und Löschung verlangen, außer wenn das Gesetz die Aufbewahrung vorschreibt, etwa für die Buchhaltung.

6. Änderungen
Wir können diese Erklärung bei Bedarf aktualisieren. Änderungen gelten mit Veröffentlichung.

7. Kontakt
Fragen zu dieser Erklärung oder Ihren Rechten: schreiben Sie uns an die auf der Website genannte E-Mail.`,
  es: `Política de privacidad
Esta política explica cómo RentAirportCars.com («nosotros») recoge, usa y protege sus datos al usar el sitio y reservar un coche. Al usar la plataforma acepta este tratamiento.

1. Qué recogemos
Solo lo necesario: nombre, correo y teléfono; datos de pasaporte y permiso que el socio necesita para el contrato; estado e historial de pago (no guardamos datos completos de la tarjeta, como el CVV; los cobra un proveedor autorizado); datos técnicos como IP, tipo de navegador e historial de visitas para mejorar el servicio.

2. Para qué
Para transmitir su solicitud al socio y preparar el coche en el aeropuerto; para enviar confirmación, vales y avisos; para dar soporte; y para prevenir el fraude.

3. Con quién lo compartimos
No vendemos sus datos. Solo los compartimos con socios en lo imprescindible (nombre, teléfono, vuelo); con proveedores de pago; y con autoridades cuando la ley, un tribunal o un organismo oficial lo exija.

4. Seguridad
Usamos medidas técnicas y organizativas actuales, incluido el cifrado SSL, frente al acceso, la alteración o la destrucción no autorizados.

5. Sus derechos
Puede pedir qué datos tratamos, corregir datos inexactos y solicitar la supresión, salvo cuando la ley obligue a conservarlos, por ejemplo para contabilidad.

6. Cambios
Podemos actualizar esta política. Los cambios rigen al publicarse.

7. Contacto
Preguntas sobre esta política o sus derechos: escríbanos al correo publicado en el sitio.`,
  fr: `Politique de confidentialité
Cette politique explique comment RentAirportCars.com (« nous ») collecte, utilise et protège vos données lorsque vous utilisez le site et réservez une voiture. En utilisant la plateforme, vous acceptez ce traitement.

1. Ce que nous collectons
Uniquement le nécessaire : nom, e-mail et téléphone ; données de passeport et de permis exigées par le partenaire pour le contrat ; statut et historique de paiement (nous ne stockons pas les données complètes de carte, comme le CVV — un prestataire agréé traite le paiement) ; données techniques telles que l’adresse IP, le navigateur et l’historique de visite pour améliorer le service.

2. Pourquoi
Pour transmettre votre demande au partenaire afin que la voiture soit prête à l’aéroport ; pour envoyer confirmation, vouchers et avis importants ; pour le support ; et pour prévenir la fraude.

3. Partage
Nous ne vendons pas vos données. Nous les partageons seulement avec les partenaires, dans la mesure nécessaire (nom, téléphone, vol) ; avec les prestataires de paiement ; et avec les autorités lorsque la loi, un tribunal ou un organisme officiel l’exige.

4. Sécurité
Nous utilisons des mesures techniques et organisationnelles actuelles, dont le chiffrement SSL, contre l’accès, la modification ou la destruction non autorisés.

5. Vos droits
Vous pouvez demander quelles données nous traitons, faire corriger des données inexactes et demander l’effacement, sauf si la loi impose de les conserver, par exemple pour la comptabilité.

6. Modifications
Nous pouvons mettre à jour cette politique. Les changements s’appliquent dès la publication.

7. Contact
Questions sur cette politique ou vos droits : écrivez-nous à l’adresse publiée sur le site.`,
  it: `Informativa sulla privacy
Questa informativa spiega come RentAirportCars.com («noi») raccoglie, usa e protegge i dati personali quando usi il sito e prenoti un’auto. Usando la piattaforma accetti questo trattamento.

1. Cosa raccogliamo
Solo il necessario: nome, email e telefono; dati di passaporto e patente richiesti dal partner per il contratto; stato e storico dei pagamenti (i dati completi della carta, come il CVV, non sono conservati da noi: li tratta un fornitore autorizzato); dati tecnici come IP, browser e cronologia delle visite per migliorare il servizio.

2. Perché
Per passare la richiesta al partner così che l’auto sia pronta in aeroporto; per inviare conferma, voucher e avvisi; per l’assistenza; e per prevenire le frodi.

3. Con chi li condividiamo
Non vendiamo i dati. Li condividiamo solo con i partner, per quanto serve (nome, telefono, volo); con i fornitori di pagamento; e con le autorità quando la legge, un tribunale o un organo ufficiale lo richiede.

4. Sicurezza
Usiamo misure tecniche e organizzative aggiornate, compreso il cifratura SSL, contro accesso, modifica o distruzione non autorizzati.

5. I tuoi diritti
Puoi chiedere quali dati trattiamo, correggere dati inesatti e chiedere la cancellazione, salvo quando la legge impone di conservarli, per esempio per la contabilità.

6. Modifiche
Possiamo aggiornare questa informativa. Le modifiche valgono dalla pubblicazione.

7. Contatto
Domande su questa informativa o sui tuoi diritti: scrivici all’email pubblicata sul sito.`,
  nl: `Privacybeleid
Dit beleid legt uit hoe RentAirportCars.com („wij”) persoonsgegevens verzamelt, gebruikt en beschermt wanneer u de site gebruikt en een auto boekt. Door het platform te gebruiken stemt u in met deze verwerking.

1. Wat we verzamelen
Alleen wat nodig is: naam, e-mail en telefoon; paspoort- en rijbewijsgegevens die de partner voor het contract nodig heeft; betaalstatus en -historie (volledige kaartgegevens zoals de CVV bewaren wij niet — een vergunde aanbieder verwerkt de betaling); technische gegevens zoals IP-adres, browsertype en bezoekgeschiedenis om de dienst te verbeteren.

2. Waarom
Om uw verzoek aan de partner door te geven zodat de auto op de luchthaven klaarstaat; om bevestiging, vouchers en belangrijke berichten te sturen; voor ondersteuning; en om fraude te voorkomen.

3. Met wie we delen
Wij verkopen uw gegevens niet. We delen ze alleen met partners, en alleen wat nodig is (naam, telefoon, vlucht); met betaaldienstverleners; en met autoriteiten wanneer de wet, een rechter of een officiële instantie dat eist.

4. Beveiliging
Wij gebruiken actuele technische en organisatorische maatregelen, waaronder SSL-versleuteling, tegen ongeoorloofde toegang, wijziging of vernietiging.

5. Uw rechten
U kunt opvragen welke gegevens wij verwerken, onjuiste gegevens laten corrigeren en verwijdering vragen, behalve wanneer de wet bewaring verplicht, bijvoorbeeld voor de boekhouding.

6. Wijzigingen
Wij kunnen dit beleid bijwerken. Wijzigingen gelden na publicatie.

7. Contact
Vragen over dit beleid of uw rechten: mail ons op het adres dat op de site staat.`,
  pl: `Polityka prywatności
Ta polityka wyjaśnia, jak RentAirportCars.com („my”) zbiera, wykorzystuje i chroni dane osobowe, gdy korzystasz ze strony i rezerwujesz auto. Korzystanie z platformy oznacza zgodę na to przetwarzanie.

1. Co zbieramy
Tylko to, co potrzebne: imię, e-mail i telefon; dane paszportu i prawa jazdy wymagane przez partnera do umowy; status i historię płatności (pełnych danych karty, np. CVV, nie przechowujemy — płatność obsługuje licencjonowany dostawca); dane techniczne, takie jak adres IP, typ przeglądarki i historia wizyt, aby ulepszać usługę.

2. Po co
Aby przekazać zgłoszenie partnerowi i przygotować auto na lotnisku; aby wysłać potwierdzenie, vouchery i ważne komunikaty; aby świadczyć wsparcie; oraz aby zapobiegać oszustwom.

3. Komu przekazujemy
Nie sprzedajemy danych. Przekazujemy je tylko partnerom w niezbędnym zakresie (imię, telefon, lot); dostawcom płatności; oraz organom, gdy wymaga tego prawo, sąd lub urząd.

4. Bezpieczeństwo
Stosujemy aktualne środki techniczne i organizacyjne, w tym szyfrowanie SSL, przed nieuprawnionym dostępem, zmianą lub zniszczeniem.

5. Twoje prawa
Możesz zapytać, jakie dane przetwarzamy, poprawić dane nieaktualne i żądać usunięcia, poza przypadkami, gdy prawo nakazuje je zachować, np. dla księgowości.

6. Zmiany
Możemy zaktualizować tę politykę. Zmiany obowiązują po publikacji.

7. Kontakt
Pytania o tę politykę lub prawa do danych: napisz na adres e-mail podany na stronie.`,
  tr: `Gizlilik politikası
Bu politika, web sitesini kullanırken ve araç rezervasyonu yaparken RentAirportCars.com’un («biz») kişisel verilerinizi nasıl topladığını, kullandığını ve koruduğunu açıklar. Platformu kullanarak bu işlemeyi kabul edersiniz.

1. Neleri toplarız
Yalnızca güvenli rezervasyon için gerekenleri: ad, e-posta ve telefon; ortağın sözleşmeyi kurması için gerekli pasaport ve ehliyet bilgileri; ödeme durumu ve geçmişi (CVV gibi tam kart verileri bizde saklanmaz — ödemeyi lisanslı bir sağlayıcı işler); hizmeti iyileştirmek için IP adresi, tarayıcı türü ve ziyaret geçmişi gibi teknik veriler.

2. Neden kullanırız
Talebinizi seçilen ortağa iletmek ve aracın havalimanında hazır olmasını sağlamak; onay, voucher ve önemli bildirimleri göndermek; destek vermek; dolandırıcılığı önlemek ve platformu korumak için.

3. Kimlerle paylaşırız
Kişisel verilerinizi satmayız. Yalnızca aracı hazırlamak ve sizi karşılamak için gerekli ölçüde ortaklarla (ad, telefon, uçuş); işlemi tamamlamak için ödeme sağlayıcılarıyla; yasa, mahkeme veya resmi kurum istediğinde yetkililerle paylaşırız.

4. Güvenlik
Yetkisiz erişim, değişiklik veya yok etmeye karşı SSL şifreleme dahil güncel teknik ve idari önlemler kullanırız.

5. Haklarınız
Hakkınızda hangi verileri işlediğimizi sorabilir, yanlış veya eski verilerin düzeltilmesini isteyebilir ve yasanın saklamayı zorunlu kıldığı haller (örneğin muhasebe) dışında silinmesini («unutulma hakkı») talep edebilirsiniz.

6. Değişiklikler
Bu politikayı gerektiğinde güncelleyebiliriz. Değişiklikler sitede yayımlandığında yürürlüğe girer.

7. İletişim
Bu politika veya veri haklarınız hakkında sorularınız için sitede yayımlanan e-posta adresinden bize yazın.`,
  ru: `Политика конфиденциальности
Настоящая политика объясняет, как RentAirportCars.com («мы») собирает, использует и защищает персональные данные при использовании сайта и бронировании автомобиля. Используя платформу, вы соглашаетесь на такую обработку.

1. Какие данные мы собираем
Только минимум, нужный для безопасного бронирования: имя, фамилия, электронная почта и телефон; паспортные данные и данные водительского удостоверения, необходимые партнёру для договора; статус и историю платежей (полные данные карты, например CVV, у нас не хранятся — платёж обрабатывает лицензированный провайдер); технические данные: IP-адрес, тип браузера и история посещений для улучшения сервиса.

2. Зачем мы их используем
Чтобы передать запрос выбранному партнёру и подготовить автомобиль в аэропорту; чтобы отправить подтверждение, ваучеры и важные уведомления; чтобы оказать поддержку; чтобы предотвращать мошенничество и защищать платформу.

3. Кому мы передаём данные
Мы не продаём персональные данные. Передача происходит только партнёрам в объёме, нужном для подготовки машины и встречи (имя, телефон, данные рейса); платёжным провайдерам для проведения операции; и государственным органам, если этого требует закон, суд или официальный орган.

4. Безопасность
Мы применяем современные технические и организационные меры, включая шифрование SSL, чтобы защитить данные от несанкционированного доступа, изменения или уничтожения.

5. Ваши права
Вы можете запросить, какие данные мы обрабатываем, потребовать исправления неверных или устаревших данных и потребовать удаления («право на забвение»), кроме случаев, когда закон обязывает хранить их, например для бухгалтерии.

6. Изменения
Мы можем обновлять эту политику. Изменения действуют с момента публикации на сайте.

7. Контакты
Вопросы об этой политике или о правах на данные: напишите на электронную почту, указанную на сайте.`,
  ar: `سياسة الخصوصية
توضح هذه السياسة كيف تجمع RentAirportCars.com («نحن») بياناتك الشخصية وتستخدمها وتحميها عند استخدام الموقع وحجز سيارة. باستخدام المنصة توافق على هذه المعالجة.

1. ماذا نجمع
الحد الأدنى اللازم للحجز الآمن فقط: الاسم والبريد والهاتف؛ بيانات جواز السفر ورخصة القيادة التي يحتاجها الشريك للعقد؛ حالة الدفع وسجله (لا نخزن بيانات البطاقة الكاملة مثل رمز CVV — يعالج الدفع مزود مرخّص)؛ بيانات تقنية مثل عنوان IP ونوع المتصفح وسجل الزيارة لتحسين الخدمة.

2. لماذا نستخدمها
لنقل طلبك إلى الشريك المختار وتجهيز السيارة في المطار؛ ولإرسال التأكيد والقسائم والإشعارات المهمة؛ ولتقديم الدعم؛ ولمنع الاحتيال وحماية المنصة.

3. مع من نشاركها
لا نبيع بياناتك الشخصية. نشاركها فقط مع الشركاء بالقدر اللازم لتجهيز السيارة ولقائك (الاسم والهاتف وتفاصيل الرحلة)؛ ومع مزودي الدفع؛ ومع الجهات الرسمية عندما يطلب القانون أو المحكمة أو جهة رسمية ذلك.

4. الأمان
نستخدم تدابير تقنية وتنظيمية حديثة، بما فيها تشفير SSL، لحماية البيانات من الوصول أو التعديل أو الإتلاف غير المصرح به.

5. حقوقك
يحق لك أن تسأل عن البيانات التي نعالجها عنك، وأن تطلب تصحيح البيانات غير الدقيقة، وأن تطلب الحذف («الحق في النسيان»)، إلا حيث يلزمنا القانون بالاحتفاظ بها، مثل المحاسبة.

6. التغييرات
يجوز لنا تحديث هذه السياسة عند الحاجة. تسري التغييرات عند نشرها على الموقع.

7. الاتصال
للأسئلة عن هذه السياسة أو حقوق بياناتك: راسلنا على البريد المنشور في الموقع.`,
  zh: `隐私政策
本政策说明 RentAirportCars.com（“我们”）在你使用网站并预订车辆时如何收集、使用和保护个人数据。使用平台即表示你同意按本政策处理数据。

1. 我们收集哪些数据
我们只收集安全完成预订所必需的最少信息：姓名、电子邮箱和电话；合作方签订合同所需的护照和驾照信息；支付状态和支付记录（卡的完整机密数据，例如 CVV，不由我们保存——支付由持牌支付机构处理）；用于改进服务的技术数据，如 IP 地址、浏览器类型和访问记录。

2. 我们为何使用
把你的需求转给选定的合作方，以便在机场迎接并提供车辆；发送确认、凭证和重要通知；提供客户支持并及时处理问题；防范欺诈并保护平台安全。

3. 我们与谁共享
我们严格保护你的隐私，不出售或转让个人数据。仅在明确情形下共享：与合作方共享准备车辆和机场交付所必需的信息（姓名、联系电话、航班信息）；与支付机构共享以安全完成交易；在现行法律、法院命令或官方机关要求时依法提供。

4. 数据安全
我们采用包括 SSL 加密在内的现行技术和组织措施，防止未经授权的访问、篡改或销毁。

5. 你的权利
你有权了解我们处理你的哪些数据；要求更正错误或过时的数据；要求删除（“被遗忘权”），但法律要求保留的情形除外，例如会计义务。

6. 政策变更
我们可在需要时更新本隐私政策。变更在网站公布后生效。

7. 联系方式
如对本政策或你的数据权利有疑问，请通过网站公布的电子邮箱与我们联系。`,
  ko: `개인정보 처리방침
이 방침은 웹사이트를 이용하고 차량을 예약할 때 RentAirportCars.com(«우리»)이 개인정보를 어떻게 수집·이용·보호하는지 설명합니다. 플랫폼을 이용하면 이 처리에 동의하는 것입니다.

1. 수집 항목
안전한 예약에 필요한 최소한만 수집합니다. 이름, 이메일, 전화; 파트너가 계약에 필요한 여권과 운전면허 정보; 결제 상태와 이력(CVV 같은 카드 전체 정보는 우리가 보관하지 않으며 면허 있는 결제사가 처리합니다); 서비스 개선을 위한 IP, 브라우저 종류, 방문 기록 같은 기술 정보.

2. 이용 목적
요청을 선택한 파트너에게 전달해 공항에서 차량을 준비하기 위해; 확인, 바우처, 중요 알림을 보내기 위해; 지원을 위해; 사기를 막고 플랫폼을 보호하기 위해.

3. 공유 대상
개인정보를 판매하지 않습니다. 차량 준비와 미팅에 필요한 범위에서만 파트너와(이름, 전화, 항공편), 결제 처리사와, 법률·법원·공식 기관이 요구할 때 당국과 공유합니다.

4. 보안
무단 접근, 변경, 파기를 막기 위해 SSL 암호화를 포함한 현재의 기술적·관리적 조치를 사용합니다.

5. 권리
우리가 처리하는 정보를 요청하고, 틀리거나 오래된 정보의 정정을 요구하고, 법이 보관을 강제하는 경우(예: 회계)를 제외하고 삭제를 요구할 수 있습니다.

6. 변경
필요하면 이 방침을 업데이트합니다. 변경은 웹사이트에 게시될 때 효력이 있습니다.

7. 연락
이 방침이나 정보 권리에 대한 질문: 사이트에 게시된 이메일로 연락해 주세요.`,
  th: `นโยบายความเป็นส่วนตัว
นโยบายนี้อธิบายว่า RentAirportCars.com («เรา») เก็บ ใช้ และปกป้องข้อมูลส่วนบุคคลอย่างไรเมื่อคุณใช้เว็บไซต์และจองรถ การใช้แพลตฟอร์มหมายถึงคุณยอมรับการประมวลผลนี้

1. เราเก็บอะไร
เฉพาะข้อมูลที่จำเป็นต่อการจองที่ปลอดภัย: ชื่อ อีเมล และโทรศัพท์ ข้อมูลพาสปอร์ตและใบขับขี่ที่พาร์ทเนอร์ต้องใช้ทำสัญญา สถานะและประวัติการชำระเงิน (เราไม่เก็บข้อมูลบัตรเต็ม เช่น CVV — ผู้ให้บริการที่ได้รับอนุญาตเป็นผู้ประมวลผล) ข้อมูลทางเทคนิค เช่น IP ประเภทเบราว์เซอร์ และประวัติการเข้าชมเพื่อปรับปรุงบริการ

2. ใช้เพื่ออะไร
เพื่อส่งคำขอให้พาร์ทเนอร์ที่เลือกและเตรียมรถที่สนามบิน เพื่อส่งการยืนยัน บัตรยืนยัน และประกาศสำคัญ เพื่อให้การสนับสนุน และเพื่อป้องกันการทุจริตและปกป้องแพลตฟอร์ม

3. เราแบ่งปันกับใคร
เราไม่ขายข้อมูลส่วนบุคคล เราแบ่งปันเฉพาะกับพาร์ทเนอร์เท่าที่จำเป็นต่อการเตรียมรถและพบคุณ (ชื่อ โทรศัพท์ รายละเอียดเที่ยวบิน) กับผู้ให้บริการชำระเงิน และกับหน่วยงานเมื่อกฎหมาย ศาล หรือหน่วยงานทางการกำหนด

4. ความปลอดภัย
เราใช้มาตรการทางเทคนิคและองค์กรที่ทันสมัย รวมการเข้ารหัส SSL เพื่อป้องกันการเข้าถึง เปลี่ยนแปลง หรือทำลายโดยไม่ได้รับอนุญาต

5. สิทธิของคุณ
คุณขอทราบได้ว่าเราประมวลผลข้อมูลใด ขอให้แก้ข้อมูลที่ผิดหรือล้าสมัย และขอให้ลบ เว้นแต่กฎหมายบังคับให้เก็บไว้ เช่น เพื่อการบัญชี

6. การเปลี่ยนแปลง
เราอาจอัปเดตนโยบายนี้เมื่อจำเป็น การเปลี่ยนแปลงมีผลเมื่อเผยแพร่บนเว็บไซต์

7. ติดต่อ
หากมีคำถามเกี่ยวกับนโยบายนี้หรือสิทธิในข้อมูล โปรดติดต่ออีเมลที่เผยแพร่บนเว็บไซต์`,
};

function isGeorgian(text: string) {
  return /[ა-ჰ]/.test(text);
}

export function legalDocument(kind: Kind, locale: string, storedBody: string): string {
  const stored = String(storedBody || "").trim();
  const pack = kind === "terms" ? TERMS : PRIVACY;
  if (locale === "ka") return stored || pack.en || "";
  if (stored && !isGeorgian(stored) && locale === "en") return stored;
  const translated = pack[locale as Locale];
  if (translated && translated.trim()) return translated;
  return pack.en || stored;
}
