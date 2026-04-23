export const TICKET_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
];

export function normalizeTicketStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "open") return "open";
  if (status === "inprogress" || status === "in_progress") return "in_progress";
  if (status === "closed") return "closed";
  return null;
}

export function ticketStatusLabel(value) {
  const status = normalizeTicketStatus(value);
  if (status === "open") return "Open";
  if (status === "in_progress") return "In Progress";
  if (status === "closed") return "Closed";
  return String(value || "—");
}

export function isClosedTicketStatus(value) {
  return normalizeTicketStatus(value) === "closed";
}

export function cleanTicketMessage(value, maxLen = 2000) {
  return String(value ?? "").trim().slice(0, maxLen);
}

export function getLatestTicketMessageByTicketId(messages) {
  const latest = new Map();

  for (const message of messages ?? []) {
    if (!message?.ticket_id || !message?.created_at) continue;
    const current = latest.get(message.ticket_id);
    if (!current || new Date(message.created_at).getTime() > new Date(current.created_at).getTime()) {
      latest.set(message.ticket_id, message);
    }
  }

  return latest;
}
