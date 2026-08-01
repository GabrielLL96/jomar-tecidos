import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/" className="flex items-center">
      <img
        src="/logo.png"
        alt="Jomar Tecidos e Enxovais"
        width={1672}
        height={941}
        className="h-16 w-auto shrink-0 object-contain"
      />
    </Link>
  )
}
