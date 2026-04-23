export const CONTACT_TICKET_CATEGORIES = [
  "Troubleshooting",
  "Business Partnership",
  "Technical Partnership",
  "Account & Login",
  "Content Report",
  "Bug Report",
  "Feature Request",
  "Data Correction",
  "Other",
];

export function cleanTicketText(value, maxLen) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

export function normalizeContactTicketForm(formData) {
  const category = cleanTicketText(formData.get("category"), 60);
  const categoryOther = cleanTicketText(formData.get("categoryOther"), 80);
  const title = cleanTicketText(formData.get("title"), 120);
  const description = cleanTicketText(formData.get("description"), 2000);

  if (!CONTACT_TICKET_CATEGORIES.includes(category)) {
    return { error: "Please choose a valid category." };
  }

  if (category === "Other" && !categoryOther) {
    return { error: "Please specify the Other category." };
  }

  if (!title || !description) {
    return { error: "Please fill all required fields." };
  }

  return {
    value: {
      category,
      category_other: category === "Other" ? categoryOther : null,
      title,
      description,
    },
  };
}
