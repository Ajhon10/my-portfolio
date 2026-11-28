export const marketplaces = ['Raket.PH', 'Etsy', 'Teachers Pay Teachers', 'Payhip', 'Gumroad'] as const
export type MarketplaceLinks = Partial<Record<(typeof marketplaces)[number], string>>
