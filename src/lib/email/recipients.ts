export function getConfiguredReportRecipients(): string[] {
  const raw = process.env.REPORT_EMAIL_TO?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function resolveEntryEmailRecipients(userEmail?: string | null): string[] {
  const configured = getConfiguredReportRecipients();
  if (configured.length > 0) return configured;
  if (userEmail) return [userEmail];
  return [];
}

