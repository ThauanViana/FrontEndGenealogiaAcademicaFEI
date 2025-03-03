import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function Equipe() {
  const equipe = [
    {
      nome: "Alisson Alexandre Botelho Barros",
      papel: "Pesquisador Principal",
      descricao: "Responsável por XPTO",
      foto: "/alisson.png?height=100&width=100",
    },
    {
      nome: "Thauan de Moraes Viana",
      papel: "Pesquisador Principal",
      descricao: "Responsável por XPTO2",
      foto: "/thauan.png?height=100&width=100",
    },
    {
      nome: "Prof. Dr. Luciano Rossi",
      papel: "Orientador",
      descricao:
        "Professor orientador do projeto, fornecendo direcionamento e experiência na análise de genealogia acadêmica. Possui mestrado e doutorado em Ciência da Computação pela Universidade Federal do ABC, ambos com ênfase em caracterização e métodos computacionais baseados em genealogia acadêmica.",
      foto: "/luciano.png?height=100&width=100",
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nossa Equipe</h1>

      <div className="grid gap-6">
        {equipe.map((membro, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-1/3 p-6 flex justify-center items-center bg-muted">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={membro.foto} alt={membro.nome} />
                    <AvatarFallback>
                      {membro.nome
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="sm:w-2/3 p-6">
                  <h2 className="text-xl font-semibold">{membro.nome}</h2>
                  <p className="text-sm text-muted-foreground mb-2">{membro.papel}</p>
                  <p className="text-sm">{membro.descricao}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

