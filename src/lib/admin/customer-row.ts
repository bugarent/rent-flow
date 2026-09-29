export type AdminCustomerRow = {
  id: string;
  customerNumber: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryOfResidence: string;
  countryLabel: string;
  messengers: string[];
  status: string;
  source: "db" | "local";
  banned?: boolean;
};
