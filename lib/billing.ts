/** Billing status computed from the studio's next-due date. */
export type BillingStatus = "active" | "due_soon" | "overdue" | "suspended";

const DAY = 24 * 60 * 60 * 1000;
const WARNING_DAYS  = 5;   // show banner N days before due
const GRACE_DAYS    = 3;   // grace period before hard suspension

/**
 * Derive the studio's billing status purely from the due date.
 * No database write needed — computed on every request.
 *
 * Timeline:
 *   ──────────────────────────────────────────────────────────────
 *   |   active   |  due_soon (5 d) | overdue (3 d) | suspended  |
 *   ──────────────────────────────────────────────────────────────
 *                                 ^  nextDueDate
 */
export function getBillingStatus(nextDueDate: Date): BillingStatus {
  const now = Date.now();
  const due = nextDueDate.getTime();

  if (now < due - WARNING_DAYS * DAY) return "active";
  if (now < due)                       return "due_soon";
  if (now < due + GRACE_DAYS * DAY)    return "overdue";
  return "suspended";
}

/**
 * How many days remain until (or since) the due date.
 * Positive = days remaining, negative = days overdue.
 */
export function daysUntilDue(nextDueDate: Date): number {
  return Math.ceil((nextDueDate.getTime() - Date.now()) / DAY);
}

/**
 * Build a unique invoice number.
 * Format: INV-{studioId}-{YYYYMM}-{seq:03}
 * e.g.   INV-STD-AB1234-202501-004
 */
export function buildInvoiceNumber(studioId: string, sequence: number): string {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const seq = String(sequence).padStart(3, "0");
  return `INV-${studioId}-${ym}-${seq}`;
}

/** Human-readable label for a billing status. */
export const BILLING_STATUS_LABEL: Record<BillingStatus, string> = {
  active:    "Active",
  due_soon:  "Due Soon",
  overdue:   "Overdue",
  suspended: "Suspended",
};

/** Tailwind colour tokens per status (used in both admin and super-admin UIs). */
export const BILLING_STATUS_COLOR: Record<BillingStatus, string> = {
  active:    "text-green-500  bg-green-500/10  border-green-500/20",
  due_soon:  "text-amber-500  bg-amber-500/10  border-amber-500/20",
  overdue:   "text-orange-500 bg-orange-500/10 border-orange-500/20",
  suspended: "text-red-500    bg-red-500/10    border-red-500/20",
};
