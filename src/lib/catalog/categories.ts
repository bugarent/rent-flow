import type { MappedCarModel } from "@/lib/catalog/car-models";

export type VehicleCategoryId =
  | "standard"
  | "suv"
  | "minivan"
  | "camper"
  | "luxury"
  | "economy";

export const VEHICLE_CATEGORIES: {
  id: VehicleCategoryId;
  name: string;
  /** Legacy single example label */
  model: string;
  image: string;
  mappedModels: MappedCarModel[];
}[] = [
  {
    id: "standard",
    name: "Standard",
    model: "VW Polo",
    image: "https://images.unsplash.com/photo-1541899481282-d53bff3f048b?auto=format&fit=crop&w=900&q=80",
    mappedModels: [
      { make: "Volkswagen", model: "Polo" },
      { make: "VW", model: "Polo" },
      { make: "Toyota", model: "Yaris" },
      { make: "Ford", model: "Fiesta" },
      { make: "Hyundai", model: "i20" },
    ],
  },
  {
    id: "suv",
    name: "4x4 SUV",
    model: "Toyota RAV4",
    image: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=900&q=80",
    mappedModels: [
      { make: "Toyota", model: "RAV4" },
      { make: "Nissan", model: "Qashqai" },
      { make: "Hyundai", model: "Tucson" },
      { make: "Kia", model: "Sportage" },
      { make: "Jeep", model: "Compass" },
    ],
  },
  {
    id: "minivan",
    name: "Minivan",
    model: "Mercedes-Benz V-Class",
    image: "https://images.unsplash.com/photo-1544620341-11cb2cd96b6d?auto=format&fit=crop&w=900&q=80",
    mappedModels: [
      { make: "Mercedes-Benz", model: "V-Class" },
      { make: "Volkswagen", model: "Multivan" },
      { make: "VW", model: "Multivan" },
      { make: "Ford", model: "Tourneo" },
      { make: "Peugeot", model: "Traveller" },
    ],
  },
  {
    id: "camper",
    name: "Camper car",
    model: "VW California",
    image: "https://images.unsplash.com/photo-1527786356903-4b35b0c48fff?auto=format&fit=crop&w=900&q=80",
    mappedModels: [
      { make: "Volkswagen", model: "California" },
      { make: "VW", model: "California" },
    ],
  },
  {
    id: "luxury",
    name: "Luxury",
    model: "Mercedes-Benz S-Class",
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=900&q=80",
    mappedModels: [
      { make: "Mercedes-Benz", model: "S-Class" },
      { make: "Mercedes-Benz", model: "E-Class" },
      { make: "BMW", model: "5 Series" },
      { make: "BMW", model: "7 Series" },
      { make: "Audi", model: "A6" },
      { make: "Audi", model: "A8" },
    ],
  },
  {
    id: "economy",
    name: "Economy",
    model: "Toyota Corolla",
    image: "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?auto=format&fit=crop&w=900&q=80",
    mappedModels: [
      { make: "Toyota", model: "Corolla" },
      { make: "Hyundai", model: "i10" },
      { make: "Kia", model: "Picanto" },
      { make: "Renault", model: "Clio" },
      { make: "Skoda", model: "Fabia" },
    ],
  },
];
