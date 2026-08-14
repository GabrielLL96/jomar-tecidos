export function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#e4ddd0] bg-white p-6">
      <h2 className="text-navy-dark mb-4 font-serif text-lg font-medium">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}
