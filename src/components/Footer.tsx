export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-600 py-4 mt-8">
      <div className="container mx-auto px-4 text-center">
        <p>&copy; {new Date().getFullYear()} Centro Universitário FEI. Todos os direitos reservados.</p>
        <p className="mt-2">Desenvolvido por Alisson Alexandre Botelho Barros e Thauan de Moraes Viana</p>
      </div>
    </footer>
  )
}

