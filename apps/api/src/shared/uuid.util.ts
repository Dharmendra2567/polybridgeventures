export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toUuid(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) return id;
  return "00000000-0000-0000-0000-000000000000";
}
