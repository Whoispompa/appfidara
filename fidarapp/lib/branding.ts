export type OrganizationBranding = {
  organizationLogoUrl?: string | null;
};

const apiUrl = (
  process.env.NEXT_PUBLIC_FIDARA_API_URL ?? "https://api.fidara.mx"
).replace(/\/+$/, "");

export function resolveLogoUrl(value?: string | null) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value, `${apiUrl}/`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
