import Link from "next/link"

export default function Header() {
  return (
    <header className="bg-blue-800 text-white shadow-md">
      <nav className="container mx-auto px-4 py-4">
        <ul className="flex justify-between items-center">
          <li>
            <Link href="/" className="text-xl font-bold">
              Genealogia Acadêmica FEI
            </Link>
          </li>
          <li>
            <ul className="flex space-x-4">
              <li>
                <Link href="/" className="hover:underline">
                  Início
                </Link>
              </li>
              <li>
                <Link href="/grafo" className="hover:underline">
                  Grafo
                </Link>
              </li>
              <li>
                <Link href="/sobre" className="hover:underline">
                  Sobre
                </Link>
              </li>
              <li>
                <Link href="/equipe" className="hover:underline">
                  Equipe
                </Link>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </header>
  )
}

