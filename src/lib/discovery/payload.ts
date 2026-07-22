import { z } from "zod";

const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const semverRegex = /^\d+\.\d+\.\d+$/;

export const DiscoveryPayloadSchema = z.object({
  ip: z.string().regex(ipRegex, "ip debe ser una IPv4 válida"),
  port: z.number().int().min(1).max(65535, "port fuera de rango"),
  hostname: z.string().min(1, "hostname requerido"),
  version: z.string().regex(semverRegex, "version debe ser semver X.Y.Z"),
});

export type DiscoveryPayload = z.infer<typeof DiscoveryPayloadSchema>;

export function buildDiscoveryPayload(input: DiscoveryPayload): DiscoveryPayload {
  return DiscoveryPayloadSchema.parse(input);
}

export function parseDiscoveryPayload(raw: string): DiscoveryPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Discovery payload no es JSON válido: ${(e as Error).message}`);
  }
  return DiscoveryPayloadSchema.parse(parsed);
}
