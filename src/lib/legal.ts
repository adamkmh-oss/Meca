/**
 * Identité de l'éditeur et de l'hébergeur (mentions légales, politique de
 * confidentialité). À renseigner par variables d'environnement : tant qu'une
 * valeur manque, la page l'indique clairement « à compléter ».
 */
const v = (k: string) => (process.env[k] ?? "").trim();

export const legal = {
  publisher: v("LEGAL_PUBLISHER_NAME"),
  address: v("LEGAL_PUBLISHER_ADDRESS"),
  director: v("LEGAL_PUBLICATION_DIRECTOR"),
  contact: v("CONTACT_EMAIL"),
  dpo: v("LEGAL_DPO_EMAIL") || v("CONTACT_EMAIL"),
  host: v("LEGAL_HOST") || "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  dataRegion: v("LEGAL_DATA_REGION") || "Union européenne (région choisie à la création du projet Supabase)",
};

export const TODO = "[à compléter par l'éditeur]";
