import { slugify } from "@/lib/slug";

const SUB_ICONS: Array<[RegExp, string]> = [
  [/viande|boeuf|hache|kefta|steak/, "🥩"],
  [/poulet|volaille/, "🍗"],
  [/poisson|fruits-de-mer/, "🐟"],
  [/charcuterie/, "🥓"],
  [/laitier|lait|fromage/, "🥛"],
  [/legume/, "🥬"],
  [/fruit/, "🍎"],
  [/pain|cereale|boulangerie/, "🍞"],
  [/epicerie/, "🛒"],
  [/boisson/, "🥤"],
  [/collation|snack/, "🥨"],
  [/essence|carburant/, "⛽"],
  [/covoiturage|taxi|uber/, "🚕"],
  [/stationnement|parking/, "🅿️"],
  [/entretien-auto|garage|mecanique/, "🔧"],
  [/transport-en-commun|bus|metro/, "🚌"],
  [/loyer|hypotheque/, "🏠"],
  [/entretien/, "🧰"],
  [/meuble/, "🛋️"],
  [/electricite|hydro/, "⚡"],
  [/internet/, "🌐"],
  [/telephone|cellulaire/, "📱"],
  [/assurance/, "🛡️"],
  [/vetement/, "👕"],
  [/electronique/, "💻"],
  [/maison/, "🏡"],
  [/pharmacie/, "💊"],
  [/medecin|dentiste|clinique/, "🩺"],
  [/gym|sport|fitness/, "🏋️"],
  [/fast-food|resto-rapide/, "🍔"],
  [/cafe/, "☕"],
  [/restaurant/, "🍽️"],
  [/streaming|abonnement/, "📺"],
  [/musique/, "🎵"],
  [/sortie|cinema/, "🎬"],
  [/jeu/, "🎮"],
  [/activite/, "🎨"],
  [/ecole|scolaire|livre/, "📚"],
  [/jouet/, "🧸"],
  [/salaire|paie/, "💵"],
];

export function subcategoryIcon(name: string): string | null {
  const slug = slugify(name);
  return SUB_ICONS.find(([re]) => re.test(slug))?.[1] ?? null;
}
