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

export const CONTACT_TICKET_TITLE_MIN_LENGTH = 3;
export const CONTACT_TICKET_DESCRIPTION_MIN_LENGTH = 10;

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

  if (title.length < CONTACT_TICKET_TITLE_MIN_LENGTH) {
    return { error: `Title must be at least ${CONTACT_TICKET_TITLE_MIN_LENGTH} characters.` };
  }

  if (description.length < CONTACT_TICKET_DESCRIPTION_MIN_LENGTH) {
    return { error: `Description must be at least ${CONTACT_TICKET_DESCRIPTION_MIN_LENGTH} characters.` };
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
