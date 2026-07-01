// src/modules/suppliers/constants/searchableKeys.ts
/**
 * Note: `ciudad` is in the runtime data but not declared in the Supplier TS type.
 * The filter function casts to access it.
 */
export const SUPPLIER_SEARCHABLE_KEYS: string[] = [
  "code",
  "name",
  "contact",
  "phone",
  "email",
  "address",
  "ciudad", // not in Supplier type, but present at runtime
];
