import { isLocale, type Locale } from "./config";
import { businessPartnershipExtras } from "./business-partnership-extra";

export type BusinessPartnershipCopy = {
  heroTitle: string;
  heroBody: string;
  register: string;
  glanceTitle: string;
  glanceBody: string;
  programTitle: string;
  programIntro: string;
  programPoints: string[];
  advantagesTitle: string;
  advantagesIntro: string;
  advantages: Array<{ title: string; body: string }>;
  bannerTitle: string;
  bannerBody: string;
  joinTitle: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
  integrationTitle: string;
  integrations: Array<{ id: string; title: string; body: string; points: string[] }>;
  supportTitle: string;
  supportItems: Array<{ title: string; body: string }>;
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  supplierTitle: string;
  supplierBody: string;
  supplierPoints: string[];
  supplierCta: string;
  bottomTagline: string;
  bottomBody: string;
  applyTitle: string;
  applyBody: string;
  fullName: string;
  email: string;
  phone: string;
  messengersLabel: string;
  messengersHint: string;
  messengersRequired: string;
  messengerWhatsapp: string;
  messengerViber: string;
  messengerTelegram: string;
  password: string;
  passwordConfirm: string;
  passwordHint: string;
  passwordMismatch: string;
  categoryLabel: string;
  categories: string[];
  websiteOptional: string;
  websiteRequired: string;
  noWebsite: string;
  notesOptional: string;
  sendApplication: string;
  referralCodeLabel: string;
  referralCodePlaceholder: string;
  referralCodeHint: string;
  referralCodeRequired: string;
  autoReferralCode: string;
  autoReferralCodeHint: string;
  codeChecking: string;
  codeAvailable: string;
  codeTaken: string;
  codeInvalid: string;
  submitting: string;
  applyError: string;
  successTitle: string;
  successBody: string;
  registerAnother: string;
  howTitle: string;
  howSteps: Array<{ title: string; body: string }>;
  earningsTitle: string;
  earningsAvg: string;
  earningsPlatform: string;
  earningsYours: string;
  avgBooking: string;
  platformFee: string;
  yourCommission: string;
  customerDiscount: string;
  partnerShareNote: string;
  platformBreakdownNote: string;
  /** Header / login / cabinet */
  systemLogin: string;
  loginTitle: string;
  loginSubmit: string;
  loginBack: string;
  loginErrorInvalid: string;
  loginErrorPending: string;
  loginErrorRejected: string;
  cabinetTitle: string;
  cabinetLoading: string;
  cabinetLogout: string;
  cabinetTabCabinet: string;
  cabinetTabBookings: string;
  cabinetTabTools: string;
  cabinetMainInfo: string;
  cabinetFieldFullName: string;
  cabinetFieldFirstName: string;
  cabinetFieldLastName: string;
  cabinetNameRequired: string;
  cabinetFieldPersonalId: string;
  cabinetFieldPayoutMethod: string;
  cabinetPayoutMethodBank: string;
  cabinetPayoutMethodPaypal: string;
  cabinetFieldPayoutAccount: string;
  cabinetFieldPayoutAccountHint: string;
  cabinetFieldPayoutSwift: string;
  cabinetFieldPayoutSwiftHint: string;
  cabinetFieldPaypalAccount: string;
  cabinetFieldPaypalAccountHint: string;
  cabinetPayoutValid: string;
  cabinetPayoutInvalidIban: string;
  cabinetPayoutInvalidSwift: string;
  cabinetPayoutInvalidPaypal: string;
  cabinetIdsRequired: string;
  cabinetFieldEmail: string;
  cabinetFieldPhone: string;
  cabinetFieldCategory: string;
  cabinetFieldCountry: string;
  cabinetFieldWebsite: string;
  cabinetFieldStatus: string;
  cabinetStatusActive: string;
  cabinetStatusInactive: string;
  cabinetFieldMessengers: string;
  cabinetLogin: string;
  cabinetOldPassword: string;
  cabinetNewPassword: string;
  cabinetPasswordHint: string;
  cabinetPasswordWrong: string;
  cabinetPasswordUpdated: string;
  cabinetSave: string;
  cabinetSaving: string;
  cabinetSaved: string;
  cabinetEarned: string;
  cabinetPaid: string;
  cabinetUnpaid: string;
  cabinetBookings: string;
  cabinetCode: string;
  cabinetEarningsTitle: string;
  cabinetEarningsEmpty: string;
  cabinetColBooking: string;
  cabinetColCustomer: string;
  cabinetColEmail: string;
  cabinetColSite: string;
  cabinetColPartner: string;
  cabinetColStatus: string;
  cabinetColBookingDate: string;
  cabinetStatusTransferred: string;
  cabinetStatusPendingPayout: string;
  cabinetDateFrom: string;
  cabinetDateTo: string;
  cabinetSearch: string;
  cabinetClearDates: string;
};

const en: BusinessPartnershipCopy = {
  heroTitle: "Earn more from every car rental booking with the RentAirportCars partner program",
  heroBody:
    "RentAirportCars connects travelers with trusted airport rental partners — transparent pricing, local delivery and support. Hotels, guesthouses, guides, agencies and bloggers earn commission on every successful booking; you can apply even without a website if you have steady traveler traffic via social, messaging or offline channels.",
  register: "Register",
  glanceTitle: "RentAirportCars at a glance",
  glanceBody:
    "An airport-first marketplace for travelers and partners across Georgia and beyond.",
  programTitle: "Partner program — in brief",
  programIntro: "A simple marketing program that is easy to start and scale.",
  programPoints: [
    "Commission-based program",
    "Easy promotion",
    "Monthly payments",
    "Help when you need it",
    "Simple membership",
  ],
  advantagesTitle: "Partner advantages",
  advantagesIntro: "Individuals and companies can join and grow income from travel referrals.",
  advantages: [
    { title: "Highest commission up to 50%", body: "Earn a competitive share on completed bookings." },
    { title: "Simple integration", body: "Start with a link or embed a booking widget on your site." },
    { title: "Airport coverage", body: "Direction: all international airports." },
    { title: "Secure payments", body: "Reliable payouts through a secure payment flow." },
  ],
  bannerTitle: "No registration fee — high commission!",
  bannerBody: "Grow with RentAirportCars as a business partner.",
  joinTitle: "Become our partner — how to join",
  step1Title: "Register",
  step1Body: "Fill in the application form. We review each request personally and reply within a few business days.",
  step2Title: "Code integration",
  step2Body: "We provide a partner link or embed code to place on your website, blog or social channels.",
  step3Title: "Generate income",
  step3Body: "Receive commission on every booking made through your referral — up to 50%.",
  integrationTitle: "Four ways to integrate",
  integrations: [
    {
      id: "link",
      title: "Simple link",
      body: "Share a unique partner URL with guests by chat, email or social media.",
      points: ["No coding required", "Works on any channel"],
    },
    {
      id: "deep",
      title: "Deep links",
      body: "Send visitors straight to a city, airport or car category with tracked links.",
      points: ["Higher conversion", "Campaign-friendly"],
    },
    {
      id: "js",
      title: "JavaScript booking engine",
      body: "Embed a booking widget on your website for seamless search and reserve.",
      points: ["Basic HTML knowledge required", "Website required"],
    },
    {
      id: "api",
      title: "API",
      body: "Connect your product to our availability and booking APIs for full control.",
      points: ["For technical teams", "Custom workflows"],
    },
  ],
  supportTitle: "We are here to help you succeed",
  supportItems: [
    {
      title: "Dedicated support team",
      body: "Phone and email support plus technical help for integration.",
    },
    {
      title: "Monthly growth reports",
      body: "Clear reports that show bookings, clicks and earnings.",
    },
    {
      title: "Online sales tracking",
      body: "Follow performance in real time from your partner dashboard.",
    },
    {
      title: "Monthly payments",
      body: "Stable, scheduled payouts for confirmed commissions.",
    },
    {
      title: "Customizable booking tools",
      body: "Adapt links and widgets to your brand and audience.",
    },
  ],
  faqTitle: "Frequently asked questions",
  faqs: [
    {
      q: "Does joining cost anything?",
      a: "No. You can join the partner program for free.",
    },
    {
      q: "Can I register more than one web property?",
      a: "Yes, as long as each property has its own URL.",
    },
    {
      q: "Where does RentAirportCars operate?",
      a: "We cover all international airports and keep expanding.",
    },
  ],
  supplierTitle: "Want to partner as a supplier?",
  supplierBody: "Contact us to grow your fleet business with thousands of travelers.",
  supplierPoints: ["Simple onboarding", "Marketplace exposure", "Strong customer support"],
  supplierCta: "Learn more",
  bottomTagline: "Timely payments + dedicated support = happy partners",
  bottomBody: "Promote airport rentals and enjoy reliable commissions.",
  applyTitle: "Become a partner",
  applyBody: "We review every application personally and reply within a few days.",
  fullName: "Full name *",
  email: "Email *",
  phone: "Phone *",
  messengersLabel: "Messengers on this number *",
  messengersHint: "Select where this phone is registered.",
  messengersRequired: "Select at least one messenger.",
  messengerWhatsapp: "WhatsApp",
  messengerViber: "Viber",
  messengerTelegram: "Telegram",
  password: "Password *",
  passwordConfirm: "Confirm password *",
  passwordHint: "Only Latin letters and digits; min 6 chars with at least one letter and one digit.",
  passwordMismatch: "Passwords do not match.",
  categoryLabel: "Which field are you in? *",
  categories: ["Hotel / Guesthouse", "Guide / Tour agency", "Blogger / Agent", "Other"],
  websiteOptional: "Website or social page",
  websiteRequired: "Enter a website/social link, or check “I don’t have a site”.",
  noWebsite: "I don't have a site",
  notesOptional: "Additional information (optional)",
  sendApplication: "Send application",
  referralCodeLabel: "Your unique referral code",
  referralCodePlaceholder: "e.g. HOTELTBILISI or leave empty",
  referralCodeHint: "Letters and numbers. If empty, we generate a unique code for you.",
  referralCodeRequired: "Enter a referral code, or check “Assign automatically”.",
  autoReferralCode: "Assign automatically",
  autoReferralCodeHint: "You will get an 8-character code like BPQXX8AH.",
  codeChecking: "Checking availability…",
  codeAvailable: "This code is available.",
  codeTaken: "This code is already taken.",
  codeInvalid: "Use 2–32 characters: letters, numbers, - or _.",
  submitting: "Submitting…",
  applyError: "Could not submit the application. Please try again.",
  successTitle: "Application received — here is your QR code",
  successBody:
    "Your application awaits admin approval. After approval, sign in with your email and password. Guests who scan this QR open the site with your referral code saved automatically.",
  registerAnother: "Register another partner",
  howTitle: "How it works",
  howSteps: [
    { title: "Register", body: "Submit your partner application with contact details." },
    { title: "Get your code", body: "Receive a unique referral link or embed code." },
    { title: "Guests book", body: "Travelers book airport cars through your channel." },
    { title: "Get rewarded", body: "Earn commission on completed bookings." },
  ],
  earningsTitle: "What one booking can be worth",
  earningsAvg: "500 USD",
  earningsPlatform: "75 USD",
  earningsYours: "37.50 USD",
  avgBooking: "Average booking",
  platformFee: "Site commission",
  yourCommission: "Your commission",
  customerDiscount: "5% discount for the customer",
  partnerShareNote: "Up to 50% of $75 to the partner",
  platformBreakdownNote: "5% customer discount ($25)",
  systemLogin: "Log in",
  loginTitle: "Business partner login",
  loginSubmit: "Enter cabinet",
  loginBack: "Back to partnership",
  loginErrorInvalid: "Email or password is incorrect.",
  loginErrorPending: "Your application is still awaiting approval.",
  loginErrorRejected: "This application was rejected.",
  cabinetTitle: "My cabinet",
  cabinetLoading: "Loading…",
  cabinetLogout: "Log out",
  cabinetTabCabinet: "My cabinet",
  cabinetTabBookings: "Bookings",
  cabinetTabTools: "Integration",
  cabinetMainInfo: "Main information",
  cabinetFieldFullName: "Full name and surname",
  cabinetFieldFirstName: "First name",
  cabinetFieldLastName: "Surname",
  cabinetNameRequired: "Enter both first name and surname.",
  cabinetFieldPersonalId: "Personal ID number",
  cabinetFieldPayoutMethod: "Payout method",
  cabinetPayoutMethodBank: "Bank transfer (IBAN / SWIFT)",
  cabinetPayoutMethodPaypal: "PayPal",
  cabinetFieldPayoutAccount: "IBAN",
  cabinetFieldPayoutAccountHint: "International bank account number (Europe / Asia)",
  cabinetFieldPayoutSwift: "SWIFT / BIC",
  cabinetFieldPayoutSwiftHint: "8 or 11 character bank identifier",
  cabinetFieldPaypalAccount: "PayPal email / account ID",
  cabinetFieldPaypalAccountHint: "Email linked to your PayPal account for payouts",
  cabinetPayoutValid: "Looks good",
  cabinetPayoutInvalidIban: "Invalid or incomplete IBAN",
  cabinetPayoutInvalidSwift: "Invalid or incomplete SWIFT / BIC",
  cabinetPayoutInvalidPaypal: "Enter a valid PayPal email address",
  cabinetIdsRequired: "Enter personal ID and a valid payout method.",
  cabinetFieldEmail: "Email",
  cabinetFieldPhone: "Phone",
  cabinetFieldCategory: "Category",
  cabinetFieldCountry: "Country",
  cabinetFieldWebsite: "Website",
  cabinetFieldStatus: "Status",
  cabinetStatusActive: "Active",
  cabinetStatusInactive: "Inactive",
  cabinetFieldMessengers: "Messengers",
  cabinetLogin: "Login",
  cabinetOldPassword: "Current password",
  cabinetNewPassword: "New password",
  cabinetPasswordHint: "Only Latin letters and digits; min 6 chars with at least one letter and one digit.",
  cabinetPasswordWrong: "Current password is incorrect",
  cabinetPasswordUpdated: "Password updated",
  cabinetSave: "Save",
  cabinetSaving: "Saving…",
  cabinetSaved: "Saved",
  cabinetEarned: "Earned",
  cabinetPaid: "Paid",
  cabinetUnpaid: "To transfer",
  cabinetBookings: "Bookings",
  cabinetCode: "Your referral code",
  cabinetEarningsTitle: "Attributed bookings",
  cabinetEarningsEmpty: "No attributed bookings yet.",
  cabinetColBooking: "Booking #",
  cabinetColCustomer: "Customer",
  cabinetColEmail: "Email",
  cabinetColSite: "Site 15%",
  cabinetColPartner: "Your earnings",
  cabinetColStatus: "Status",
  cabinetColBookingDate: "Booking date",
  cabinetStatusTransferred: "Transferred",
  cabinetStatusPendingPayout: "To transfer",
  cabinetDateFrom: "From",
  cabinetDateTo: "To",
  cabinetSearch: "Search",
  cabinetClearDates: "Clear",
};

const ka: BusinessPartnershipCopy = {
  heroTitle:
    "გამოიმუშავეთ მეტი RentAirportCars-ის პარტნიორული პროგრამის მეშვეობით ავტომობილის დაქირავების ყველა დაჯავშნიდან",
  heroBody:
    "RentAirportCars აკავშირებს მოგზაურებს სანდო გამქირავებლებთან — გამჭვირვალე ფასებით, ადგილობრივი მიწოდებითა და მხარდაჭერით. სასტუმროებს, გესთჰაუსებს, გიდებს, სააგენტოებსა და ბლოგერებს შეუძლიათ მიიღონ საკომისიო ყოველი წარმატებული ჯავშნიდან; ვებსაიტის გარეშეც შეგიძლიათ განაცხადი, თუ გაქვთ სტაბილური მოგზაურთა ტრაფიკი სოციალური, მესენჯერი ან ოფლაინ არხებით.",
  register: "რეგისტრაცია",
  glanceTitle: "RentAirportCars ერთი მზერით",
  glanceBody:
    "აეროპორტზე ორიენტირებული პლატფორმა მოგზაურებისა და პარტნიორებისთვის საქართველოში და მის ფარგლებს გარეთ.",
  programTitle: "პარტნიორული პროგრამა — მოკლედ",
  programIntro: "მარკეტინგული პროგრამა, რომელიც მარტივად იწყება და ადვილად იზრდება.",
  programPoints: [
    "კომისიაზე დაფუძნებული პროგრამა",
    "მარტივი პოპულარიზაცია",
    "ყოველთვიური გადახდები",
    "დახმარება საჭიროების შემთხვევაში",
    "მარტივი გაწევრიანება",
  ],
  advantagesTitle: "გაეცანით პარტნიორის უპირატესობებს",
  advantagesIntro: "როგორც ფიზიკურ პირებს, ისე კომპანიებს შეუძლიათ გაწევრიანება და შემოსავლის გაზრდა.",
  advantages: [
    { title: "უმაღლესი საკომისიო 50%-მდე", body: "მიიღეთ კონკურენტული წილი დასრულებულ ჯავშნებზე." },
    { title: "მარტივი ინტეგრაცია", body: "დაიწყეთ ბმულით ან ჩასვით დაჯავშნის ვიჯეტი თქვენს საიტზე." },
    { title: "აეროპორტების დაფარვა", body: "მიმართულება: ყველა საერთაშორისო აეროპორტი." },
    { title: "უსაფრთხო გადახდები", body: "საიმედო ანგარიშსწორება დაცული გადახდის ნაკადით." },
  ],
  bannerTitle: "რეგისტრაცია უფასოა — მაღალი საკომისიო!",
  bannerBody: "გაიზარდეთ RentAirportCars-ის ბიზნეს პარტნიორად.",
  joinTitle: "გახდი ჩვენი პარტნიორი — როგორ შემოგვიერთდე?",
  step1Title: "დარეგისტრირდით",
  step1Body: "შეავსეთ განაცხადი. ყველა მოთხოვნას პირადად ვითვალისწინებთ და რამდენიმე სამუშაო დღეში გიპასუხებთ.",
  step2Title: "კოდის ინტეგრირება",
  step2Body: "მოგაწვდით პარტნიორულ ბმულს ან ჩასასმელ კოდს საიტისთვის, ბლოგისთვის ან სოციალური არხებისთვის.",
  step3Title: "შემოსავლის გენერირება",
  step3Body: "მიიღეთ საკომისიო ყოველი ჯავშნიდან, რომელიც თქვენი არხით შესრულდება — 50%-მდე.",
  integrationTitle: "RentAirportCars გთავაზობთ ინტეგრაციის ოთხ მეთოდს:",
  integrations: [
    {
      id: "link",
      title: "მარტივი ბმული",
      body: "გაუზიარეთ უნიკალური პარტნიორული URL სტუმრებს ჩატით, ელფოსტით ან სოციალური ქსელებით.",
      points: ["კოდირება არ არის საჭირო", "მუშაობს ნებისმიერ არხზე"],
    },
    {
      id: "deep",
      title: "ღრმა ბმულები",
      body: "გაგზავნეთ ვიზიტორები პირდაპირ ქალაქზე, აეროპორტზე ან კატეგორიაზე თვალყურის დევნადი ბმულებით.",
      points: ["მაღალი კონვერსია", "კამპანიებისთვის იდეალური"],
    },
    {
      id: "js",
      title: "JavaScript-ის დაჯავშნის ძრავა",
      body: "ჩასვით დაჯავშნის ვიჯეტი საიტზე უწყვეტი ძებნისა და ჯავშნისთვის.",
      points: ["საჭიროა HTML-ის საბაზისო ცოდნა", "ვებსაიტი სავალდებულოა"],
    },
    {
      id: "api",
      title: "API",
      body: "დააკავშირეთ თქვენი პროდუქტი ხელმისაწვდომობისა და ჯავშნის API-ებთან.",
      points: ["ტექნიკური გუნდებისთვის", "მორგებული პროცესები"],
    },
  ],
  supportTitle: "ჩვენ აქ ვართ, რათა დაგეხმაროთ თქვენი მოგზაურობის წარმატებაში…",
  supportItems: [
    {
      title: "ერთგული მხარდაჭერის გუნდი",
      body: "ტელეფონისა და ელფოსტის მხარდაჭერა, ასევე ტექნიკური დახმარება ინტეგრაციაზე.",
    },
    {
      title: "ყოველთვიური ანგარიშები, რომლებიც აჩვენებს თქვენს ზრდას",
      body: "ნათელი ანგარიშები ჯავშნებზე, კლიკებსა და შემოსავალზე.",
    },
    {
      title: "გაყიდვების შესრულების ონლაინ თვალყურის დევნება",
      body: "შედეგებს რეალურ დროში დააკვირდით პარტნიორის პანელიდან.",
    },
    {
      title: "ყოველთვიური გადახდები",
      body: "სტაბილური, გრაფიკით გათვალისწინებული გადარიცხვები დადასტურებულ საკომისიოზე.",
    },
    {
      title: "პერსონალიზებადი დაჯავშნის სისტემა",
      body: "მოარგეთ ბმულები და ვიჯეტები თქვენს ბრენდსა და აუდიტორიას.",
    },
  ],
  faqTitle: "ხშირად დასმული კითხვები",
  faqs: [
    {
      q: "პროგრამაში გაწევრიანება რამე ღირს?",
      a: "არა. პარტნიორულ პროგრამას უფასოდ შეუერთდებით.",
    },
    {
      q: "შემიძლია ერთზე მეტი ვებ-საკუთრების დარეგისტრირება?",
      a: "დიახ, თუ თითოეულს ცალკე URL აქვს.",
    },
    {
      q: "რომელ ქვეყნებს ემსახურება RentAirportCars?",
      a: "მიმართულება: ყველა საერთაშორისო აეროპორტი.",
    },
  ],
  supplierTitle: "გსურთ პარტნიორობა, როგორც მომწოდებელი?",
  supplierBody: "დაგვიკავშირდით, რათა გააფართოვოთ ბიზნესი ათასობით მოგზაურზე!",
  supplierPoints: ["უმარტივესი ინტეგრაცია", "ბაზრის ექსპოზიცია", "საუკეთესო მომხმარებელთა მხარდაჭერა"],
  supplierCta: "მეტის გაგება",
  bottomTagline: "დროული გადახდები + ერთგული მხარდაჭერა = ბედნიერი პარტნიორი",
  bottomBody: "გაავრცელეთ ინფორმაცია, გააკეთეთ რეკლამა და ისიამოვნეთ სტაბილური გადახდებით!",
  applyTitle: "გახდით პარტნიორი",
  applyBody: "ყველა განაცხადს პერსონალურად განვიხილავთ და რამდენიმე დღეში გიპასუხებთ.",
  fullName: "სრული სახელი *",
  email: "ელ. ფოსტა *",
  phone: "ტელეფონი *",
  messengersLabel: "სოც. ქსელი ამ ნომერზე *",
  messengersHint: "მონიშნეთ, რომელ ქსელზეა რეგისტრირებული ეს ნომერი.",
  messengersRequired: "მონიშნეთ ერთი სოციალური ქსელი მაინც.",
  messengerWhatsapp: "WhatsApp",
  messengerViber: "Viber",
  messengerTelegram: "Telegram",
  password: "პაროლი *",
  passwordConfirm: "გაიმეორეთ პაროლი *",
  passwordHint: "მხოლოდ ლათინური ასოები და ციფრები; მინიმუმ 6 სიმბოლო, ერთი ასო და ერთი ციფრი.",
  passwordMismatch: "პაროლები არ ემთხვევა.",
  categoryLabel: "რომელი სფეროთი სარგებლობთ? *",
  categories: ["სასტუმრო / გესთჰაუსი", "გიდი / ტურისტული სააგენტო", "ბლოგერი / აგენტი", "სხვა"],
  websiteOptional: "ვებგვერდი ან სოციალური გვერდი",
  websiteRequired: "ჩაწერეთ ბმული ან მონიშნეთ „არ მაქვს საიტი“.",
  noWebsite: "არ მაქვს საიტი",
  notesOptional: "დამატებითი ინფორმაცია (არასავალდებულო)",
  sendApplication: "განაცხადის გაგზავნა",
  referralCodeLabel: "თქვენი უნიკალური რეფერალური კოდი",
  referralCodePlaceholder: "მაგ. HOTELTBILISI ან დატოვეთ ცარიელი",
  referralCodeHint: "ასოები და ციფრები. თუ ცარიელია, სისტემა თავად დააგენერირებს უნიკალურ კოდს.",
  referralCodeRequired: "ჩაწერეთ კოდი ან მონიშნეთ „მომენიჭოს ავტომატურად“.",
  autoReferralCode: "მომენიჭოს ავტომატურად",
  autoReferralCodeHint: "მოგენიჭებათ 8 სიმბოლოს კოდი, მაგ. BPQXX8AH.",
  codeChecking: "ხელმისაწვდომობის შემოწმება…",
  codeAvailable: "ეს კოდი თავისუფალია.",
  codeTaken: "ეს კოდი უკვე დაკავებულია.",
  codeInvalid: "გამოიყენეთ 2–32 სიმბოლო: ასოები, ციფრები, - ან _.",
  submitting: "იგზავნება…",
  applyError: "განაცხადის გაგზავნა ვერ მოხერხდა. სცადეთ თავიდან.",
  successTitle: "განაცხადი მიღებულია — თქვენი QR კოდი",
  successBody:
    "განაცხადი ადმინისტრატორის დამტკიცებას ელოდება. დამტკიცების შემდეგ შედით ელფოსტითა და პაროლით. QR-ის დასკანერებისას სტუმარი გადმოდის საიტზე და თქვენი რეფერალური კოდი ავტომატურად ინახება.",
  registerAnother: "ახალი პარტნიორის რეგისტრაცია",
  howTitle: "როგორ მუშაობს",
  howSteps: [
    { title: "რეგისტრაცია", body: "გაგზავნეთ პარტნიორობის განაცხადი საკონტაქტო მონაცემებით." },
    { title: "მიიღეთ კოდი", body: "მიიღეთ უნიკალური რეფერალური ბმული ან ჩასასმელი კოდი." },
    { title: "სტუმრები ჯავშნიან", body: "მოგზაურები თქვენი არხით ჯავშნიან აეროპორტის მანქანებს." },
    { title: "მიიღეთ ჯილდო", body: "მიიღეთ საკომისიო დასრულებულ ჯავშნებზე." },
  ],
  earningsTitle: "რა ღირს ერთი ჯავშანი",
  earningsAvg: "500 დოლარი",
  earningsPlatform: "75 დოლარი",
  earningsYours: "37.50 დოლარი",
  avgBooking: "საშუალო ჯავშანი",
  platformFee: "საიტის საკომისიო",
  yourCommission: "თქვენი საკომისიო",
  customerDiscount: "5% ფასდაკლება მომხმარებელს",
  partnerShareNote: "75$-ის 50%-მდე პარტნიორს",
  platformBreakdownNote: "5% ფასდაკლება მომხმარებელს (25$)",
  systemLogin: "სისტემაში შესვლა",
  loginTitle: "ბიზნეს პარტნიორის შესვლა",
  loginSubmit: "კაბინეტში შესვლა",
  loginBack: "პარტნიორობის გვერდზე დაბრუნება",
  loginErrorInvalid: "ელფოსტა ან პაროლი არასწორია.",
  loginErrorPending: "თქვენი განაცხადი ჯერ დამტკიცების მოლოდინშია.",
  loginErrorRejected: "ეს განაცხადი უარყოფილია.",
  cabinetTitle: "ჩემი კაბინეტი",
  cabinetLoading: "იტვირთება…",
  cabinetLogout: "გასვლა",
  cabinetTabCabinet: "ჩემი კაბინეტი",
  cabinetTabBookings: "ჯავშნები",
  cabinetTabTools: "ინტეგრაცია",
  cabinetMainInfo: "ძირითადი ინფორმაცია",
  cabinetFieldFullName: "სრული სახელი და გვარი",
  cabinetFieldFirstName: "სახელი",
  cabinetFieldLastName: "გვარი",
  cabinetNameRequired: "შეიყვანეთ სახელი და გვარი.",
  cabinetFieldPersonalId: "პირადი ნომერი",
  cabinetFieldPayoutMethod: "გადარიცხვის მეთოდი",
  cabinetPayoutMethodBank: "საბანკო გადარიცხვა (IBAN / SWIFT)",
  cabinetPayoutMethodPaypal: "PayPal",
  cabinetFieldPayoutAccount: "IBAN",
  cabinetFieldPayoutAccountHint: "საერთაშორისო საბანკო ანგარიშის ნომერი (ევროპა / აზია)",
  cabinetFieldPayoutSwift: "SWIFT / BIC",
  cabinetFieldPayoutSwiftHint: "ბანკის იდენტიფიკატორი 8 ან 11 სიმბოლო",
  cabinetFieldPaypalAccount: "PayPal ელფოსტა / ანგარიში",
  cabinetFieldPaypalAccountHint: "PayPal ანგარიშთან დაკავშირებული ელფოსტა გადარიცხვებისთვის",
  cabinetPayoutValid: "სწორია",
  cabinetPayoutInvalidIban: "არასწორი ან არასრული IBAN",
  cabinetPayoutInvalidSwift: "არასწორი ან არასრული SWIFT / BIC",
  cabinetPayoutInvalidPaypal: "შეიყვანეთ სწორი PayPal ელფოსტა",
  cabinetIdsRequired: "შეიყვანეთ პირადი ნომერი და სწორი გადარიცხვის მეთოდი.",
  cabinetFieldEmail: "ელფოსტა",
  cabinetFieldPhone: "ტელეფონი",
  cabinetFieldCategory: "კატეგორია",
  cabinetFieldCountry: "ქვეყანა",
  cabinetFieldWebsite: "ვებსაიტი",
  cabinetFieldStatus: "სტატუსი",
  cabinetStatusActive: "აქტიური",
  cabinetStatusInactive: "არააქტიური",
  cabinetFieldMessengers: "მესენჯერები",
  cabinetLogin: "ლოგინი",
  cabinetOldPassword: "ძველი პაროლი",
  cabinetNewPassword: "ახალი პაროლი",
  cabinetPasswordHint: "მხოლოდ ლათინური ასოები და ციფრები; მინიმუმ 6 სიმბოლო, ერთი ასო და ერთი ციფრი.",
  cabinetPasswordWrong: "ძველი პაროლი არასწორია",
  cabinetPasswordUpdated: "პაროლი განახლებულია",
  cabinetSave: "შენახვა",
  cabinetSaving: "ინახება…",
  cabinetSaved: "შენახულია",
  cabinetEarned: "გამომუშავება",
  cabinetPaid: "გადახდილი",
  cabinetUnpaid: "გადასარიცხი",
  cabinetBookings: "ჯავშნები",
  cabinetCode: "თქვენი რეფერალური კოდი",
  cabinetEarningsTitle: "მიკუთვნებული ჯავშნები",
  cabinetEarningsEmpty: "ჯავშნები ჯერ არ არის.",
  cabinetColBooking: "ჯავშნის №",
  cabinetColCustomer: "მომხმარებელი",
  cabinetColEmail: "ელფოსტა",
  cabinetColSite: "საიტის 15%",
  cabinetColPartner: "თქვენი გამომუშავება",
  cabinetColStatus: "სტატუსი",
  cabinetColBookingDate: "ჯავშნის თარიღი",
  cabinetStatusTransferred: "გადმორიცხული",
  cabinetStatusPendingPayout: "გადმოსარიცხი",
  cabinetDateFrom: "დან",
  cabinetDateTo: "მდე",
  cabinetSearch: "ძებნა",
  cabinetClearDates: "გასუფთავება",
};

const BY_LOCALE: Partial<Record<Locale, BusinessPartnershipCopy>> = { en, ka };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function deepFill<T>(base: T, patch: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(patch) && patch.length ? patch : base) as T;
  }
  if (isPlainObject(base)) {
    const over = isPlainObject(patch) ? patch : {};
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(base)) {
      out[key] = deepFill((base as Record<string, unknown>)[key], over[key]);
    }
    return out as T;
  }
  if (typeof patch === "string" && patch.trim()) return patch as T;
  return base;
}

export function getBusinessPartnershipCopy(locale: string): BusinessPartnershipCopy {
  const key = isLocale(locale) ? locale : "en";
  const exact = BY_LOCALE[key];
  if (exact) return exact;
  const extra = businessPartnershipExtras[key];
  return extra ? deepFill(en, extra) : en;
}
