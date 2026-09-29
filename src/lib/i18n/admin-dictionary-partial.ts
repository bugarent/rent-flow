import type { AdminDictionary } from "@/lib/i18n/admin-dictionaries";

export type DeepPartial<T> = T extends string
  ? string
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type AdminExtra = DeepPartial<AdminDictionary>;
