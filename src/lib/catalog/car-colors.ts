/** Stored car colors. "Other" is not offered. */
export const CAR_COLORS = [
  "White",
  "Black",
  "Silver",
  "Gray",
  "Dark gray",
  "Blue",
  "Dark blue",
  "Light blue",
  "Red",
  "Burgundy",
  "Green",
  "Brown",
  "Beige",
  "Gold",
  "Orange",
  "Yellow",
  "Purple",
  "Bronze",
  "Pearl",
] as const;

export type CarColor = (typeof CAR_COLORS)[number];

const KA: Record<CarColor, string> = {
  White: "თეთრი",
  Black: "შავი",
  Silver: "ვერცხლისფერი",
  Gray: "ნაცრისფერი",
  "Dark gray": "მუქი ნაცრისფერი",
  Blue: "ლურჯი",
  "Dark blue": "მუქი ლურჯი",
  "Light blue": "ღია ლურჯი",
  Red: "წითელი",
  Burgundy: "ბორდოსფერი",
  Green: "მწვანე",
  Brown: "ყავისფერი",
  Beige: "ბეჟი",
  Gold: "ოქროსფერი",
  Orange: "ნარინჯისფერი",
  Yellow: "ყვითელი",
  Purple: "იისფერი",
  Bronze: "ბრინჯაოსფერი",
  Pearl: "მარგალიტისფერი",
};

const RU: Record<CarColor, string> = {
  White: "Белый",
  Black: "Чёрный",
  Silver: "Серебристый",
  Gray: "Серый",
  "Dark gray": "Тёмно-серый",
  Blue: "Синий",
  "Dark blue": "Тёмно-синий",
  "Light blue": "Голубой",
  Red: "Красный",
  Burgundy: "Бордовый",
  Green: "Зелёный",
  Brown: "Коричневый",
  Beige: "Бежевый",
  Gold: "Золотистый",
  Orange: "Оранжевый",
  Yellow: "Жёлтый",
  Purple: "Фиолетовый",
  Bronze: "Бронзовый",
  Pearl: "Перламутровый",
};

export function isCarColor(value: string): value is CarColor {
  return (CAR_COLORS as readonly string[]).includes(value);
}

export function carColorLabel(locale: string, color: string) {
  if (!isCarColor(color)) return color === "Other" ? "" : color;
  if (locale === "ka") return KA[color];
  if (locale === "ru") return RU[color];
  return color;
}
