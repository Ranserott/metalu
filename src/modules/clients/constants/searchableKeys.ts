// src/modules/clients/constants/searchableKeys.ts
import type { Client } from "../types/client";

/**
 * Keys whose values are concatenated into the search blob for full-text matching.
 * Order does not matter — all values are joined with spaces.
 * `city` is included even though it's nullable in the Client type — the
 * filter function handles null gracefully.
 */
export const CLIENT_SEARCHABLE_KEYS: (keyof Client)[] = [
  "code",
  "name",
  "contact",
  "email",
  "phone",
  "address",
  "city",
];
