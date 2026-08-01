const MATERIAL_GROUP_BY_KEYWORD: [keyword: string, group: string][] = [
  ['linho', 'Linho'],
  ['algodão', 'Algodão'],
  ['algodao', 'Algodão'],
  ['seda', 'Seda'],
  ['aviamento', 'Aviamento'],
  ['poliéster', 'Poliéster'],
  ['poliester', 'Poliéster'],
  ['renda', 'Renda'],
]

export function materialGroup(material: string): string {
  const normalized = material.toLowerCase()
  const match = MATERIAL_GROUP_BY_KEYWORD.find(([keyword]) => normalized.includes(keyword))
  return match ? match[1] : material
}
