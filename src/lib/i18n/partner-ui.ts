/** Partner portal form copy (personal info + create car). Locales: en / ka / ru. */

export type PartnerCommonCopy = {
  save: string;
  saving: string;
  delete: string;
  remove: string;
  cancel: string;
  upload: string;
  replace: string;
  select: string;
  requiredFields: string;
  currency: string;
  saveFailed: string;
  uploadFailed: string;
  dbOffline: string;
};

export type PartnerPersonalInfoCopy = {
  subtitle: string;
  sections: {
    main: string;
    workDays: string;
    payment: string;
    tariff: string;
    contract: string;
    password: string;
  };
  mainInfo: string;
  contacts: string;
  logo: string;
  logoHint: string;
  brandName: string;
  legalName: string;
  firstName: string;
  lastName: string;
  country: string;
  centralOffice: string;
  address: string;
  clientLanguages: string;
  deliveryCountries: string;
  deliveryHelp: string;
  selectCountry: string;
  selectLocation: string;
  noLocations: string;
  locationRequired: string;
  countriesNeedLocation: string;
  countriesNeedOne: string;
  countriesSavedLocal: string;
  primaryPhone: string;
  secondPhone: string;
  email: string;
  website: string;
  workingDays: string;
  pricingCurrency: string;
  currencyHelp: string;
  prepTime: string;
  prepMinutes: string;
  publicHolidays: string;
  publicHolidaysHelp: string;
  addDate: string;
  holidayPrompt: string;
  offHoursService: string;
  offHoursPrice: string;
  paymentMethods: string;
  requireCard: string;
  requireCardHelp: string;
  depositMethods: string;
  cashRefundDays: string;
  tariffHelp: string;
  fromDays: string;
  toDays: string;
  addInterval: string;
  contractHelp: string;
  contractFile: string;
  contractHint: string;
  contractUploadFailed: string;
  contractRemove: string;
  activateOwnContract: string;
  ownContractActive: string;
  siteContractTitle: string;
  siteContractHelp: string;
  siteContractEnable: string;
  siteContractOn: string;
  siteContractOff: string;
  siteContractMissing: string;
  siteContractLockedOwn: string;
  siteContractAutoOn: string;
  passwordTitle: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  stopService: string;
  stopServiceHelp: string;
  remodeation: string;
  locked: string;
  alreadyInList: string;
  saved: string;
  savedRemoderation: string;
  savedForAdminReview: string;
  passwordMismatch: string;
  passwordTooShort: string;
  passwordNotAvailable: string;
  locationsLoadError: string;
  logoUploadFailed: string;
  saveFailed: string;
  pendingSave: string;
  pendingRemove: string;
  unlockedUntil: string;
  fieldRequired: string;
  invalidEmail: string;
  invalidWebsite: string;
  invalidPhone: string;
  logoRequired: string;
  messengersRequired: string;
  messengersHint: string;
  days: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
};

export type PartnerCreateCarPickupCopy = {
  cityDelivery: string;
  rentalOffice: string;
  city: string;
  place: string;
  delivery: string;
  oneWayPrice: string;
  freeAfterDays: string;
  travelTime: string;
  emptyPickup: string;
  selected: string;
  pickCities: string;
  pickLocationsHelp: string;
  addLocation: string;
  selectLocation: string;
  allLocationsAdded: string;
  freeAfterTitle: string;
  freeAfterHelp: string;
  hours: string;
  minutes: string;
};

export type PartnerCreateCarCopy = {
  sections: {
    mainInfo: string;
    pickup: string;
    price: string;
    pricing: string;
    mileage: string;
    insurance: string;
    extras: string;
    specs: string;
    music: string;
    photo: string;
    certificate: string;
  };
  brand: string;
  model: string;
  bodyColor: string;
  bodyType: string;
  registration: string;
  year: string;
  licenseCat: string;
  minDriverAge: string;
  minLicenseYears: string;
  priceNote: string;
  tariffHelp: string;
  dailyPrice: string;
  daysRange: string;
  days31: string;
  daysPlus: string;
  deposit: string;
  franchise: string;
  franchiseHelp: string;
  cardRequired: string;
  mileageLimit: string;
  kmPerDay: string;
  saveSales: string;
  saveInternal: string;
  update: string;
  errUpdateFailed: string;
  errUpdateDelivery: string;
  errUpdateExtra: string;
  errUpdateInvalid: string;
  errUpdateDuplicate: string;
  errUpdateMissing: string;
  savedUpdate: string;
  savedUpdatePending: string;
  savedUpdateRemoderation: string;
  selectBrand: string;
  selectModel: string;
  selectModelFirst: string;
  // Specs
  general: string;
  engine: string;
  chassis: string;
  seats: string;
  doors: string;
  airConditioning: string;
  interior: string;
  roof: string;
  poweredWindows: string;
  airbags: string;
  steeringSide: string;
  cruiseControl: string;
  rearViewCamera: string;
  parkingAssist: string;
  fuel: string;
  engineVolume: string;
  enginePower: string;
  fuelTank: string;
  fuelConsumption: string;
  transmission: string;
  drive: string;
  automatic: string;
  manual: string;
  // Photo / certificate
  selectFiles: string;
  uploading: string;
  cover: string;
  coverHint: string;
  coverNeedIdentity: string;
  coverStyleFailed: string;
  dragImage: string;
  photoFormats: string;
  certPrivate: string;
  front: string;
  back: string;
  notUploaded: string;
  selectFront: string;
  selectBack: string;
  dragCert: string;
  certFormats: string;
  insuranceUploadTitle: string;
  insuranceExpiresAtLabel: string;
  insuranceExpiresAtHelp: string;
  removeFile: string;
  insurancePdfLabel: string;
  // Seasonal / price table
  seasonalPricing: string;
  seasonalHelp: string;
  addSeasonsHint: string;
  addSeason: string;
  seasonSaved: string;
  seasonOnlyYearRound: string;
  seasonalActive: string;
  seasonYearRoundHint: string;
  seasonCol: string;
  periodCol: string;
  // Extras table
  extrasTitle: string;
  extrasPricePerDay: string;
  extrasMin: string;
  extrasMax: string;
  extrasSelection: string;
  extrasEmpty: string;
  free: string;
  enabled: string;
  /** Partner turns service off — hidden from customers */
  disabled: string;
  /** Locked mandatory free extra from admin */
  mandatory: string;
  mandatoryMustStayOn: string;
  /** Partner marks territory/service as not allowed for customers */
  forbidden: string;
  forbiddenHelp: string;
  // Validation
  errBrandModel: string;
  errColorBody: string;
  errPlateRequired: string;
  errPlateFormat: string;
  errPlateTaken: string;
  errDailyPrice: string;
  errPhotos: string;
  errCertificate: string;
  errInsurance: string;
  errInsuranceExpiresAt: string;
  errCertificateInsurance: string;
  errPickup: string;
  errDeliveryPlace: string;
  errNoAirports: string;
  errCreateFailed: string;
  deliveryAdjusted: string;
  continue: string;
  pickup: PartnerCreateCarPickupCopy;
};

export type PartnerUiPack = {
  common: PartnerCommonCopy;
  personalInfo: PartnerPersonalInfoCopy;
  createCar: PartnerCreateCarCopy;
};

export const partnerUiEn: PartnerUiPack = {
  common: {
    save: "Save",
    saving: "Saving…",
    delete: "Delete",
    remove: "Remove",
    cancel: "Cancel",
    upload: "Upload",
    replace: "Replace",
    select: "Select",
    requiredFields: "Please fill in the highlighted required fields.",
    currency: "Currency",
    saveFailed: "Save failed",
    uploadFailed: "Upload failed",
    dbOffline: "Database unavailable. Start Postgres and try again.",
  },
  personalInfo: {
    subtitle: "Company profile and operations — edit every section.",
    sections: {
      main: "Main information",
      workDays: "Work and not work days",
      payment: "Payment and deposit",
      tariff: "Tariff",
      contract: "Contract",
      password: "Password and service",
    },
    mainInfo: "Main information",
    contacts: "Contacts",
    logo: "Logo",
    logoHint: "Square PNG/JPG",
    brandName: "Brand name",
    legalName: "Legal name",
    firstName: "First name",
    lastName: "Last name",
    country: "Country",
    centralOffice: "Central office location",
    address: "Central office address",
    clientLanguages: "Languages available for client communication",
    deliveryCountries: "Operating countries",
    deliveryHelp:
      "Choose any country and its airports/cities. After you save, the request goes to admin. Only after admin confirms do those locations become available when you add a car (and on the public search once activated).",
    selectCountry: "Select country",
    selectLocation: "Select location",
    noLocations: "No locations listed for this country yet",
    locationRequired: "Select at least one location before saving this country.",
    countriesNeedLocation: "For each country, pick at least one location, then press Save.",
    countriesNeedOne: "Select at least one country, then press Save.",
    countriesSavedLocal: "Countries and locations saved to the list. Press page Save to store the profile.",
    primaryPhone: "Primary mobile number",
    secondPhone: "Second phone",
    email: "Email",
    website: "Website",
    workingDays: "Working days",
    pricingCurrency: "Pricing currency",
    currencyHelp: "Default is USD. Amounts you enter use this currency; public site converts for visitors.",
    prepTime: "The time required to prepare a car between bookings",
    prepMinutes: "Specify time in minutes",
    publicHolidays: "Public holidays",
    publicHolidaysHelp:
      "On these days it is not possible to rent or return cars, even at extra cost.",
    addDate: "Add date",
    holidayPrompt: "Add holiday date (YYYY-MM-DD)",
    offHoursService: "Service at non-business hours",
    offHoursPrice: "Price for off-hours",
    paymentMethods: "Payment methods for rent",
    requireCard: "A credit card is required even if there is no deposit or the deposit is made another way",
    requireCardHelp: "If checked, your cars are hidden for customers who search without a credit card.",
    depositMethods: "Deposit retention methods",
    cashRefundDays: "Cash deposit refund delay (days)",
    tariffHelp: "Day ranges used on Create auto pricing. Add or edit intervals here.",
    fromDays: "From days",
    toDays: "To days",
    addInterval: "Add interval",
    contractHelp:
      "Upload your rental contract (PDF or image). Customers will open it from the checkout agreement checkbox before they can complete a booking.",
    contractFile: "Contract file",
    contractHint: "PDF, PNG or JPG — max 20 MB",
    contractUploadFailed: "Contract upload failed",
    contractRemove: "Remove contract",
    activateOwnContract: "Activate my contract",
    ownContractActive: "Your contract is active for checkout",
    siteContractTitle: "Site contract",
    siteContractHelp:
      "Prepared contract uploaded by the administrator. Enable it when you are not using your own contract.",
    siteContractEnable: "Enable site contract",
    siteContractOn: "Enabled",
    siteContractOff: "Disabled",
    siteContractMissing: "Administrator has not uploaded a site contract yet.",
    siteContractLockedOwn: "Turned off while your own contract is active.",
    siteContractAutoOn: "Enabled automatically — you have no own contract uploaded.",
    passwordTitle: "Password",
    oldPassword: "Old password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    stopService: "Stop service",
    stopServiceHelp:
      "If you stop the service, your partner account becomes inactive for new public listings. Existing data is kept for admin review.",
    remodeation:
      "Profile changes are waiting for admin remoderation. Your listings stay hidden in search until approved.",
    locked: "Locked",
    alreadyInList: "This country is already in the saved list.",
    saved: "Saved",
    savedRemoderation: "Saved — awaiting remoderation",
    savedForAdminReview: "Saved. Changes were sent to admin for review.",
    passwordMismatch: "New password and confirmation do not match.",
    passwordTooShort: "New password must be at least 6 characters.",
    passwordNotAvailable: "Company settings saved. Password change is not available in this build yet.",
    locationsLoadError: "Could not load locations",
    logoUploadFailed: "Logo upload failed",
    saveFailed: "Save failed",
    pendingSave: "(pending Save)",
    pendingRemove: "(pending remove)",
    unlockedUntil: "Unlocked until",
    fieldRequired: "This field is required",
    invalidEmail: "Enter a valid email address",
    invalidWebsite: "Enter a website (e.g. example.com)",
    invalidPhone: "Enter a phone number with country code",
    logoRequired: "Upload a company logo",
    messengersRequired: "Select at least one messenger for this number (WhatsApp, Telegram, or Viber)",
    messengersHint: "Mark apps active on this phone — shown to customers after booking",
    days: {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    },
  },
  createCar: {
    sections: {
      mainInfo: "Main information",
      pickup: "Pick-up & Drop-off",
      price: "Price and conditions",
      pricing: "Pricing",
      mileage: "Mileage",
      insurance: "Insurance",
      extras: "Additional services",
      specs: "Car specifications",
      music: "Music",
      photo: "Photo",
      certificate: "Technical passport and insurance",
    },
    brand: "Brand",
    model: "Model",
    bodyColor: "Body color",
    bodyType: "Car category",
    registration: "Registration number",
    year: "Year of manufacture",
    licenseCat: "Mandatory category of driver's license",
    minDriverAge: "Minimum driver age",
    minLicenseYears: "Minimum license years",
    priceNote: "A platform service fee will be added on top of the prices you set here.",
    tariffHelp: "Day ranges come from Personal info → Tariff. Enter per-day prices here.",
    dailyPrice: "Daily price",
    daysRange: "days",
    days31: "31+ days",
    daysPlus: "{n}+ days",
    deposit: "Deposit at pick-up",
    franchise: "Franchise / deductible",
    franchiseHelp:
      "Off = zero. On = enter a percent of the security deposit deducted as franchise / excess (shown to customers).",
    cardRequired: "A credit card is required to rent this car",
    mileageLimit: "Mileage limit",
    kmPerDay: "Km per day",
    saveSales: "Save and add to sales",
    saveInternal: "Save for internal use",
    update: "Update",
    errUpdateFailed: "Failed to update car",
    errUpdateDelivery: "A selected city or airport is not stored in the database, so the listing was not saved.",
    errUpdateExtra: "An additional service is missing from the catalog, so the listing was not saved.",
    errUpdateInvalid: "One of the fields has an invalid value, so the listing was not saved.",
    errUpdateDuplicate: "A duplicate value blocked the save.",
    errUpdateMissing: "This listing no longer exists.",
    savedUpdate: "The listing was updated.",
    savedUpdatePending: "The listing was updated and is waiting for moderation.",
    savedUpdateRemoderation:
      "The listing was updated and sent back to moderation. It stays hidden in search until an admin approves it.",
    selectBrand: "Select brand",
    selectModel: "Select model",
    selectModelFirst: "Select brand first",
    general: "General",
    engine: "Engine",
    chassis: "Chassis",
    seats: "Seats",
    doors: "Number of doors",
    airConditioning: "Air conditioning",
    interior: "Interior",
    roof: "Roof",
    poweredWindows: "Powered windows",
    airbags: "Airbags",
    steeringSide: "Steering wheel side",
    cruiseControl: "Cruise control",
    rearViewCamera: "Rear view camera",
    parkingAssist: "Parking assist",
    fuel: "Fuel",
    engineVolume: "Engine Volume, (l.)",
    enginePower: "Engine Power, HP",
    fuelTank: "Fuel tank (L)",
    fuelConsumption: "Fuel consumption, l/100 km",
    transmission: "Transmission",
    drive: "Drive",
    automatic: "Automatic",
    manual: "Manual",
    selectFiles: "Select files",
    uploading: "Uploading…",
    cover: "Cover",
    coverHint:
      "The photo in the first slot is the cover. Drag photos to change the order.",
    coverNeedIdentity: "Choose the make, model, year, and color before the cover photo.",
    coverStyleFailed: "The studio cover could not be created. Try again.",
    dragImage: "Drag the image or",
    photoFormats: "PNG, JPG, GIF up to 20 Mb · original files kept · min {n}",
    certPrivate: "Image and info will not be available to clients.",
    front: "Front",
    back: "Back",
    notUploaded: "Not uploaded",
    selectFront: "Select front",
    selectBack: "Select back",
    dragCert: "Drag an image or PDF here, or",
    certFormats: "PNG, JPG, GIF, PDF up to 20 Mb · images auto-optimized",
    insuranceUploadTitle: "Insurance file upload",
    insuranceExpiresAtLabel: "Insurance valid until",
    insuranceExpiresAtHelp: "Enter the expiry date from the insurance document. On that date the listing returns to moderation and is hidden from search until approved again.",
    removeFile: "Remove",
    insurancePdfLabel: "PDF file",
    seasonalPricing: "Seasonal pricing",
    seasonalHelp:
      "Add a season, save the dates, then turn this on to apply those period prices.",
    addSeasonsHint: "Press Add season to create a period, then save it.",
    addSeason: "Add season",
    seasonSaved: "Season period saved.",
    seasonOnlyYearRound:
      "Only year-round Season #1 is available. Open Personal info → Price seasons, add period dates, save, then return here.",
    seasonalActive: "Seasonal rates from the section above will be used for matching booking dates.",
    seasonYearRoundHint:
      "Season #1 is fixed year-round. Enable extra seasons on your account information page to show additional rows here.",
    seasonCol: "Season",
    periodCol: "Period",
    extrasTitle: "Title",
    extrasPricePerDay: "Price per day",
    extrasMin: "Min",
    extrasMax: "Max",
    extrasSelection: "Selection",
    extrasEmpty: "Extra services catalog is empty. Admin can configure extras; you can still save the car.",
    free: "Free",
    enabled: "Enabled",
    disabled: "Off",
    mandatory: "Mandatory",
    mandatoryMustStayOn: "Must stay active — shown free to customers",
    forbidden: "Forbidden",
    forbiddenHelp: "Shown to customers as a red notice at the end of additional services",
    errBrandModel: "Brand and model are required.",
    errColorBody: "Body color and car category are required.",
    errPlateRequired: "Registration number is required (Latin letters and digits).",
    errPlateFormat: "Registration number: only Latin letters and digits, no spaces or symbols (e.g. AA123BB).",
    errPlateTaken:
      "A car with this registration number is already registered. You cannot submit or save another listing with the same plate.",
    errDailyPrice: "Enter at least one daily price in Pricing (tariff day ranges).",
    errPhotos: "Upload at least {n} gallery photos (Photo section).",
    errCertificate: "Upload both sides of the vehicle registration certificate.",
    errInsurance: "Upload the insurance document.",
    errInsuranceExpiresAt: "Enter the insurance expiry date.",
    errCertificateInsurance: "Upload the technical passport (both sides) and insurance document.",
    errPickup: "Select at least one Pick-up & Drop-off location for this car.",
    errDeliveryPlace: "Enable at least one delivery place (airport / city / office).",
    errNoAirports: "No operating airports on your partner profile. Contact admin before listing.",
    errCreateFailed: "Failed to create car",
    deliveryAdjusted: "Delivery prices adjusted",
    continue: "Continue",
    pickup: {
      cityDelivery: "City delivery",
      rentalOffice: "Rental office",
      city: "City",
      place: "Place",
      delivery: "Delivery",
      oneWayPrice: "One way price",
      freeAfterDays: "Free after .. days",
      travelTime: "Travel time",
      emptyPickup:
        "No operating locations are linked in your personal info yet. Add countries and locations there (and wait for admin approval if needed) — they will appear in the dropdown below.",
      selected: "Selected:",
      pickCities: "Open the list and tick cities available for this car.",
      pickLocationsHelp:
        "Choose which of your activated profile locations this car can be picked up / delivered to. Each car has its own selection.",
      addLocation: "Add location for this car",
      selectLocation: "Select location",
      allLocationsAdded: "All your locations are already added",
      freeAfterTitle: "Delivery becomes free when rental is longer than this many days",
      freeAfterHelp:
        "Free after N days: if the booking is longer than N days, delivery price is {symbol}0. Travel time: minimum notice before pickup for this place (listing is hidden when pickup is sooner). Leave 0 to use the platform default of 2 hours.",
      hours: "h",
      minutes: "min",
    },
  },
};

export const partnerUiKa: PartnerUiPack = {
  common: {
    save: "შენახვა",
    saving: "ინახება…",
    delete: "წაშლა",
    remove: "წაშლა",
    cancel: "გაუქმება",
    upload: "ატვირთვა",
    replace: "შეცვლა",
    select: "აირჩიეთ",
    requiredFields: "გთხოვთ შეავსოთ მონიშნული სავალდებულო ველები.",
    currency: "ვალუტა",
    saveFailed: "შენახვა ვერ მოხერხდა",
    uploadFailed: "ატვირთვა ვერ მოხერხდა",
    dbOffline: "მონაცემთა ბაზა მიუწვდომელია. გაუშვით Postgres და სცადეთ ხელახლა.",
  },
  personalInfo: {
    subtitle: "კომპანიის პროფილი და ოპერაციები — გადახედეთ ყველა სექციას რედაქტირებისთვის.",
    sections: {
      main: "ძირითადი ინფორმაცია",
      workDays: "სამუშაო და არასამუშაო დღეები",
      payment: "გადახდა და დეპოზიტი",
      tariff: "ტარიფი",
      contract: "ხელშეკრულება",
      password: "პაროლი და სერვისი",
    },
    mainInfo: "ძირითადი ინფორმაცია",
    contacts: "კონტაქტები",
    logo: "ლოგო",
    logoHint: "კვადრატული PNG/JPG",
    brandName: "საფირმო სახელი",
    legalName: "იურიდიული სახელი",
    firstName: "სახელი",
    lastName: "გვარი",
    country: "ქვეყანა",
    centralOffice: "ცენტრალური ოფისის მდებარეობა",
    address: "ცენტრალური ოფისის მისამართი",
    clientLanguages: "კლიენტთან კომუნიკაციისთვის ხელმისაწვდომი ენები",
    deliveryCountries: "ოპერირების ქვეყნები",
    deliveryHelp:
      "აირჩიეთ ნებისმიერი ქვეყანა და მისი აეროპორტები/ქალაქები. შენახვის შემდეგ მოთხოვნა მიდის ადმინთან. მხოლოდ ადმინის დადასტურების შემდეგ გამოჩნდება ეს ლოკაციები მანქანის დამატებისას (და მთავარ გვერდის ძებნაში — გააქტიურების შემდეგ).",
    selectCountry: "აირჩიეთ ქვეყანა",
    selectLocation: "აირჩიეთ ლოკაცია",
    noLocations: "ამ ქვეყნისთვის ლოკაციები ჯერ არ არის ჩამონათვალში",
    locationRequired: "ლოკაციის არჩევა სავალდებულოა ამ ქვეყნის შენახვამდე.",
    countriesNeedLocation: "ყოველი ქვეყნისთვის აირჩიეთ მინიმუმ ერთი ლოკაცია, შემდეგ დააჭირეთ შენახვას.",
    countriesNeedOne: "აირჩიეთ მინიმუმ ერთი ქვეყანა, შემდეგ დააჭირეთ შენახვას.",
    countriesSavedLocal: "ქვეყნები და ლოკაციები სიაშია. პროფილის შესანახად დააჭირეთ გვერდის შენახვას.",
    primaryPhone: "ძირითადი მობილური ტელეფონის ნომერი",
    secondPhone: "მეორე ტელეფონი",
    email: "ელ. ფოსტა",
    website: "ვებსაიტი",
    workingDays: "სამუშაო დღეები",
    pricingCurrency: "ფასების ვალუტა",
    currencyHelp: "ნაგულისხმევი არის USD. შეყვანილი თანხები ამ ვალუტაშია; საჯარო საიტი სტუმრის ვალუტაზე გადაიყვანს.",
    prepTime: "მანქანის მომზადებისთვის საჭირო დრო დაჯავშნებს შორის",
    prepMinutes: "მიუთითეთ დრო წუთებში",
    publicHolidays: "სახალხო დღესასწაულები",
    publicHolidaysHelp: "ამ დღეებში მანქანის გაქირავება ან დაბრუნება შეუძლებელია, თუნდაც დამატებითი საფასურით.",
    addDate: "თარიღის დამატება",
    holidayPrompt: "დაამატეთ დღესასწაულის თარიღი (YYYY-MM-DD)",
    offHoursService: "მომსახურება არასამუშაო საათებში",
    offHoursPrice: "ფასი არასამუშაო საათებისთვის",
    paymentMethods: "ქირის გადახდის მეთოდები",
    requireCard: "საკრედიტო ბარათი სავალდებულოა, თუნდაც დეპოზიტი სხვა გზით იყოს",
    requireCardHelp: "თუ ჩართულია, მანქანები დამალულია იმ კლიენტებისთვის, ვინც საკრედიტო ბარათის გარეშე ეძებს.",
    depositMethods: "დეპოზიტის შენახვის მეთოდები",
    cashRefundDays: "ნაღდი დეპოზიტის დაბრუნების ვადა (დღე)",
    tariffHelp: "დღეების ინტერვალები მანქანის დამატების ფასებში. აქ დაამატეთ ან შეცვალეთ.",
    fromDays: "დან (დღე)",
    toDays: "მდე (დღე)",
    addInterval: "ინტერვალის დამატება",
    contractHelp:
      "ატვირთეთ ქირავნობის ხელშეკრულება (PDF ან სურათი). მომხმარებელი ჯავშნისას ამ ფაილს გახსნის თანხმობის ტექსტიდან და მონიშვნის გარეშე ჯავშანს ვერ დაასრულებს.",
    contractFile: "ხელშეკრულების ფაილი",
    contractHint: "PDF, PNG ან JPG — მაქს. 20 მბ",
    contractUploadFailed: "ხელშეკრულების ატვირთვა ვერ მოხერხდა",
    contractRemove: "ხელშეკრულების წაშლა",
    activateOwnContract: "ჩემი ხელშეკრულების გააქტიურება",
    ownContractActive: "თქვენი ხელშეკრულება აქტიურია ჯავშნისთვის",
    siteContractTitle: "საიტის ხელშეკრულება",
    siteContractHelp:
      "ადმინისტრატორის მიერ ატვირთული გამზადებული ხელშეკრულება. ჩართეთ, თუ საკუთარი ხელშეკრულება არ გაქვთ გააქტიურებული.",
    siteContractEnable: "საიტის ხელშეკრულების ჩართვა",
    siteContractOn: "ჩართულია",
    siteContractOff: "გამორთულია",
    siteContractMissing: "ადმინისტრატორს ჯერ არ აუტვირთავს საიტის ხელშეკრულება.",
    siteContractLockedOwn: "გამორთულია, სანამ თქვენი ხელშეკრულება აქტიურია.",
    siteContractAutoOn: "ავტომატურად ჩართულია — საკუთარი ხელშეკრულება არ გაქვთ ატვირთული.",
    passwordTitle: "პაროლი",
    oldPassword: "ძველი პაროლი",
    newPassword: "ახალი პაროლი",
    confirmPassword: "გაიმეორეთ ახალი პაროლი",
    stopService: "სერვისის შეწყვეტა",
    stopServiceHelp:
      "თუ სერვისს შეწყვეტთ, ანგარიში გაუქმდება ახალი საჯარო განცხადებებისთვის. არსებული მონაცემები ადმინისთვის შენარჩუნდება.",
    remodeation:
      "პროფილის ცვლილებები ელოდება ადმინის ხელახალ მოდერაციას. განცხადებები ძიებაში დამალულია დამტკიცებამდე.",
    locked: "ჩაკეტილია",
    alreadyInList: "ეს ქვეყანა უკვე შენახულ სიაშია.",
    saved: "შენახულია",
    savedRemoderation: "შენახულია — ელოდება ხელახალ მოდერაციას",
    savedForAdminReview: "შენახულია. ცვლილებები გაიგზავნა ადმინის განსახილველად.",
    passwordMismatch: "ახალი პაროლი და დადასტურება არ ემთხვევა.",
    passwordTooShort: "ახალი პაროლი უნდაიყოს მინიმუმ 6 სიმბოლო.",
    passwordNotAvailable: "კომპანიის პარამეტრები შენახულია. პაროლის შეცვლა ამ ვერსიაში ჯერ არ არის ხელმისაწვდომი.",
    locationsLoadError: "ლოკაციების ჩატვირთვა ვერ მოხერხდა",
    logoUploadFailed: "ლოგოს ატვირთვა ვერ მოხერხდა",
    saveFailed: "შენახვა ვერ მოხერხდა",
    pendingSave: "(ელოდება შენახვას)",
    pendingRemove: "(ელოდება წაშლას)",
    unlockedUntil: "გახსნილია",
    fieldRequired: "ეს ველი სავალდებულოა",
    invalidEmail: "შეიყვანეთ სწორი ელ. ფოსტა",
    invalidWebsite: "შეიყვანეთ ვებსაიტი (მაგ. example.com)",
    invalidPhone: "შეიყვანეთ ტელეფონის ნომერი ქვეყნის კოდით",
    logoRequired: "ატვირთეთ კომპანიის ლოგო",
    messengersRequired: "ამ ნომერზე აირჩიეთ მინიმუმ ერთი მესენჯერი (WhatsApp, Telegram ან Viber)",
    messengersHint: "მონიშნეთ ამ ნომერზე აქტიური აპები — გამოჩნდება კლიენტისთვის ჯავშნის შემდეგ",
    days: {
      monday: "ორშაბათი",
      tuesday: "სამშაბათი",
      wednesday: "ოთხშაბათი",
      thursday: "ხუთშაბათი",
      friday: "პარასკევი",
      saturday: "შაბათი",
      sunday: "კვირა",
    },
  },
  createCar: {
    sections: {
      mainInfo: "ძირითადი ინფორმაცია",
      pickup: "აღება და დაბრუნება",
      price: "ფასი და პირობები",
      pricing: "ფასები",
      mileage: "გარბენი",
      insurance: "დაზღვევა",
      extras: "დამატებითი მომსახურეობა",
      specs: "მახასიათებლები",
      music: "მუსიკა",
      photo: "ფოტო",
      certificate: "ტექპასპორტი და დაზღვევა",
    },
    brand: "ბრენდი",
    model: "მოდელი",
    bodyColor: "ფერი",
    bodyType: "მანქანის კატეგორია",
    registration: "სახელმწიფო ნომერი",
    year: "გამოშვების წელი",
    licenseCat: "მართვის მოწმობის კატეგორია",
    minDriverAge: "მძღოლის მინიმალური ასაკი",
    minLicenseYears: "მართვის მოწმობის მინიმალური სტაჟი (წლები)",
    priceNote: "პლატფორმის საკომისიო დაემატება თქვენს ფასებს.",
    tariffHelp: "დღეების დიაპაზონები პირადი ინფოდან მოდის. აქ შეიყვანეთ დღიური ფასები.",
    dailyPrice: "დღიური ფასი",
    daysRange: "დღე",
    days31: "31+ დღე",
    daysPlus: "{n}+ დღე",
    deposit: "დეპოზიტი აღებისას",
    franchise: "ფრანშიზა / გამოქვითვა",
    franchiseHelp:
      "გამორთული = ნული. ჩართული = შეიყვანეთ დეპოზიტის პროცენტი, რომელიც გამოქვითვად / ფრანშიზად ჩანს კლიენტს.",
    cardRequired: "ამ მანქანის გასაქირავებლად საკრედიტო ბარათი სავალდებულოა",
    mileageLimit: "გარბენის ლიმიტი",
    kmPerDay: "კმ დღეში",
    saveSales: "შენახვა და გაყიდვაში დამატება",
    saveInternal: "შენახვა შიდა გამოყენებისთვის",
    update: "განახლება",
    errUpdateFailed: "მანქანის განახლება ვერ მოხერხდა",
    errUpdateDelivery: "არჩეული ქალაქი ან აეროპორტი ბაზაში არ ინახება, ამიტომ განცხადება არ შეინახა.",
    errUpdateExtra: "დამატებითი მომსახურეობა კატალოგში არ არის, ამიტომ განცხადება არ შეინახა.",
    errUpdateInvalid: "ერთ-ერთ ველს არასწორი მნიშვნელობა აქვს, ამიტომ განცხადება არ შეინახა.",
    errUpdateDuplicate: "განმეორებულმა მნიშვნელობამ შენახვა შეაჩერა.",
    errUpdateMissing: "ეს განცხადება აღარ არსებობს.",
    savedUpdate: "განცხადება განახლდა.",
    savedUpdatePending: "განცხადება განახლდა და მოდერაციას ელოდება.",
    savedUpdateRemoderation:
      "განცხადება განახლდა და ხელახალ მოდერაციაზე გაიგზავნა. ძიებაში გამოჩნდება ადმინის დამტკიცების შემდეგ.",
    selectBrand: "აირჩიეთ ბრენდი",
    selectModel: "აირჩიეთ მოდელი",
    selectModelFirst: "ჯერ აირჩიეთ ბრენდი",
    general: "ზოგადი",
    engine: "ძრავა",
    chassis: "შასი",
    seats: "ადგილები",
    doors: "კარების რაოდენობა",
    airConditioning: "კონდიციონერი",
    interior: "ინტერიერი",
    roof: "სახურავი",
    poweredWindows: "ელექტრო შუშები",
    airbags: "აირბაგები",
    steeringSide: "საჭის მხარე",
    cruiseControl: "კრუიზ-კონტროლი",
    rearViewCamera: "უკანა კამერა",
    parkingAssist: "პარკირების ასისტენტი",
    fuel: "საწვავი",
    engineVolume: "ძრავის მოცულობა (ლ)",
    enginePower: "ძრავის სიმძლავრე, ცხ.ძ.",
    fuelTank: "ავზი (ლ)",
    fuelConsumption: "ხარჯი, ლ/100 კმ",
    transmission: "ტრანსმისია",
    drive: "ამძრავი",
    automatic: "ავტომატური",
    manual: "მექანიკური",
    selectFiles: "ფაილების არჩევა",
    uploading: "იტვირთება…",
    cover: "ყდა",
    coverHint:
      "პირველ უჯრაში ატვირთული ფოტო არის ყდის სურათი. რიგის შესაცვლელად გადაათრიეთ ფოტოები.",
    coverNeedIdentity: "ყდის სურათისთვის ჯერ აირჩიეთ მარკა, მოდელი, წელი და ფერი.",
    coverStyleFailed: "ყდის სტუდიური სურათი ვერ შეიქმნა. სცადეთ თავიდან.",
    dragImage: "გადაიტანეთ სურათი ან",
    photoFormats: "PNG, JPG, GIF 20 მბ-მდე · ფაილი უცვლელი რჩება · მინ. {n}",
    certPrivate: "სურათი და ინფორმაცია კლიენტებისთვის ხელმისაწვდომი არ იქნება.",
    front: "წინა",
    back: "უკანა",
    notUploaded: "არ არის ატვირთული",
    selectFront: "წინას არჩევა",
    selectBack: "უკანას არჩევა",
    dragCert: "გადაიტანეთ სურათი ან PDF, ან",
    certFormats: "PNG, JPG, GIF, PDF 20 მბ-მდე · სურათები ავტომატურად იკუმშება",
    insuranceUploadTitle: "დაზღვევის ფაილის ატვირთვა",
    insuranceExpiresAtLabel: "დაზღვევის მოქმედების ვადა",
    insuranceExpiresAtHelp:
      "ჩაწერეთ დაზღვევის ფურცელზე მითითებული ვადა. ვადის დადგომისას განცხადება ავტომატურად გადავა მოდერაციაზე და საძიებოში აღარ გამოჩნდება დამტკიცებამდე.",
    removeFile: "წაშლა",
    insurancePdfLabel: "PDF ფაილი",
    seasonalPricing: "სეზონური ფასები",
    seasonalHelp:
      "დაამატეთ სეზონი, შეინახეთ თარიღები, შემდეგ ჩართეთ ეს ღილაკი იმ პერიოდის ფასების გამოსაყენებლად.",
    addSeasonsHint: "დააჭირეთ „სეზონის დამატება“, შემდეგ შეინახეთ პერიოდი.",
    addSeason: "სეზონის დამატება",
    seasonSaved: "სეზონის პერიოდი შენახულია.",
    seasonOnlyYearRound:
      "ხელმისაწვდომია მხოლოდ მთელი წლის სეზონი #1. გახსენით პირადი ინფო → ფასის სეზონები, დაამატეთ თარიღები, შეინახეთ და დაბრუნდით.",
    seasonalActive: "ზემოთ მოცემული სეზონური ტარიფები გამოყენებული იქნება შესაბამის თარიღებზე.",
    seasonYearRoundHint:
      "სეზონი #1 ფიქსირებულია მთელი წლისთვის. დამატებითი რიგებისთვის ჩართეთ სეზონები ანგარიშის გვერდზე.",
    seasonCol: "სეზონი",
    periodCol: "პერიოდი",
    extrasTitle: "დასახელება",
    extrasPricePerDay: "ფასი დღეში",
    extrasMin: "მინ",
    extrasMax: "მაქს",
    extrasSelection: "არჩევა",
    extrasEmpty: "დამატებითი სერვისების კატალოგი ცარიელია. ადმინს შეუძლია კონფიგურაცია; მანქანის შენახვა მაინც შეგიძლიათ.",
    free: "უფასო",
    enabled: "ჩართული",
    disabled: "გამორთული",
    mandatory: "სავალდებულო",
    mandatoryMustStayOn: "სავალდებულოა რომ იყოს აქტიური — მომხმარებელს გამოჩნდება უფასოდ",
    forbidden: "აკრძალულია",
    forbiddenHelp: "მომხმარებელს გამოჩნდება წითელ ჩარჩოში დამატებითი მომსახურებების სიის ბოლოში",
    errBrandModel: "ბრენდი და მოდელი სავალდებულოა.",
    errColorBody: "ფერი და მანქანის კატეგორია სავალდებულოა.",
    errPlateRequired: "სახელმწიფო ნომერი სავალდებულოა (ლათინური ასოები და ციფრები).",
    errPlateFormat: "სახელმწიფო ნომერი: მხოლოდ ლათინური ასოები და ციფრები, გამოტოვებისა და სიმბოლოების გარეშე (მაგ. AA123BB).",
    errPlateTaken:
      "ამ სახელმწიფო ნომრით მანქანა უკვე დარეგისტრირებულია. იგივე ნომრით განცხადების შენახვა ან მოდერაციაზე გაგზავნა შეუძლებელია.",
    errDailyPrice: "შეიყვანეთ მინიმუმ ერთი დღიური ფასი (ტარიფის დიაპაზონები).",
    errPhotos: "ატვირთეთ მინიმუმ {n} გალერეის ფოტო (ფოტო სექცია).",
    errCertificate: "ატვირთეთ ტექპასპორტის ორივე მხარე.",
    errInsurance: "ატვირთეთ დაზღვევის ფაილი.",
    errInsuranceExpiresAt: "ჩაწერეთ დაზღვევის მოქმედების ვადა.",
    errCertificateInsurance: "ატვირთეთ ტექპასპორტის ორივე მხარე და დაზღვევის ფაილი.",
    errPickup: "აირჩიეთ მინიმუმ ერთი აღების/დაბრუნების ლოკაცია.",
    errDeliveryPlace: "ჩართეთ მინიმუმ ერთი მიწოდების ადგილი (აეროპორტი / ქალაქი / ოფისი).",
    errNoAirports: "პარტნიორის პროფილზე აეროპორტები არ არის. სანამ განათავსებთ, დაუკავშირდით ადმინს.",
    errCreateFailed: "მანქანის შექმნა ვერ მოხერხდა",
    deliveryAdjusted: "მიწოდების ფასები შესწორდა",
    continue: "გაგრძელება",
    pickup: {
      cityDelivery: "ქალაქში მიწოდება",
      rentalOffice: "გაქირავების ოფისი",
      city: "ქალაქი",
      place: "ადგილი",
      delivery: "მიწოდება",
      oneWayPrice: "ერთი მიმართულების ფასი",
      freeAfterDays: "უფასო .. დღის შემდეგ",
      travelTime: "მგზავრობის დრო",
      emptyPickup:
        "პირად ინფოში ჯერ არ გაქვთ გააქტიურებული ლოკაციები. დაამატეთ ქვეყნები და ლოკაციები პირად ინფოში — აქ ჩამოსაშლელ სიაში გამოჩნდება.",
      selected: "არჩეული:",
      pickCities: "გახსენით სია და მონიშნეთ ამ მანქანისთვის ხელმისაწვდომი ქალაქები.",
      pickLocationsHelp:
        "აირჩიეთ თქვენს პროფილზე გააქტიურებული ლოკაციებიდან, სადაც ამ კონკრეტულ მანქანას შეძლებთ კლიენტისთვის მიწოდებას. ყოველი მანქანისთვის არჩევანი ინდივიდუალურია.",
      addLocation: "ლოკაციის დამატება ამ მანქანისთვის",
      selectLocation: "აირჩიეთ ლოკაცია",
      allLocationsAdded: "ყველა თქვენი ლოკაცია უკვე დამატებულია",
      freeAfterTitle: "მიწოდება უფასოა, როცა ქირაობა ამდენ დღეზე მეტია",
      freeAfterHelp:
        "უფასო N დღის შემდეგ: თუ ჯავშანი N დღეზე გრძელია, მიწოდების ფასი {symbol}0ა. მგზავრობის დრო: მინიმალური შეტყობინება აღებამდე ამ ადგილისთვის (განცხადება იმალება, თუ აღება უფრო ადრეა). 0 დატოვეთ — პლატფორმის ნაგულისხმევი 2 საათი.",
      hours: "სთ",
      minutes: "წთ",
    },
  },
};

export const partnerUiRu: PartnerUiPack = {
  common: {
    save: "Сохранить",
    saving: "Сохранение…",
    delete: "Удалить",
    remove: "Удалить",
    cancel: "Отмена",
    upload: "Загрузить",
    replace: "Заменить",
    select: "Выберите",
    requiredFields: "Заполните выделенные обязательные поля.",
    currency: "Валюта",
    saveFailed: "Не удалось сохранить",
    uploadFailed: "Не удалось загрузить",
    dbOffline: "База данных недоступна. Запустите Postgres и попробуйте снова.",
  },
  personalInfo: {
    subtitle: "Профиль компании и операции — отредактируйте все разделы.",
    sections: {
      main: "Основная информация",
      workDays: "Рабочие и нерабочие дни",
      payment: "Оплата и депозит",
      tariff: "Тариф",
      contract: "Договор",
      password: "Пароль и сервис",
    },
    mainInfo: "Основная информация",
    contacts: "Контакты",
    logo: "Логотип",
    logoHint: "Квадратный PNG/JPG",
    brandName: "Фирменное название",
    legalName: "Юридическое название",
    firstName: "Имя",
    lastName: "Фамилия",
    country: "Страна",
    centralOffice: "Центральный офис",
    address: "Адрес центрального офиса",
    clientLanguages: "Языки общения с клиентами",
    deliveryCountries: "Страны операций",
    deliveryHelp:
      "Выберите любую страну и её аэропорты/города. После сохранения заявка уходит админу. Только после подтверждения локации появятся при добавлении авто (и в поиске на главной после активации).",
    selectCountry: "Выберите страну",
    selectLocation: "Выберите локацию",
    noLocations: "Для этой страны пока нет локаций в каталоге",
    locationRequired: "Выберите хотя бы одну локацию перед сохранением страны.",
    countriesNeedLocation: "Для каждой страны выберите хотя бы одну локацию, затем нажмите Сохранить.",
    countriesNeedOne: "Выберите хотя бы одну страну, затем нажмите Сохранить.",
    countriesSavedLocal: "Страны и локации в списке. Нажмите Сохранить на странице, чтобы записать профиль.",
    primaryPhone: "Основной мобильный",
    secondPhone: "Второй телефон",
    email: "Email",
    website: "Сайт",
    workingDays: "Рабочие дни",
    pricingCurrency: "Валюта цен",
    currencyHelp: "По умолчанию USD. Суммы вводятся в этой валюте; на сайте конвертация для гостей.",
    prepTime: "Время подготовки авто между бронированиями",
    prepMinutes: "Укажите время в минутах",
    publicHolidays: "Праздничные дни",
    publicHolidaysHelp: "В эти дни аренда или возврат невозможны даже за доплату.",
    addDate: "Добавить дату",
    holidayPrompt: "Добавьте дату праздника (YYYY-MM-DD)",
    offHoursService: "Сервис в нерабочее время",
    offHoursPrice: "Цена за нерабочие часы",
    paymentMethods: "Способы оплаты аренды",
    requireCard: "Кредитная карта обязательна даже без депозита или при другом способе депозита",
    requireCardHelp: "Если включено, авто скрыты для клиентов без требования кредитной карты.",
    depositMethods: "Способы удержания депозита",
    cashRefundDays: "Срок возврата наличного депозита (дни)",
    tariffHelp: "Диапазоны дней для цен при добавлении авто. Добавляйте или меняйте здесь.",
    fromDays: "С (дней)",
    toDays: "По (дней)",
    addInterval: "Добавить интервал",
    contractHelp:
      "Загрузите договор аренды (PDF или изображение). Клиент откроет файл из текста согласия при бронировании и не сможет завершить заказ без отметки.",
    contractFile: "Файл договора",
    contractHint: "PDF, PNG или JPG — макс. 20 МБ",
    contractUploadFailed: "Не удалось загрузить договор",
    contractRemove: "Удалить договор",
    activateOwnContract: "Активировать мой договор",
    ownContractActive: "Ваш договор активен для бронирования",
    siteContractTitle: "Договор сайта",
    siteContractHelp:
      "Готовый договор, загруженный администратором. Включите его, если свой договор не активирован.",
    siteContractEnable: "Включить договор сайта",
    siteContractOn: "Включён",
    siteContractOff: "Выключен",
    siteContractMissing: "Администратор ещё не загрузил договор сайта.",
    siteContractLockedOwn: "Выключен, пока активен ваш собственный договор.",
    siteContractAutoOn: "Включён автоматически — свой договор не загружен.",
    passwordTitle: "Пароль",
    oldPassword: "Старый пароль",
    newPassword: "Новый пароль",
    confirmPassword: "Подтвердите новый пароль",
    stopService: "Остановить сервис",
    stopServiceHelp:
      "При остановке сервиса аккаунт станет неактивным для новых объявлений. Данные сохраняются для админа.",
    remodeation:
      "Изменения профиля ждут повторной модерации. Объявления скрыты в поиске до одобрения.",
    locked: "Заблокировано",
    alreadyInList: "Эта страна уже в сохранённом списке.",
    saved: "Сохранено",
    savedRemoderation: "Сохранено — ожидает повторной модерации",
    savedForAdminReview: "Сохранено. Изменения отправлены админу на проверку.",
    passwordMismatch: "Новый пароль и подтверждение не совпадают.",
    passwordTooShort: "Новый пароль должен быть не короче 6 символов.",
    passwordNotAvailable: "Настройки компании сохранены. Смена пароля в этой версии пока недоступна.",
    locationsLoadError: "Не удалось загрузить локации",
    logoUploadFailed: "Не удалось загрузить логотип",
    saveFailed: "Не удалось сохранить",
    pendingSave: "(ожидает сохранения)",
    pendingRemove: "(ожидает удаления)",
    unlockedUntil: "Разблокировано до",
    fieldRequired: "Это поле обязательно",
    invalidEmail: "Введите корректный email",
    invalidWebsite: "Укажите сайт (например example.com)",
    invalidPhone: "Укажите телефон с кодом страны",
    logoRequired: "Загрузите логотип компании",
    messengersRequired: "Для этого номера выберите хотя бы один мессенджер (WhatsApp, Telegram или Viber)",
    messengersHint: "Отметьте приложения на этом номере — покажется клиенту после бронирования",
    days: {
      monday: "Понедельник",
      tuesday: "Вторник",
      wednesday: "Среда",
      thursday: "Четверг",
      friday: "Пятница",
      saturday: "Суббота",
      sunday: "Воскресенье",
    },
  },
  createCar: {
    sections: {
      mainInfo: "Основная информация",
      pickup: "Получение и возврат",
      price: "Цена и условия",
      pricing: "Цены",
      mileage: "Пробег",
      insurance: "Страховка",
      extras: "Дополнительные услуги",
      specs: "Характеристики",
      music: "Музыка",
      photo: "Фото",
      certificate: "Техпаспорт и страховка",
    },
    brand: "Бренд",
    model: "Модель",
    bodyColor: "Цвет",
    bodyType: "Категория автомобиля",
    registration: "Госномер",
    year: "Год выпуска",
    licenseCat: "Категория водительских прав",
    minDriverAge: "Минимальный возраст водителя",
    minLicenseYears: "Минимальный стаж прав (лет)",
    priceNote: "Сервисный сбор платформы добавляется поверх ваших цен.",
    tariffHelp: "Диапазоны дней берутся из личной информации → Тариф. Введите цены за день здесь.",
    dailyPrice: "Цена за день",
    daysRange: "дней",
    days31: "31+ дней",
    daysPlus: "{n}+ дней",
    deposit: "Депозит при получении",
    franchise: "Франшиза / франшиза",
    franchiseHelp:
      "Выкл = ноль. Вкл = укажите процент от депозита, который удерживается как франшиза (видно клиенту).",
    cardRequired: "Для аренды этого авто нужна кредитная карта",
    mileageLimit: "Лимит пробега",
    kmPerDay: "Км в день",
    saveSales: "Сохранить и добавить в продажу",
    saveInternal: "Сохранить для внутреннего использования",
    update: "Обновить",
    errUpdateFailed: "Не удалось обновить авто",
    errUpdateDelivery: "Выбранный город или аэропорт не записан в базе, поэтому объявление не сохранилось.",
    errUpdateExtra: "Дополнительная услуга отсутствует в каталоге, поэтому объявление не сохранилось.",
    errUpdateInvalid: "В одном из полей недопустимое значение, поэтому объявление не сохранилось.",
    errUpdateDuplicate: "Повторяющееся значение остановило сохранение.",
    errUpdateMissing: "Этого объявления больше нет.",
    savedUpdate: "Объявление обновлено.",
    savedUpdatePending: "Объявление обновлено и ожидает модерации.",
    savedUpdateRemoderation:
      "Объявление обновлено и отправлено на повторную модерацию. В поиске появится после одобрения администратором.",
    selectBrand: "Выберите бренд",
    selectModel: "Выберите модель",
    selectModelFirst: "Сначала выберите бренд",
    general: "Общее",
    engine: "Двигатель",
    chassis: "Шасси",
    seats: "Места",
    doors: "Число дверей",
    airConditioning: "Кондиционер",
    interior: "Салон",
    roof: "Крыша",
    poweredWindows: "Электростеклоподъёмники",
    airbags: "Подушки безопасности",
    steeringSide: "Сторона руля",
    cruiseControl: "Круиз-контроль",
    rearViewCamera: "Камера заднего вида",
    parkingAssist: "Парктроник",
    fuel: "Топливо",
    engineVolume: "Объём двигателя (л)",
    enginePower: "Мощность, л.с.",
    fuelTank: "Бак (л)",
    fuelConsumption: "Расход, л/100 км",
    transmission: "Коробка передач",
    drive: "Привод",
    automatic: "Автомат",
    manual: "Механика",
    selectFiles: "Выбрать файлы",
    uploading: "Загрузка…",
    cover: "Обложка",
    coverHint:
      "Фото в первой ячейке — это обложка. Перетащите фото, чтобы изменить порядок.",
    coverNeedIdentity: "Перед обложкой выберите марку, модель, год и цвет.",
    coverStyleFailed: "Не удалось создать студийную обложку. Попробуйте ещё раз.",
    dragImage: "Перетащите изображение или",
    photoFormats: "PNG, JPG, GIF до 20 Мб · файл сохраняется как есть · мин. {n}",
    certPrivate: "Изображение и данные недоступны клиентам.",
    front: "Лицевая",
    back: "Оборотная",
    notUploaded: "Не загружено",
    selectFront: "Выбрать лицевую",
    selectBack: "Выбрать оборотную",
    dragCert: "Перетащите изображение или PDF, или",
    certFormats: "PNG, JPG, GIF, PDF до 20 Мб · изображения сжимаются автоматически",
    insuranceUploadTitle: "Загрузка файла страховки",
    insuranceExpiresAtLabel: "Срок действия страховки",
    insuranceExpiresAtHelp:
      "Укажите дату окончания из полиса. В этот день объявление уйдёт на модерацию и скрывается из поиска до повторного одобрения.",
    removeFile: "Удалить",
    insurancePdfLabel: "PDF-файл",
    seasonalPricing: "Сезонные цены",
    seasonalHelp:
      "Добавьте сезон, сохраните даты и включите этот переключатель, чтобы применить цены периода.",
    addSeasonsHint: "Нажмите «Добавить сезон», затем сохраните период.",
    addSeason: "Добавить сезон",
    seasonSaved: "Период сезона сохранён.",
    seasonOnlyYearRound:
      "Доступен только круглогодичный сезон #1. Откройте Личная инфо → Ценовые сезоны, добавьте даты, сохраните и вернитесь.",
    seasonalActive: "Сезонные тарифы выше будут использованы для подходящих дат бронирования.",
    seasonYearRoundHint:
      "Сезон #1 фиксирован на весь год. Включите доп. сезоны на странице аккаунта, чтобы показать строки здесь.",
    seasonCol: "Сезон",
    periodCol: "Период",
    extrasTitle: "Название",
    extrasPricePerDay: "Цена за день",
    extrasMin: "Мин",
    extrasMax: "Макс",
    extrasSelection: "Выбор",
    extrasEmpty: "Каталог доп. услуг пуст. Админ может настроить extras; авто всё равно можно сохранить.",
    free: "Бесплатно",
    enabled: "Включено",
    disabled: "Выключено",
    mandatory: "Обязательно",
    mandatoryMustStayOn: "Должно оставаться активным — клиенту показывается бесплатно",
    forbidden: "Запрещено",
    forbiddenHelp: "Клиенту показывается красным блоком в конце доп. услуг",
    errBrandModel: "Бренд и модель обязательны.",
    errColorBody: "Цвет и категория автомобиля обязательны.",
    errPlateRequired: "Госномер обязателен (латинские буквы и цифры).",
    errPlateFormat: "Госномер: только латинские буквы и цифры, без пробелов и символов (напр. AA123BB).",
    errPlateTaken:
      "Автомобиль с этим госномером уже зарегистрирован. Сохранить или отправить на модерацию объявление с тем же номером нельзя.",
    errDailyPrice: "Укажите хотя бы одну цену за день в разделе Цены (тарифные диапазоны).",
    errPhotos: "Загрузите не меньше {n} фото в галерею (раздел Фото).",
    errCertificate: "Загрузите обе стороны техпаспорта.",
    errInsurance: "Загрузите файл страховки.",
    errInsuranceExpiresAt: "Укажите срок действия страховки.",
    errCertificateInsurance: "Загрузите обе стороны техпаспорта и файл страховки.",
    errPickup: "Выберите хотя бы одну точку получения/возврата.",
    errDeliveryPlace: "Включите хотя бы одно место доставки (аэропорт / город / офис).",
    errNoAirports: "На профиле партнёра нет аэропортов. Свяжитесь с админом перед публикацией.",
    errCreateFailed: "Не удалось создать авто",
    deliveryAdjusted: "Цены доставки скорректированы",
    continue: "Продолжить",
    pickup: {
      cityDelivery: "Доставка по городу",
      rentalOffice: "Офис аренды",
      city: "Город",
      place: "Место",
      delivery: "Доставка",
      oneWayPrice: "Цена в одну сторону",
      freeAfterDays: "Бесплатно после .. дней",
      travelTime: "Время в пути",
      emptyPickup:
        "В личной информации пока нет активированных локаций. Добавьте страны и локации — они появятся в списке ниже.",
      selected: "Выбрано:",
      pickCities: "Откройте список и отметьте города, доступные для этого авто.",
      pickLocationsHelp:
        "Выберите из активированных локаций профиля, куда можно доставить именно этот автомобиль. Выбор индивидуален для каждой машины.",
      addLocation: "Добавить локацию для этого авто",
      selectLocation: "Выберите локацию",
      allLocationsAdded: "Все ваши локации уже добавлены",
      freeAfterTitle: "Доставка бесплатна, если аренда длиннее указанного числа дней",
      freeAfterHelp:
        "Бесплатно после N дней: если бронь длиннее N дней, цена доставки {symbol}0. Время в пути: минимальное уведомление до получения (объявление скрыто, если получение раньше). 0 = платформенный минимум 2 часа.",
      hours: "ч",
      minutes: "мин",
    },
  },
};
