import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/" className="flex items-center">
      <img
        src="/logo.png"
        alt="Jomar Tecidos e Enxovais"
        width={1536}
        height={1024}
        className="h-12 w-auto shrink-0 object-contain"
      />
    </Link>
  )
}
