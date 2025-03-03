export default function QuemSomos() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Quem Somos</h1>
      <p className="text-lg">
        Somos um grupo de pesquisadores e desenvolvedores apaixonados por ciência e tecnologia. Nossa equipe
        multidisciplinar trabalha em conjunto para criar ferramentas que auxiliem na compreensão e análise do mundo
        acadêmico.
      </p>
      <h2 className="text-2xl font-semibold">Nossa Equipe</h2>
      <ul className="space-y-4">
        <li className="bg-muted p-4 rounded">
          <h3 className="text-xl font-semibold">Dra. Ana Silva</h3>
          <p>Coordenadora do Projeto e Pesquisadora em Ciência de Dados</p>
        </li>
        <li className="bg-muted p-4 rounded">
          <h3 className="text-xl font-semibold">Prof. Carlos Oliveira</h3>
          <p>Especialista em Análise de Redes Complexas</p>
        </li>
        <li className="bg-muted p-4 rounded">
          <h3 className="text-xl font-semibold">Eng. Mariana Santos</h3>
          <p>Desenvolvedora Full-Stack e Cientista de Dados</p>
        </li>
        <li className="bg-muted p-4 rounded">
          <h3 className="text-xl font-semibold">Dr. Rafael Mendes</h3>
          <p>Pesquisador em História da Ciência</p>
        </li>
      </ul>
    </div>
  )
}

