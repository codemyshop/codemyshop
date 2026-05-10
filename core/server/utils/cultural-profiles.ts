/**
 *
 * Cultural profiles for AI transcreation.
 * Each locale defines tone rules, buyer psychology, and phrasing conventions.
 */

export interface CulturalProfile {
  locale:       string
  label:        string
  flag:         string
  tone:         string
  buyerPsych:   string
  keywords:     string[]
  avoidWords:   string[]
  formalLevel:  string
  example:      string
}

export const CULTURAL_PROFILES: Record<string, CulturalProfile> = {
  fr: {
    locale:      'fr',
    label:       'Fran\u00e7ais',
    flag:        '\ud83c\uddeb\ud83c\uddf7',
    tone:        'Passionn\u00e9, chaleureux, ax\u00e9 sur le savoir-faire et le terroir. Valoriser l\u2019origine, la tradition et la qualit\u00e9 artisanale.',
    buyerPsych:  'L\u2019acheteur fran\u00e7ais est sensible \u00e0 l\u2019histoire du produit, \u00e0 son origine g\u00e9ographique, au go\u00fbt et au savoir-faire. Il appr\u00e9cie qu\u2019on lui parle avec passion et expertise, pas avec un ton commercial agressif.',
    keywords:    ['savoir-faire', 'terroir', 'artisanal', 's\u00e9lection rigoureuse', 'go\u00fbt authentique', 'tradition', 'origine contr\u00f4l\u00e9e'],
    avoidWords:  ['cheap', 'deal', 'best price'],
    formalLevel: 'Vouvoiement syst\u00e9matique en B2B. Tutoiement acceptable en B2C lifestyle.',
    example:     'Notre s\u00e9lection de dattes Medjoul de Jordanie, cueillies \u00e0 maturit\u00e9 optimale, offre une texture fondante et un go\u00fbt caramel\u00e9 incomparable.',
  },

  en: {
    locale:      'en',
    label:       'English',
    flag:        '\ud83c\uddec\ud83c\udde7',
    tone:        'Pragmatic, direct, benefit-driven. Focus on ROI, speed, efficiency and measurable outcomes.',
    buyerPsych:  'The English-speaking buyer wants to know what the product does for them, fast. Lead with benefits, back with proof (numbers, testimonials). Less emotion, more practicality.',
    keywords:    ['save time', 'boost efficiency', 'proven results', 'ROI', 'hassle-free', 'premium quality', 'trusted by'],
    avoidWords:  ['artisanal', 'terroir', 'passionn\u00e9'],
    formalLevel: 'Professional but approachable. No formal/informal distinction — use natural business English.',
    example:     'Premium Medjoul dates from Jordan. Rich caramel flavor, melt-in-your-mouth texture. Trusted by 200+ restaurants across Europe.',
  },

  de: {
    locale:      'de',
    label:       'Deutsch',
    flag:        '\ud83c\udde9\ud83c\uddea',
    tone:        'Formell (Sie), sachlich, qualit\u00e4tsbewusst. Fokus auf Zuverl\u00e4ssigkeit, Sicherheit, Normen und Prozessqualit\u00e4t.',
    buyerPsych:  'Der deutsche Eink\u00e4ufer legt Wert auf Zuverl\u00e4ssigkeit, Zertifizierungen, pr\u00e4zise technische Details und Liefertreue. Vertrauen wird durch Fakten aufgebaut, nicht durch Emotionen. B2B-R\u00e9assurance ist entscheidend.',
    keywords:    ['Zuverl\u00e4ssigkeit', 'Qualit\u00e4tssicherung', 'zertifiziert', 'gepr\u00fcft', 'Liefertreue', 'Premium-Qualit\u00e4t', 'Sicherheit'],
    avoidWords:  ['g\u00fcnstig', 'billig', 'Schn\u00e4ppchen'],
    formalLevel: 'Siezen (Sie) obligatoire en B2B. Formulation pr\u00e9cise, phrases structur\u00e9es, vocabulaire technique si pertinent.',
    example:     'Unsere Medjoul-Datteln aus Jordanien erf\u00fcllen h\u00f6chste Qualit\u00e4tsstandards. Sorgf\u00e4ltig gepr\u00fcft, p\u00fcnktlich geliefert \u2014 Ihr zuverl\u00e4ssiger Partner f\u00fcr Premium-Trockenobst.',
  },
}

export const SUPPORTED_LOCALES = Object.keys(CULTURAL_PROFILES)

export function getCulturalProfile(locale: string): CulturalProfile {
  return CULTURAL_PROFILES[locale] ?? CULTURAL_PROFILES['fr']
}
