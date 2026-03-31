import { Resend } from "resend";

export type EmailSummaryPayload = {
  month: string;
  totalReceived: number;
  totalPending: number;
  totalExpected: number;
  totalExpenses: number;
  remainingBalance: number;
};

export async function sendNewEntryEmail(args: {
  to: string | string[];
  entryType: "collection" | "expense";
  subject: string;
  entryDetails: Record<string, string | number | null | undefined>;
  summary: EmailSummaryPayload;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const { to, entryType, subject, entryDetails, summary } = args;

  const lines = Object.entries(entryDetails)
    .map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v ?? ""))}</li>`)
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4;">
      <h2 style="margin: 0 0 12px;">New ${entryType} entry</h2>
      <h3 style="margin: 0 0 8px;">Entry details</h3>
      <ul>${lines}</ul>

      <h3 style="margin: 18px 0 8px;">Updated monthly summary (${escapeHtml(summary.month)})</h3>
      <ul>
        <li><strong>Total Received:</strong> ${summary.totalReceived}</li>
        <li><strong>Total Pending:</strong> ${summary.totalPending}</li>
        <li><strong>Total Expected:</strong> ${summary.totalExpected}</li>
        <li><strong>Total Expenses:</strong> ${summary.totalExpenses}</li>
        <li><strong>Remaining Balance:</strong> ${summary.remainingBalance}</li>
      </ul>
    </div>
  `;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    html,
  });
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

