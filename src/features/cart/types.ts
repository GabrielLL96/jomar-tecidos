export interface CartItem {
  id: string
  productId: number
  slug: string
  name: string
  colorLabel: string
  colorHex: string
  stripeColors: [string, string]
  meters: number
  pricePerMeter: number
}
