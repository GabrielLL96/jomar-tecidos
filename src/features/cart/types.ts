export interface CartItem {
  id: string
  productId: string
  slug: string
  name: string
  colorId: string
  colorLabel: string
  colorHex: string
  stripeColors: [string, string]
  coverImageUrl?: string
  meters: number
  pricePerMeter: number
}
