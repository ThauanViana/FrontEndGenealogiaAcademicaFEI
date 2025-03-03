import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="text-4xl font-bold mb-4">Mineração e Estruturação de Grafos Baseados em Genealogia Acadêmica</h1>
        <p className="text-xl mb-6">Um projeto do Centro Universitário FEI</p>
        <Link href="/grafo">
          <Button size="lg">Explorar o Grafo</Button>
        </Link>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sobre o Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Nosso projeto visa estruturar, caracterizar e analisar as influências acadêmicas entre instituições de
              ensino superior no Brasil, com foco inicial nos professores doutores da FEI.
            </p>
            <Link href="/sobre" className="text-blue-600 hover:underline mt-2 inline-block">
              Saiba mais
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metodologia</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Utilizamos técnicas de web scraping e análise de grafos para extrair e estruturar dados da Plataforma
              Lattes, criando uma representação visual da genealogia acadêmica.
            </p>
            <Link href="/sobre#metodologia" className="text-blue-600 hover:underline mt-2 inline-block">
              Ver detalhes
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

