import {
  User, Users, Home, Briefcase, Store, Plane, PiggyBank, TrendingUp, GraduationCap, HeartPulse,
  Car, Building2, Heart, UtensilsCrossed, ShoppingBag, Receipt, PartyPopper, Gift, PawPrint,
  Hammer, Sprout, Wallet, Baby, Landmark,
} from 'lucide-react'

// Icons a project can wear: the categories people most often keep separate
// books for. `match` words let us suggest one from the project name.
// `tint` is a hue used for a soft background and a stronger icon colour.
// Display names live in i18n under `forms.projectIcons.<key>`.
export const PROJECT_ICONS = [
  { key: 'personal', Icon: User, tint: 38, match: ['personal', 'me', 'my', 'self', 'daily'] },
  { key: 'family', Icon: Users, tint: 18, match: ['family', 'parents', 'kids', 'mom', 'dad'] },
  { key: 'home', Icon: Home, tint: 28, match: ['home', 'house', 'household', 'grocery', 'groceries'] },
  { key: 'business', Icon: Briefcase, tint: 215, match: ['business', 'work', 'company', 'startup', 'firm'] },
  { key: 'shop', Icon: Store, tint: 265, match: ['shop', 'store', 'kirana', 'retail'] },
  { key: 'travel', Icon: Plane, tint: 200, match: ['travel', 'trip', 'tour', 'vacation', 'holiday'] },
  { key: 'savings', Icon: PiggyBank, tint: 330, match: ['saving', 'savings', 'emergency', 'fund'] },
  { key: 'invest', Icon: TrendingUp, tint: 150, match: ['invest', 'stocks', 'mutual', 'sip', 'shares'] },
  { key: 'education', Icon: GraduationCap, tint: 230, match: ['education', 'school', 'college', 'fees', 'study'] },
  { key: 'health', Icon: HeartPulse, tint: 355, match: ['health', 'medical', 'hospital', 'medicine', 'gym'] },
  { key: 'vehicle', Icon: Car, tint: 190, match: ['car', 'bike', 'vehicle', 'fuel', 'petrol'] },
  { key: 'rent', Icon: Building2, tint: 25, match: ['rent', 'property', 'flat', 'apartment', 'pg'] },
  { key: 'wedding', Icon: Heart, tint: 345, match: ['wedding', 'marriage', 'engagement'] },
  { key: 'food', Icon: UtensilsCrossed, tint: 12, match: ['food', 'restaurant', 'canteen', 'mess', 'cafe'] },
  { key: 'shopping', Icon: ShoppingBag, tint: 300, match: ['shopping', 'clothes', 'fashion'] },
  { key: 'bills', Icon: Receipt, tint: 45, match: ['bill', 'bills', 'utilities', 'emi', 'loan'] },
  { key: 'events', Icon: PartyPopper, tint: 280, match: ['event', 'party', 'festival', 'function', 'birthday'] },
  { key: 'gifts', Icon: Gift, tint: 320, match: ['gift', 'gifts', 'donation', 'charity'] },
  { key: 'pets', Icon: PawPrint, tint: 30, match: ['pet', 'pets', 'dog', 'cat'] },
  { key: 'construction', Icon: Hammer, tint: 20, match: ['construction', 'renovation', 'repair', 'build'] },
  { key: 'farm', Icon: Sprout, tint: 120, match: ['farm', 'agri', 'garden', 'crop'] },
  { key: 'baby', Icon: Baby, tint: 190, match: ['baby', 'newborn'] },
  { key: 'bank', Icon: Landmark, tint: 210, match: ['bank', 'account', 'tax', 'gst'] },
  { key: 'wallet', Icon: Wallet, tint: 38, match: ['wallet', 'cash', 'pocket'] },
]

const BY_KEY = Object.fromEntries(PROJECT_ICONS.map(i => [i.key, i]))

export const projectIcon = (key) => BY_KEY[key] || null

/** Best icon for a project name, or null when nothing fits */
export function suggestIcon(name) {
  const words = String(name || '').toLowerCase().split(/[^a-z]+/).filter(Boolean)
  if (!words.length) return null
  for (const icon of PROJECT_ICONS) {
    if (icon.match.some(m => words.includes(m) || words.some(w => w.length > 3 && w.startsWith(m)))) return icon.key
  }
  return null
}

/** Soft background + icon colour for a tint, readable in light and dark mode */
export const tintStyle = (tint) => ({
  background: `hsl(${tint} 70% 55% / 0.14)`,
  color: `hsl(${tint} 58% 50%)`,
})
