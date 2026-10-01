import type { AdminLocale } from "@/lib/i18n/admin-config";
import { DEFAULT_ADMIN_LOCALE } from "@/lib/i18n/admin-config";
import { withAdminExtra } from "@/lib/i18n/admin-extra-dictionaries";

export type AdminDictionary = {
  brand: string;
  language: string;
  signOut: string;
  navAria: string;
  nav: {
    overview: string;
    users: string;
    directory: string;
    partners: string;
    moderation: string;
    reviews: string;
    financials: string;
    homepage: string;
    cars: string;
    searchCountries: string;
    delivery: string;
    extras: string;
    statistics: string;
    settings: string;
    customBooking: string;
    bookings: string;
    integrations: string;
    help: string;
    businessPartners: string;
  };
  common: {
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    loading: string;
    saved: string;
    failed: string;
    enabled: string;
    disabled: string;
    refresh: string;
    search: string;
    actions: string;
    status: string;
    yes: string;
    no: string;
    back: string;
    open: string;
    openMenu: string;
    closeMenu: string;
    currency: string;
  };
  customersTable: {
    colName: string;
    colEmail: string;
    colPhone: string;
    colCountry: string;
    colMessenger: string;
    colStatus: string;
    empty: string;
    dbOffline: string;
    loadFailed: string;
    block: string;
    unblock: string;
    statusBlocked: string;
    confirmDelete: string;
    confirmBlock: string;
    actionFailed: string;
  };
  login: {
    title: string;
  };
  pages: {
    overview: { title: string; body: string };
    users: { title: string; body: string };
    directory: { title: string; body: string };
    partners: { title: string; body: string };
    moderation: { title: string; body: string };
    reviews: { title: string; body: string };
    financials: { title: string; body: string };
    homepage: { title: string; body: string };
    cars: { title: string; body: string };
    homepageSearch: { title: string; body: string };
    delivery: { title: string; body: string };
    extras: { title: string; body: string };
    analytics: { title: string; body: string };
    settings: { title: string; body: string; platformTitle: string };
    customBooking: { title: string; body: string };
    bookings: { title: string; body: string };
    integrations: { title: string; body: string };
    integrationsSandbox: { title: string; body: string };
    help: { title: string; body: string };
    businessPartners: {
      title: string;
      body: string;
      back: string;
      moderationTitle: string;
      moderationBody: string;
      countriesTitle: string;
      countriesBody: string;
      statsTitle: string;
      statsBody: string;
      listTitle: string;
      listBody: string;
      tabModeration: string;
      tabCountries: string;
      tabStats: string;
      tabList: string;
      tabHistory: string;
    };
  };
  bookingsList: {
    sectionAll: string;
    sectionActive: string;
    sectionCompleted: string;
    sectionCancelled: string;
    sectionIncomplete: string;
    searchLabel: string;
    searchDigitsPlaceholder: string;
    empty: string;
    editTitle: string;
    colFirstName: string;
    colLastName: string;
    colEmail: string;
    colPickup: string;
    colDropoff: string;
    colPaidOnSite: string;
    colTotal: string;
    confirmDelete: string;
    saveFailed: string;
    deleteFailed: string;
    details: string;
    markUnfulfilled: string;
    confirmUnfulfilled: string;
    markUnfulfilledFailed: string;
    statusUnfulfilled: string;
  };
  sections: {
    googleReviews: string;
    googleReviewsHelp: string;
    googleReviewsOn: string;
    googleReviewsOff: string;
    googleReviewsRatings: string;
    googleReviewsRatingsHelp: string;
    mapsUrl: string;
    saveRefreshReviews: string;
    saveUrlOnly: string;
    infoBlocks: string;
    partnerBanner: string;
    partnerBannerHelp: string;
    partnerBannerOn: string;
    partnerBannerOff: string;
    categories: string;
    popularAirports: string;
    operatingCountries: string;
    footerContact: string;
    footerContactHelp: string;
    footerContactSaved: string;
    footerPhone: string;
    footerEmail: string;
    footerInboxEmail: string;
    footerInboxEmailHelp: string;
    footerAddress: string;
    legalPages: string;
    legalPagesHelp: string;
    legalPagesSaved: string;
    legalTerms: string;
    legalTermsHelp: string;
    legalPrivacy: string;
    legalPrivacyHelp: string;
    legalBody: string;
    legalFile: string;
    legalFileHint: string;
    legalUpload: string;
    legalReplace: string;
    legalRemoveFile: string;
    legalOpenFile: string;
    bookingChannels: string;
    bookingChannelsHelp: string;
    channelOnline: string;
    channelOnlineHelp: string;
    channelTelegram: string;
    channelWhatsapp: string;
    channelViber: string;
    telegramContact: string;
    channelNumber: string;
    telegramPlaceholder: string;
    phonePlaceholder: string;
    liveBotsTitle: string;
    liveBotsHelp: string;
    liveBotActive: string;
    liveBotName: string;
    liveBotNamePh: string;
    liveBotChatId: string;
    liveBotChatPh: string;
    liveBotTokenSaved: string;
    liveBotsEmpty: string;
    liveBotAdd: string;
    countries: string;
    countriesHelp: string;
    searchCountryPh: string;
    onHomepage: string;
    hidden: string;
    individualBooking: string;
    enableAll: string;
    hideCountry: string;
    filterPlacesPh: string;
    airports: string;
    cities: string;
    city: string;
    noPlaces: string;
    noCountryYet: string;
    placesHelp: string;
    liveBotSavedNote: string;
    botUsername: string;
    botToken: string;
    addedFromDelivery: string;
    footerAddressPh: string;
  };
  editor: {
    categoriesHelp: string;
    manageVisibility: string;
    hideVisibility: string;
    enabledOnHomepage: string;
    visibilityHelp: string;
    noCategoriesYet: string;
    addCategory: string;
    updateCategory: string;
    categoryNamePh: string;
    categoryNameExamplePh: string;
    imageUrl: string;
    addAndShow: string;
    saveChanges: string;
    editMap: string;
    noModelsMapped: string;
    mappedModels: string;
    mappedModelsHelp: string;
    cardsDrag: string;
    homepageLayout: string;
    slider: string;
    sliderHelp: string;
    grid: string;
    gridHelp: string;
    addAirport: string;
    addAirportCard: string;
    updateAirportCard: string;
    airportTitlePh: string;
    iataPh: string;
    orUploadImage: string;
    deleteCategoryConfirm: string;
    deleteAirportConfirm: string;
    categoryNameRequired: string;
    imageRequired: string;
    airportRequired: string;
    couldNotSaveCategory: string;
    couldNotDeleteCategory: string;
    couldNotSaveAirport: string;
    couldNotDeleteAirport: string;
    couldNotUpdateVisibility: string;
    couldNotSaveCategoryOrder: string;
    couldNotSaveAirportOrder: string;
    couldNotSaveLayout: string;
  };
};

const en: AdminDictionary = {
  brand: "Operations",
  language: "Language",
  signOut: "Sign out",
  navAria: "Admin sections",
  nav: {
    overview: "Overview",
    users: "Users",
    directory: "Directory",
    partners: "Partners",
    moderation: "Moderation",
    reviews: "Reviews",
    financials: "Financials",
    homepage: "Homepage",
    cars: "Cars",
    searchCountries: "Search countries",
    delivery: "Delivery",
    extras: "Extras",
    statistics: "Statistics",
    settings: "Settings",
    customBooking: "Online chat for bookings",
    bookings: "Bookings",
    integrations: "Integrations",
    help: "Help",
    businessPartners: "Business Partners",
  },
  common: {
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    loading: "Loading…",
    saved: "Saved",
    failed: "Failed",
    enabled: "Enabled",
    disabled: "Disabled",
    refresh: "Refresh",
    search: "Search",
    actions: "Actions",
    status: "Status",
    yes: "Yes",
    no: "No",
    back: "Back",
    open: "Open →",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    currency: "Currency",
  },
  customersTable: {
    colName: "Name",
    colEmail: "Email",
    colPhone: "Phone",
    colCountry: "Country",
    colMessenger: "Messenger",
    colStatus: "Status",
    empty: "No customers found.",
    dbOffline: "Database offline — showing local registrations",
    loadFailed: "Could not load database users",
    block: "Block",
    unblock: "Unblock",
    statusBlocked: "BLOCKED",
    confirmDelete: "Delete customer {name}?",
    confirmBlock:
      "Block {name}? Email {email} and phone {phone} will not be able to create bookings.",
    actionFailed: "Action failed.",
  },
  login: {
    title: "Administrator sign-in",
  },
  pages: {
    overview: {
      title: "Operations console",
      body: "Manage partners, listings, bookings and homepage content.",
    },
    users: {
      title: "User directory",
      body: "Browse customer and partner accounts.",
    },
    directory: {
      title: "Accounts directory",
      body: "Unified view of users and partners.",
    },
    partners: {
      title: "Partner applications",
      body: "Pending approvals, active company/private partners, and rejected requests.",
    },
    moderation: {
      title: "Moderation",
      body: "Choose a section below: approve car listings, or moderate customer reviews.",
    },
    reviews: {
      title: "Review moderation",
      body: "Moderate customer reviews before they go public.",
    },
    financials: {
      title: "Admin financials",
      body: "Bookings revenue and partner payouts overview.",
    },
    homepage: {
      title: "Homepage content",
      body: "Manage Car Categories, Popular Airports, Why & How cards, and Google Maps reviews on rentairportcars.com.",
    },
    cars: {
      title: "Cars",
      body: "All cars listed on the site. Each listing code is the vehicle license plate.",
    },
    homepageSearch: {
      title: "Homepage search countries",
      body: "Choose which countries and airports appear in the homepage search form.",
    },
    delivery: {
      title: "Delivery locations & airports",
      body: "Configure delivery airports and pricing catalog.",
    },
    extras: {
      title: "Extra services",
      body: "Manage add-on services partners can offer.",
    },
    analytics: {
      title: "Booking statistics",
      body: "Traffic and booking performance overview.",
    },
    settings: {
      title: "Administrator account",
      body: "Update admin login credentials.",
      platformTitle: "Platform settings",
    },
    customBooking: {
      title: "Online chat for bookings",
      body: "Live booking chats from the website. Unread chats stay highlighted at the top.",
    },
    bookings: {
      title: "Bookings",
      body: "All site bookings with 11R1000+ numbers. Filter by status and search by digits.",
    },
    integrations: {
      title: "Partner integrations",
      body: "API keys, webhook sync, mapping, Test Connection, and manual override for channel partners.",
    },
    integrationsSandbox: {
      title: "Integration sandbox",
      body: "Run a full mock partner cycle: fleet pull, availability, and booking lock — without a real supplier.",
    },
    help: {
      title: "Help",
      body: "Edit Help Center categories, topics, and Q&A articles shown on /help.",
    },
    businessPartners: {
      title: "Business Partners",
      body: "Open a section to moderate applications, manage invoices, view financial stats, or manage affiliate QR codes.",
      back: "Business Partners",
      moderationTitle: "New partner moderation",
      moderationBody: "Approve or reject applications from /partnership.",
      countriesTitle: "Invoice",
      countriesBody: "Partner invoices and payout documents.",
      statsTitle: "Financial statistics",
      statsBody: "Rates and monthly projection for active partners.",
      listTitle: "Partners directory",
      listBody: "Approved partners, referral codes, and QR links.",
      tabModeration: "Moderation",
      tabCountries: "Invoice",
      tabStats: "Statistics",
      tabList: "Partners",
      tabHistory: "History",
    },
  },
  bookingsList: {
    sectionAll: "Bookings",
    sectionActive: "Active",
    sectionCompleted: "Completed",
    sectionCancelled: "Cancelled",
    sectionIncomplete: "Unfulfilled",
    searchLabel: "Search booking number",
    searchDigitsPlaceholder: "1000",
    empty: "No bookings yet.",
    editTitle: "Edit booking",
    colFirstName: "First name",
    colLastName: "Last name",
    colEmail: "Email",
    colPickup: "Pickup",
    colDropoff: "Drop-off",
    colPaidOnSite: "Paid on site",
    colTotal: "Booking total",
    confirmDelete: "Delete booking {ref}?",
    saveFailed: "Could not save booking.",
    deleteFailed: "Could not delete booking.",
    details: "Details",
    markUnfulfilled: "Unfulfilled",
    confirmUnfulfilled: "Mark {ref} as unfulfilled? The partner will see it under Unfulfilled.",
    markUnfulfilledFailed: "Could not mark booking as unfulfilled.",
    statusUnfulfilled: "Unfulfilled",
  },
  sections: {
    googleReviews: "Google Maps reviews",
    googleReviewsHelp:
      "Paste a Google Maps place link and save. Previous comments are removed and replaced with reviews from that link. Homepage shows only the star ratings you select (4.8 / 4.9 / 5.0). Requires GOOGLE_PLACES_API_KEY.",
    googleReviewsOn: "Google reviews are ON on the homepage.",
    googleReviewsOff: "Google reviews are OFF on the homepage.",
    googleReviewsRatings: "Show reviews",
    googleReviewsRatingsHelp: "Only reviews at or above the lowest selected rating appear in admin and on the homepage.",
    mapsUrl: "Google Maps place URL",
    saveRefreshReviews: "Save & refresh reviews",
    saveUrlOnly: "Save URL only",
    infoBlocks: "Why & How cards",
    partnerBanner: "Partner banner",
    partnerBannerHelp: "Show or hide the “Become a partner” block on the homepage.",
    partnerBannerOn: "Partner banner is ON on the homepage.",
    partnerBannerOff: "Partner banner is OFF on the homepage.",
    categories: "Car categories",
    popularAirports: "Popular airports",
    operatingCountries: "Operating countries",
    footerContact: "Footer contact bar",
    footerContactHelp:
      "Phone, email and address shown in the dark strip above the copyright in the website footer.",
    footerContactSaved: "Footer contact saved — visible on the homepage footer.",
    footerPhone: "Phone number",
    footerEmail: "Public email (footer)",
    footerInboxEmail: "Contact form inbox email",
    footerInboxEmailHelp:
      "All “Send message” submissions from the contact window are delivered here. Leave empty to use the public email.",
    footerAddress: "Address",
    legalPages: "Terms & Privacy",
    legalPagesHelp:
      "Edit Terms of Service and Privacy text (and optional PDF/image). Content appears on /terms and /privacy when visitors open those footer links.",
    legalPagesSaved: "Terms & Privacy saved — live on the public site.",
    legalTerms: "Terms of Service",
    legalTermsHelp: "Shown at /terms (footer: Terms of Service).",
    legalPrivacy: "Privacy",
    legalPrivacyHelp: "Shown at /privacy (footer: Privacy).",
    legalBody: "Page text",
    legalFile: "Attached file (optional)",
    legalFileHint: "PDF, PNG or JPG — max 20 MB",
    legalUpload: "Upload file",
    legalReplace: "Replace file",
    legalRemoveFile: "Remove file",
    legalOpenFile: "Open file",
    bookingChannels: "Custom booking channels",
    bookingChannelsHelp:
      "Enable channels shown under the phone field in the homepage booking window. Guests pick one to start.",
    channelOnline: "Online chat",
    channelOnlineHelp: "Opens in-site chat (admin inbox / AB-codes).",
    channelTelegram: "Telegram",
    channelWhatsapp: "WhatsApp",
    channelViber: "Viber",
    telegramContact: "Telegram contact",
    channelNumber: "number",
    telegramPlaceholder: "@yourchannel or 995555000000",
    phonePlaceholder: "995555000000",
    liveBotsTitle: "Telegram bots (Live Chat)",
    liveBotsHelp:
      "Add bots and mark one as active. When AI cannot answer and the guest asks for an operator, messages arrive on this bot. Only one chat is active at a time; others wait in queue.",
    liveBotActive: "Active",
    liveBotName: "Name",
    liveBotNamePh: "e.g. Main operator",
    liveBotChatId: "Chat ID (admin / group)",
    liveBotChatPh: "e.g. 123456789",
    liveBotTokenSaved: "saved — enter a new token to replace",
    liveBotsEmpty: "No bot yet. Add one and mark it active.",
    liveBotAdd: "bot",
    countries: "Countries",
    countriesHelp:
      "Every country is listed. Enable a country by turning on its airports or cities — those appear in homepage search.",
    searchCountryPh: "Search country…",
    onHomepage: "On homepage",
    hidden: "Hidden",
    individualBooking: "Individual booking",
    enableAll: "Enable all",
    hideCountry: "Hide country",
    filterPlacesPh: "Filter airports and cities…",
    airports: "Airports",
    cities: "Cities",
    city: "City",
    noPlaces: "No airports or major cities listed for this country yet.",
    noCountryYet: "No country is enabled yet. Select locations on the right to show them on the homepage.",
    placesHelp: "Turn on airports and major cities for homepage search.",
    liveBotSavedNote: "The active bot receives live-chat messages when AI cannot answer or the guest asks for an operator.",
    botUsername: "Bot username",
    botToken: "Bot token",
    addedFromDelivery: "Added from Delivery",
    footerAddressPh: "Tbilisi, Georgia",
  },
  editor: {
    categoriesHelp: "Drag cards by the handle to change homepage order. Only enabled categories appear here and on the homepage.",
    manageVisibility: "Manage category visibility",
    hideVisibility: "Hide category visibility",
    enabledOnHomepage: "{on}/{total} enabled on homepage",
    visibilityHelp: "Turn categories on or off for the homepage filter and this section. Add a new one below to show it on the homepage.",
    noCategoriesYet: "No categories yet",
    addCategory: "Add category",
    updateCategory: "Update category",
    categoryNamePh: "Category name",
    categoryNameExamplePh: "Category name (e.g. Luxury)",
    imageUrl: "Image URL",
    addAndShow: "Add & show on homepage",
    saveChanges: "Save changes",
    editMap: "Edit / map",
    noModelsMapped: "No models mapped yet",
    mappedModels: "Mapped car makes & models",
    mappedModelsHelp: "Partners adding a matching make/model are auto-assigned here.",
    cardsDrag: "{n} cards — drag to reorder.",
    homepageLayout: "Homepage layout",
    slider: "Slider",
    sliderHelp: "Row + arrows",
    grid: "Grid",
    gridHelp: "3 columns",
    addAirport: "Add airport",
    addAirportCard: "Add airport card",
    updateAirportCard: "Update airport card",
    airportTitlePh: "Title, e.g. Kutaisi International Airport (KUT)",
    iataPh: "IATA code (KUT)",
    orUploadImage: "Or upload image",
    deleteCategoryConfirm: "Delete this category from the homepage?",
    deleteAirportConfirm: "Delete this popular airport card?",
    categoryNameRequired: "Category name is required",
    imageRequired: "Image URL or upload is required",
    airportRequired: "Airport title and IATA code are required",
    couldNotSaveCategory: "Could not save category",
    couldNotDeleteCategory: "Could not delete category",
    couldNotSaveAirport: "Could not save airport",
    couldNotDeleteAirport: "Could not delete airport",
    couldNotUpdateVisibility: "Could not update visibility",
    couldNotSaveCategoryOrder: "Could not save category order",
    couldNotSaveAirportOrder: "Could not save airport order",
    couldNotSaveLayout: "Could not save layout",
  },
};

const ka: AdminDictionary = {
  brand: "ოპერაციები",
  language: "ენა",
  signOut: "გასვლა",
  navAria: "ადმინის სექციები",
  nav: {
    overview: "მიმოხილვა",
    users: "მომხმარებლები",
    directory: "დირექტორია",
    partners: "პარტნიორები",
    moderation: "მოდერაცია",
    reviews: "შეფასებები",
    financials: "ფინანსები",
    homepage: "მთავარი გვერდი",
    cars: "მანქანები",
    searchCountries: "ძიების ქვეყნები",
    delivery: "მიწოდება",
    extras: "დამატებითი",
    statistics: "სტატისტიკა",
    settings: "პარამეტრები",
    customBooking: "ონლაინ ჩატი ჯავშნებისთვის",
    bookings: "ჯავშნები",
    integrations: "ინტეგრაციები",
    help: "დახმარება",
    businessPartners: "ბიზნეს პარტნიორები",
  },
  common: {
    save: "შენახვა",
    saving: "ინახება…",
    cancel: "გაუქმება",
    delete: "წაშლა",
    edit: "რედაქტირება",
    add: "დამატება",
    loading: "იტვირთება…",
    saved: "შენახულია",
    failed: "შეცდომა",
    enabled: "ჩართულია",
    disabled: "გამორთულია",
    refresh: "განახლება",
    search: "ძიება",
    actions: "მოქმედებები",
    status: "სტატუსი",
    yes: "კი",
    no: "არა",
    back: "უკან",
    open: "გახსნა →",
    openMenu: "მენიუს გახსნა",
    closeMenu: "მენიუს დახურვა",
    currency: "ვალუტა",
  },
  customersTable: {
    colName: "სახელი",
    colEmail: "ელფოსტა",
    colPhone: "ტელეფონი",
    colCountry: "ქვეყანა",
    colMessenger: "მესენჯერი",
    colStatus: "სტატუსი",
    empty: "მომხმარებლები არ მოიძებნა.",
    dbOffline: "ბაზა გამორთულია — ნაჩვენებია ლოკალური რეგისტრაციები",
    loadFailed: "მომხმარებლების ჩატვირთვა ვერ მოხერხდა",
    block: "დაბლოკვა",
    unblock: "განბლოკვა",
    statusBlocked: "დაბლოკილი",
    confirmDelete: "წავშალოთ მომხმარებელი {name}?",
    confirmBlock:
      "დავბლოკოთ {name}? ელფოსტით {email} და ტელეფონით {phone} ჯავშნის გაკეთება აღარ იქნება შესაძლებელი.",
    actionFailed: "მოქმედება ვერ შესრულდა.",
  },
  login: {
    title: "ადმინისტრატორის შესვლა",
  },
  pages: {
    overview: {
      title: "ოპერაციების კონსოლი",
      body: "მართეთ პარტნიორები, განცხადებები, ჯავშნები და მთავარი გვერდის კონტენტი.",
    },
    users: {
      title: "მომხმარებელთა დირექტორია",
      body: "ნახეთ კლიენტებისა და პარტნიორების ანგარიშები.",
    },
    directory: {
      title: "ანგარიშების დირექტორია",
      body: "მომხმარებლებისა და პარტნიორების ერთიანი ხედი.",
    },
    partners: {
      title: "პარტნიორთა განაცხადები",
      body: "დასამტკიცებელი განაცხადები, აქტიური კომპანია/კერძო პარტნიორები და უარყოფილი მოთხოვნები.",
    },
    moderation: {
      title: "მოდერაცია",
      body: "აირჩიეთ ქვეფანჯარა: მანქანების განცხადებები ან კლიენტების შეფასებები.",
    },
    reviews: {
      title: "შეფასებების მოდერაცია",
      body: "გადაამოწმეთ კლიენტების შეფასებები გამოქვეყნებამდე.",
    },
    financials: {
      title: "ადმინის ფინანსები",
      body: "ჯავშნების შემოსავალი და პარტნიორთა გადახდები.",
    },
    homepage: {
      title: "მთავარი გვერდის კონტენტი",
      body: "მართეთ კატეგორიები, პოპულარული აეროპორტები, Why & How ბლოკები და Google Maps შეფასებები.",
    },
    cars: {
      title: "მანქანები",
      body: "საიტზე არსებული ყველა მანქანა. თითოეული განცხადების კოდი არის სახელმწიფო ნომერი.",
    },
    homepageSearch: {
      title: "მთავარი გვერდის ძიების ქვეყნები",
      body: "აირჩიეთ რომელი ქვეყნები და აეროპორტები გამოჩნდეს ძიების ფორმაში.",
    },
    delivery: {
      title: "მიწოდების ლოკაციები და აეროპორტები",
      body: "მიწოდების აეროპორტებისა და ფასების კატალოგი.",
    },
    extras: {
      title: "დამატებითი სერვისები",
      body: "მართეთ დამატებითი სერვისები, რომლებსაც პარტნიორები სთავაზობენ.",
    },
    analytics: {
      title: "ჯავშნების სტატისტიკა",
      body: "ტრაფიკისა და ჯავშნების მიმოხილვა.",
    },
    settings: {
      title: "ადმინისტრატორის ანგარიში",
      body: "განაახლეთ ადმინის შესვლის მონაცემები.",
      platformTitle: "პლატფორმის პარამეტრები",
    },
    customBooking: {
      title: "ონლაინ ჩატი ჯავშნებისთვის",
      body: "საიტიდან დაწყებული ონლაინ ჯავშნის ჩატები. წაუკითხავი ჩატები ზემოთ გამოირჩევა.",
    },
    bookings: {
      title: "ჯავშნები",
      body: "საიტის ყველა ჯავშანი 11R1000+ ნომრებით. გაფილტრეთ სტატუსით და მოძებნეთ ციფრებით.",
    },
    integrations: {
      title: "პარტნიორთა ინტეგრაციები",
      body: "API გასაღებები, webhook სინქი, მეპინგი, Test Connection და ხელით მართვის რეჟიმი.",
    },
    integrationsSandbox: {
      title: "ინტეგრაციის sandbox",
      body: "მოკ პარტნიორის სრული ციკლი: ფლოტის pull, ხელმისაწვდომობა და ჯავშნის lock — რეალური მომწოდებლის გარეშე.",
    },
    help: {
      title: "დახმარება",
      body: "დაარედაქტირეთ Help Center კატეგორიები, თემები და კითხვა-პასუხები (/help გვერდზე).",
    },
    businessPartners: {
      title: "ბიზნეს პარტნიორები",
      body: "აირჩიეთ სექცია: მოდერაცია, ინვოისი, სტატისტიკა ან პარტნიორების სია.",
      back: "ბიზნეს პარტნიორები",
      moderationTitle: "ახალი პარტნიორების მოდერაცია",
      moderationBody: "დაამტკიცეთ ან უარყავით /partnership-დან შემოსული განაცხადები.",
      countriesTitle: "ინვოისი",
      countriesBody: "პარტნიორების ინვოისები და გადახდის დოკუმენტები.",
      statsTitle: "თანხობრივი სტატისტიკა",
      statsBody: "ტარიფები და თვიური პროგნოზი აქტიურ პარტნიორებზე.",
      listTitle: "პარტნიორების სია",
      listBody: "დამტკიცებული პარტნიორები, რეფერალური კოდები და QR ბმულები.",
      tabModeration: "მოდერაცია",
      tabCountries: "ინვოისი",
      tabStats: "სტატისტიკა",
      tabList: "პარტნიორები",
      tabHistory: "ისტორია",
    },
  },
  bookingsList: {
    sectionAll: "ჯავშნები",
    sectionActive: "აქტიური",
    sectionCompleted: "დასრულებული",
    sectionCancelled: "გაუქმებული",
    sectionIncomplete: "არშემდგარი",
    searchLabel: "ჯავშნის ნომრის ძებნა",
    searchDigitsPlaceholder: "1000",
    empty: "ჯავშნები ჯერ არ არის.",
    editTitle: "ჯავშნის რედაქტირება",
    colFirstName: "სახელი",
    colLastName: "გვარი",
    colEmail: "ელფოსტა",
    colPickup: "აღება",
    colDropoff: "დაბრუნება",
    colPaidOnSite: "გადახდილი საიტზე",
    colTotal: "ჯავშნის სრული თანხა",
    confirmDelete: "წავშალოთ ჯავშანი {ref}?",
    saveFailed: "ჯავშნის შენახვა ვერ მოხერხდა.",
    deleteFailed: "ჯავშნის წაშლა ვერ მოხერხდა.",
    details: "დეტალები",
    markUnfulfilled: "არშემდგარი",
    confirmUnfulfilled:
      "მოვნიშნოთ {ref} არშემდგარად? პარტნიორს გამოუჩნდება არშემდგარი ჯავშნებში.",
    markUnfulfilledFailed: "ჯავშნის არშემდგარად მონიშვნა ვერ მოხერხდა.",
    statusUnfulfilled: "არშემდგარი",
  },
  sections: {
    googleReviews: "Google Maps შეფასებები",
    googleReviewsHelp:
      "ჩასვით Google Maps ადგილის ლინკი და შეინახეთ. ძველი კომენტარები წაიშლება და გამოჩნდება ამ ლინკის შეფასებები. მთავარზე ჩანს მხოლოდ არჩეული ვარსკვლავები (4.8 / 4.9 / 5.0). საჭიროა GOOGLE_PLACES_API_KEY.",
    googleReviewsOn: "Google შეფასებები ჩართულია მთავარ გვერდზე.",
    googleReviewsOff: "Google შეფასებები გამორთულია მთავარ გვერდზე.",
    googleReviewsRatings: "გამოსაჩენი შეფასებები",
    googleReviewsRatingsHelp: "ადმინში და მთავარ გვერდზე გამოჩნდება მხოლოდ არჩეული მინიმალური ვარსკვლავიდან ზემოთ.",
    mapsUrl: "Google Maps ადგილის URL",
    saveRefreshReviews: "შენახვა და განახლება",
    saveUrlOnly: "მხოლოდ URL-ის შენახვა",
    infoBlocks: "Why & How ბლოკები",
    partnerBanner: "პარტნიორის ბანერი",
    partnerBannerHelp: "მთავარ გვერდზე „გახდი პარტნიორი“ ბლოკის ჩვენება ან დამალვა.",
    partnerBannerOn: "პარტნიორის ბანერი ჩართულია მთავარ გვერდზე.",
    partnerBannerOff: "პარტნიორის ბანერი გამორთულია მთავარ გვერდზე.",
    categories: "მანქანის კატეგორიები",
    popularAirports: "პოპულარული აეროპორტები",
    operatingCountries: "ოპერირების ქვეყნები",
    footerContact: "ფუტერის კონტაქტის ზოლი",
    footerContactHelp:
      "ტელეფონი, მეილი და მისამართი — საიტის ფუტერში, საავტორო უფლებების ზოლის ზემოთ.",
    footerContactSaved: "კონტაქტი შენახულია — ჩანს მთავარი გვერდის ქვედა ზოლში.",
    footerPhone: "ტელეფონის ნომერი",
    footerEmail: "საჯარო ელფოსტა (ფუტერი)",
    footerInboxEmail: "კონტაქტის ფორმის მიმღები ელფოსტა",
    footerInboxEmailHelp:
      "აქ მოდის ყველა შეტყობინება „შეტყობინების გაგზავნა“ ფანჯრიდან. ცარიელი რომ დატოვოთ — გამოყენდება საჯარო ელფოსტა.",
    footerAddress: "მისამართი",
    legalPages: "მომსახურების პირობები და კონფიდენციალურობა",
    legalPagesHelp:
      "დაარედაქტირეთ მომსახურების პირობებისა და კონფიდენციალურობის ტექსტი (და სურვილისამებრ PDF/სურათი). შინაარსი გამოჩნდება /terms და /privacy გვერდებზე ფუტერის ბმულებიდან.",
    legalPagesSaved: "შენახულია — გამოჩნდება საჯარო საიტზე.",
    legalTerms: "მომსახურების პირობები",
    legalTermsHelp: "გამოჩნდება /terms გვერდზე (ფუტერი: მომსახურების პირობები).",
    legalPrivacy: "კონფიდენციალურობა",
    legalPrivacyHelp: "გამოჩნდება /privacy გვერდზე (ფუტერი: კონფიდენციალურობა).",
    legalBody: "გვერდის ტექსტი",
    legalFile: "მიმაგრებული ფაილი (არასავალდებულო)",
    legalFileHint: "PDF, PNG ან JPG — მაქს. 20 მბ",
    legalUpload: "ფაილის ატვირთვა",
    legalReplace: "ფაილის შეცვლა",
    legalRemoveFile: "ფაილის წაშლა",
    legalOpenFile: "ფაილის გახსნა",
    bookingChannels: "ჯავშნის არხები",
    bookingChannelsHelp:
      "ჩართეთ არხები, რომლებიც მთავარ გვერდზე ტელეფონის ველის ქვემოთ ჩანს. სტუმარი ერთ-ერთს ირჩევს.",
    channelOnline: "ონლაინ ჩატი",
    channelOnlineHelp: "იხსნება საიტის ჩატი (ადმინის შემოსულები / AB-კოდები).",
    channelTelegram: "Telegram",
    channelWhatsapp: "WhatsApp",
    channelViber: "Viber",
    telegramContact: "Telegram კონტაქტი",
    channelNumber: "ნომერი",
    telegramPlaceholder: "@yourchannel ან 995555000000",
    phonePlaceholder: "995555000000",
    liveBotsTitle: "Telegram ბოტები (Live Chat)",
    liveBotsHelp:
      "ჩაწერეთ ბოტები და მონიშნეთ ერთი აქტიურად. როცა AI ვერ პასუხობს და სტუმარი ოპერატორს ითხოვს, შეტყობინება ამ ბოტზე მოვა. ერთდროულად ერთი საუბარია, დანარჩენი რიგშია.",
    liveBotActive: "აქტიური",
    liveBotName: "სახელი",
    liveBotNamePh: "მაგ. მთავარი ოპერატორი",
    liveBotChatId: "Chat ID (ადმინი / ჯგუფი)",
    liveBotChatPh: "მაგ. 123456789",
    liveBotTokenSaved: "შენახულია — ჩაანაცვლეთ ახალი ტოკენით",
    liveBotsEmpty: "ჯერ არ არის ბოტი. დაამატეთ და მონიშნეთ აქტიურად.",
    liveBotAdd: "ბოტი",
    countries: "ქვეყნები",
    countriesHelp:
      "ყველა ქვეყანა ჩანს. ჩართეთ აეროპორტი ან ქალაქი — ისინი მთავარი გვერდის ძიებაში გამოჩნდება.",
    searchCountryPh: "ქვეყნის ძებნა…",
    onHomepage: "მთავარზე",
    hidden: "დამალული",
    individualBooking: "ინდივიდუალური ჯავშანი",
    enableAll: "ყველას ჩართვა",
    hideCountry: "ქვეყნის დამალვა",
    filterPlacesPh: "აეროპორტები და ქალაქები…",
    airports: "აეროპორტები",
    cities: "ქალაქები",
    city: "ქალაქი",
    noPlaces: "ამ ქვეყანაში აეროპორტი ან ქალაქი ჯერ არ არის.",
    noCountryYet: "არც ერთი ქვეყანა არ არის ჩართული. მარჯვნივ აირჩიეთ ლოკაციები.",
    placesHelp: "ჩართეთ აეროპორტები და ქალაქები მთავარი გვერდის ძიებისთვის.",
    liveBotSavedNote: "აქტიური ბოტი მიიღებს live-chat შეტყობინებებს, როცა AI ვერ პასუხობს ან სტუმარი ოპერატორს ითხოვს.",
    botUsername: "ბოტის username",
    botToken: "ბოტის ტოკენი",
    addedFromDelivery: "დამატებულია მიწოდებიდან",
    footerAddressPh: "თბილისი, საქართველო",
  },
  editor: {
    categoriesHelp: "გადაათრიეთ ბარათები რიგის შესაცვლელად. აქ და მთავარ გვერდზე მხოლოდ ჩართული კატეგორიები ჩანს.",
    manageVisibility: "კატეგორიების ხილვადობა",
    hideVisibility: "ხილვადობის დამალვა",
    enabledOnHomepage: "{on}/{total} ჩართულია მთავარზე",
    visibilityHelp: "ჩართეთ ან გამორთეთ კატეგორიები მთავარი გვერდის ფილტრისთვის. ახალი დაამატეთ ქვემოთ.",
    noCategoriesYet: "კატეგორია ჯერ არ არის",
    addCategory: "კატეგორიის დამატება",
    updateCategory: "კატეგორიის განახლება",
    categoryNamePh: "კატეგორიის სახელი",
    categoryNameExamplePh: "კატეგორიის სახელი (მაგ. Luxury)",
    imageUrl: "სურათის URL",
    addAndShow: "დამატება და ჩვენება მთავარზე",
    saveChanges: "ცვლილების შენახვა",
    editMap: "რედაქტირება",
    noModelsMapped: "მოდელი ჯერ არ არის მიბმული",
    mappedModels: "მიბმული მარკები და მოდელები",
    mappedModelsHelp: "შესაბამისი მარკა/მოდელის დამატებისას პარტნიორი აქ ავტომატურად მოხვდება.",
    cardsDrag: "{n} ბარათი — გადაათრიეთ რიგისთვის.",
    homepageLayout: "მთავარი გვერდის განლაგება",
    slider: "სლაიდერი",
    sliderHelp: "რიგი + ისრები",
    grid: "ბადე",
    gridHelp: "3 სვეტი",
    addAirport: "აეროპორტის დამატება",
    addAirportCard: "აეროპორტის ბარათი",
    updateAirportCard: "ბარათის განახლება",
    airportTitlePh: "სათაური, მაგ. Kutaisi International Airport (KUT)",
    iataPh: "IATA კოდი (KUT)",
    orUploadImage: "ან ატვირთეთ სურათი",
    deleteCategoryConfirm: "წაიშალოს ეს კატეგორია მთავარი გვერდიდან?",
    deleteAirportConfirm: "წაიშალოს ეს აეროპორტის ბარათი?",
    categoryNameRequired: "კატეგორიის სახელი სავალდებულოა",
    imageRequired: "საჭიროა სურათის URL ან ატვირთვა",
    airportRequired: "საჭიროა აეროპორტის სათაური და IATA კოდი",
    couldNotSaveCategory: "კატეგორია ვერ შეინახა",
    couldNotDeleteCategory: "კატეგორია ვერ წაიშალა",
    couldNotSaveAirport: "აეროპორტი ვერ შეინახა",
    couldNotDeleteAirport: "აეროპორტი ვერ წაიშალა",
    couldNotUpdateVisibility: "ხილვადობა ვერ განახლდა",
    couldNotSaveCategoryOrder: "კატეგორიების რიგი ვერ შეინახა",
    couldNotSaveAirportOrder: "აეროპორტების რიგი ვერ შეინახა",
    couldNotSaveLayout: "განლაგება ვერ შეინახა",
  },
};

const ru: AdminDictionary = {
  brand: "Операции",
  language: "Язык",
  signOut: "Выйти",
  navAria: "Разделы админки",
  nav: {
    overview: "Обзор",
    users: "Пользователи",
    directory: "Каталог",
    partners: "Партнёры",
    moderation: "Модерация",
    reviews: "Отзывы",
    financials: "Финансы",
    homepage: "Главная",
    cars: "Автомобили",
    searchCountries: "Страны поиска",
    delivery: "Доставка",
    extras: "Доп. услуги",
    statistics: "Статистика",
    settings: "Настройки",
    customBooking: "Онлайн-чат для бронирований",
    bookings: "Бронирования",
    integrations: "Интеграции",
    help: "Помощь",
    businessPartners: "Бизнес-партнёры",
  },
  common: {
    save: "Сохранить",
    saving: "Сохранение…",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Изменить",
    add: "Добавить",
    loading: "Загрузка…",
    saved: "Сохранено",
    failed: "Ошибка",
    enabled: "Включено",
    disabled: "Выключено",
    refresh: "Обновить",
    search: "Поиск",
    actions: "Действия",
    status: "Статус",
    yes: "Да",
    no: "Нет",
    back: "Назад",
    open: "Открыть →",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    currency: "Валюта",
  },
  customersTable: {
    colName: "Имя",
    colEmail: "Email",
    colPhone: "Телефон",
    colCountry: "Страна",
    colMessenger: "Мессенджер",
    colStatus: "Статус",
    empty: "Клиенты не найдены.",
    dbOffline: "База недоступна — показаны локальные регистрации",
    loadFailed: "Не удалось загрузить пользователей",
    block: "Заблокировать",
    unblock: "Разблокировать",
    statusBlocked: "ЗАБЛОКИРОВАН",
    confirmDelete: "Удалить клиента {name}?",
    confirmBlock:
      "Заблокировать {name}? Email {email} и телефон {phone} не смогут создавать бронирования.",
    actionFailed: "Не удалось выполнить действие.",
  },
  login: {
    title: "Вход администратора",
  },
  pages: {
    overview: {
      title: "Консоль операций",
      body: "Управление партнёрами, объявлениями, бронированиями и контентом главной.",
    },
    users: {
      title: "Каталог пользователей",
      body: "Клиентские и партнёрские аккаунты.",
    },
    directory: {
      title: "Каталог аккаунтов",
      body: "Единый обзор пользователей и партнёров.",
    },
    partners: {
      title: "Заявки партнёров",
      body: "Заявки на одобрение, активные компании/частные партнёры и отклонённые запросы.",
    },
    moderation: {
      title: "Модерация",
      body: "Выберите раздел: объявления автомобилей или отзывы клиентов.",
    },
    reviews: {
      title: "Модерация отзывов",
      body: "Проверка отзывов перед публикацией.",
    },
    financials: {
      title: "Финансы админа",
      body: "Выручка по бронированиям и выплаты партнёрам.",
    },
    homepage: {
      title: "Контент главной",
      body: "Категории, популярные аэропорты, блоки Why & How и отзывы Google Maps.",
    },
    cars: {
      title: "Автомобили",
      body: "Все автомобили на сайте. Код каждого объявления — государственный номер.",
    },
    homepageSearch: {
      title: "Страны поиска на главной",
      body: "Выберите страны и аэропорты для формы поиска.",
    },
    delivery: {
      title: "Локации и аэропорты доставки",
      body: "Каталог аэропортов доставки и цен.",
    },
    extras: {
      title: "Дополнительные услуги",
      body: "Услуги, которые могут предлагать партнёры.",
    },
    analytics: {
      title: "Статистика бронирований",
      body: "Обзор трафика и бронирований.",
    },
    settings: {
      title: "Аккаунт администратора",
      body: "Обновите данные входа администратора.",
      platformTitle: "Настройки платформы",
    },
    customBooking: {
      title: "Онлайн-чат для бронирований",
      body: "Чаты бронирования с сайта. Непрочитанные чаты выделены сверху.",
    },
    bookings: {
      title: "Бронирования",
      body: "Все бронирования сайта с номерами 11R1000+. Фильтр по статусу и поиск по цифрам.",
    },
    integrations: {
      title: "Интеграции партнёров",
      body: "API-ключи, webhook-синхронизация, маппинг, Test Connection и ручной режим.",
    },
    integrationsSandbox: {
      title: "Песочница интеграций",
      body: "Полный цикл mock-партнёра: pull автопарка, доступность и блокировка дат — без реального поставщика.",
    },
    help: {
      title: "Помощь",
      body: "Редактируйте категории, темы и статьи центра помощи на странице /help.",
    },
    businessPartners: {
      title: "Бизнес-партнёры",
      body: "Выберите раздел: модерация, инвойс, статистика или список партнёров.",
      back: "Бизнес-партнёры",
      moderationTitle: "Модерация новых партнёров",
      moderationBody: "Одобрите или отклоните заявки с /partnership.",
      countriesTitle: "Инвойс",
      countriesBody: "Инвойсы партнёров и документы выплат.",
      statsTitle: "Финансовая статистика",
      statsBody: "Тарифы и месячный прогноз по активным партнёрам.",
      listTitle: "Список партнёров",
      listBody: "Одобренные партнёры, реферальные коды и QR-ссылки.",
      tabModeration: "Модерация",
      tabCountries: "Инвойс",
      tabStats: "Статистика",
      tabList: "Партнёры",
      tabHistory: "История",
    },
  },
  bookingsList: {
    sectionAll: "Бронирования",
    sectionActive: "Активные",
    sectionCompleted: "Завершённые",
    sectionCancelled: "Отменённые",
    sectionIncomplete: "Несостоявшиеся",
    searchLabel: "Поиск номера брони",
    searchDigitsPlaceholder: "1000",
    empty: "Бронирований пока нет.",
    editTitle: "Редактировать бронь",
    colFirstName: "Имя",
    colLastName: "Фамилия",
    colEmail: "Email",
    colPickup: "Получение",
    colDropoff: "Возврат",
    colPaidOnSite: "Оплачено на сайте",
    colTotal: "Полная сумма брони",
    confirmDelete: "Удалить бронирование {ref}?",
    saveFailed: "Не удалось сохранить бронирование.",
    deleteFailed: "Не удалось удалить бронирование.",
    details: "Детали",
    markUnfulfilled: "Несостоявшееся",
    confirmUnfulfilled:
      "Отметить {ref} как несостоявшееся? Партнёр увидит его в разделе «Несостоявшиеся».",
    markUnfulfilledFailed: "Не удалось отметить бронирование как несостоявшееся.",
    statusUnfulfilled: "Несостоявшееся",
  },
  sections: {
    googleReviews: "Отзывы Google Maps",
    googleReviewsHelp:
      "Вставьте ссылку места Google Maps и сохраните. Старые отзывы удаляются и заменяются отзывами этой ссылки. На главной — только выбранные оценки (4.8 / 4.9 / 5.0). Нужен GOOGLE_PLACES_API_KEY.",
    googleReviewsOn: "Отзывы Google включены на главной.",
    googleReviewsOff: "Отзывы Google выключены на главной.",
    googleReviewsRatings: "Показывать отзывы",
    googleReviewsRatingsHelp: "В админке и на главной видны только отзывы не ниже выбранной минимальной оценки.",
    mapsUrl: "URL места Google Maps",
    saveRefreshReviews: "Сохранить и обновить отзывы",
    saveUrlOnly: "Только сохранить URL",
    infoBlocks: "Блоки Why & How",
    partnerBanner: "Баннер партнёра",
    partnerBannerHelp: "Показать или скрыть блок «Стать партнёром» на главной.",
    partnerBannerOn: "Баннер партнёра включён на главной.",
    partnerBannerOff: "Баннер партнёра выключен на главной.",
    categories: "Категории авто",
    popularAirports: "Популярные аэропорты",
    operatingCountries: "Страны работы",
    footerContact: "Контактная полоса в футере",
    footerContactHelp:
      "Телефон, email и адрес в тёмной полосе над строкой копирайта в футере сайта.",
    footerContactSaved: "Контакты сохранены — видны в футере на главной.",
    footerPhone: "Телефон",
    footerEmail: "Публичный email (футер)",
    footerInboxEmail: "Email для формы контакта",
    footerInboxEmailHelp:
      "Сюда приходят все сообщения из окна «Отправить сообщение». Если пусто — используется публичный email.",
    footerAddress: "Адрес",
    legalPages: "Условия и конфиденциальность",
    legalPagesHelp:
      "Редактируйте текст условий обслуживания и конфиденциальности (и при желании PDF/изображение). Контент отображается на /terms и /privacy по ссылкам в футере.",
    legalPagesSaved: "Сохранено — видно на публичном сайте.",
    legalTerms: "Условия обслуживания",
    legalTermsHelp: "Отображается на /terms (футер: условия).",
    legalPrivacy: "Конфиденциальность",
    legalPrivacyHelp: "Отображается на /privacy (футер: конфиденциальность).",
    legalBody: "Текст страницы",
    legalFile: "Файл (необязательно)",
    legalFileHint: "PDF, PNG или JPG — макс. 20 МБ",
    legalUpload: "Загрузить файл",
    legalReplace: "Заменить файл",
    legalRemoveFile: "Удалить файл",
    legalOpenFile: "Открыть файл",
    bookingChannels: "Каналы бронирования",
    bookingChannelsHelp:
      "Включите каналы под полем телефона в окне брони на главной. Гость выбирает один, чтобы начать.",
    channelOnline: "Онлайн-чат",
    channelOnlineHelp: "Открывает чат на сайте (входящие админа / AB-коды).",
    channelTelegram: "Telegram",
    channelWhatsapp: "WhatsApp",
    channelViber: "Viber",
    telegramContact: "Контакт Telegram",
    channelNumber: "номер",
    telegramPlaceholder: "@yourchannel или 995555000000",
    phonePlaceholder: "995555000000",
    liveBotsTitle: "Боты Telegram (Live Chat)",
    liveBotsHelp:
      "Добавьте ботов и отметьте один активным. Если ИИ не может ответить и гость просит оператора, сообщения придут этому боту. Одновременно один чат, остальные в очереди.",
    liveBotActive: "Активен",
    liveBotName: "Имя",
    liveBotNamePh: "напр. Главный оператор",
    liveBotChatId: "Chat ID (админ / группа)",
    liveBotChatPh: "напр. 123456789",
    liveBotTokenSaved: "сохранён — введите новый токен для замены",
    liveBotsEmpty: "Ботов пока нет. Добавьте и отметьте активным.",
    liveBotAdd: "бота",
    countries: "Страны",
    countriesHelp:
      "Показаны все страны. Включите аэропорт или город — они появятся в поиске на главной.",
    searchCountryPh: "Поиск страны…",
    onHomepage: "На главной",
    hidden: "Скрыто",
    individualBooking: "Индивидуальная бронь",
    enableAll: "Включить все",
    hideCountry: "Скрыть страну",
    filterPlacesPh: "Фильтр аэропортов и городов…",
    airports: "Аэропорты",
    cities: "Города",
    city: "Город",
    noPlaces: "Для этой страны аэропорты и города ещё не добавлены.",
    noCountryYet: "Ни одна страна не включена. Выберите локации справа.",
    placesHelp: "Включите аэропорты и города для поиска на главной.",
    liveBotSavedNote: "Активный бот получает сообщения live-chat, если ИИ не может ответить или гость просит оператора.",
    botUsername: "Имя пользователя бота",
    botToken: "Токен бота",
    addedFromDelivery: "Добавлено из доставки",
    footerAddressPh: "Тбилиси, Грузия",
  },
  editor: {
    categoriesHelp: "Перетащите карточки за ручку, чтобы изменить порядок. Здесь и на главной видны только включённые категории.",
    manageVisibility: "Видимость категорий",
    hideVisibility: "Скрыть видимость",
    enabledOnHomepage: "{on}/{total} включено на главной",
    visibilityHelp: "Включайте и выключайте категории для фильтра на главной. Новую добавьте ниже.",
    noCategoriesYet: "Категорий пока нет",
    addCategory: "Добавить категорию",
    updateCategory: "Обновить категорию",
    categoryNamePh: "Название категории",
    categoryNameExamplePh: "Название категории (напр. Luxury)",
    imageUrl: "URL изображения",
    addAndShow: "Добавить и показать на главной",
    saveChanges: "Сохранить изменения",
    editMap: "Изменить",
    noModelsMapped: "Модели ещё не привязаны",
    mappedModels: "Привязанные марки и модели",
    mappedModelsHelp: "Партнёр с подходящей маркой/моделью попадёт сюда автоматически.",
    cardsDrag: "{n} карточек — перетащите для порядка.",
    homepageLayout: "Макет главной",
    slider: "Слайдер",
    sliderHelp: "Ряд + стрелки",
    grid: "Сетка",
    gridHelp: "3 колонки",
    addAirport: "Добавить аэропорт",
    addAirportCard: "Карточка аэропорта",
    updateAirportCard: "Обновить карточку",
    airportTitlePh: "Название, напр. Kutaisi International Airport (KUT)",
    iataPh: "Код IATA (KUT)",
    orUploadImage: "Или загрузите изображение",
    deleteCategoryConfirm: "Удалить эту категорию с главной?",
    deleteAirportConfirm: "Удалить эту карточку аэропорта?",
    categoryNameRequired: "Нужно название категории",
    imageRequired: "Нужен URL изображения или загрузка",
    airportRequired: "Нужны название аэропорта и код IATA",
    couldNotSaveCategory: "Не удалось сохранить категорию",
    couldNotDeleteCategory: "Не удалось удалить категорию",
    couldNotSaveAirport: "Не удалось сохранить аэропорт",
    couldNotDeleteAirport: "Не удалось удалить аэропорт",
    couldNotUpdateVisibility: "Не удалось обновить видимость",
    couldNotSaveCategoryOrder: "Не удалось сохранить порядок категорий",
    couldNotSaveAirportOrder: "Не удалось сохранить порядок аэропортов",
    couldNotSaveLayout: "Не удалось сохранить макет",
  },
};

const DICTS: Partial<Record<AdminLocale, AdminDictionary>> & { en: AdminDictionary } = {
  en,
  ka,
  ru,
};

export function getAdminDictionary(locale: AdminLocale | string | null | undefined): AdminDictionary {
  if (locale === "en" || locale === "ka" || locale === "ru") {
    return DICTS[locale] ?? DICTS.en;
  }
  if (!locale) return DICTS[DEFAULT_ADMIN_LOCALE] ?? DICTS.en;
  return withAdminExtra(DICTS.en, locale);
}
