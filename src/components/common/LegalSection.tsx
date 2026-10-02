export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-navy-dark font-serif text-xl font-medium">{title}</h2>
      <div className="text-text-body flex flex-col gap-3 text-sm leading-relaxed">{children}</div>
    </section>
  )
}
