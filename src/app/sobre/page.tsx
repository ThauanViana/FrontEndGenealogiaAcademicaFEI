export default function Sobre() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Sobre o Projeto</h1>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Objetivo</h2>
        <p>
          O objetivo deste projeto é estruturar, caracterizar e analisar as influências acadêmicas entre instituições de
          ensino superior no Brasil, por meio de um meta-grafo baseado em Genealogia Acadêmica, com um foco inicial nos
          professores doutores da FEI.
        </p>
      </section>

      <section id="metodologia">
        <h2 className="text-2xl font-semibold mb-4">Metodologia</h2>
        <p>Nossa metodologia envolve três fases principais:</p>
        <ol className="list-decimal list-inside space-y-2 mt-2">
          <li>Extração dos pesquisadores da plataforma Lattes</li>
          <li>Estruturação dos grafos de genealogia acadêmica</li>
          <li>Estruturação e estudo sobre o metagrafo de instituições acadêmicas</li>
        </ol>
        <p className="mt-4">
          Utilizamos técnicas de web scraping para coletar dados da Plataforma Lattes e algoritmos de análise de grafos
          para estruturar e visualizar as relações acadêmicas.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Resultados Esperados</h2>
        <p>
          Esperamos obter insights valiosos sobre a formação e influência acadêmica entre instituições, identificar
          padrões de orientação e colaboração, e contribuir para o entendimento da evolução do conhecimento científico
          no Brasil.
        </p>
      </section>
    </div>
  )
}

