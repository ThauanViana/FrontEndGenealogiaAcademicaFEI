import { NextResponse } from "next/server"
import neo4j from "neo4j-driver"

export async function GET(request: Request) {
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
  const session = driver.session()

  try {
    const { searchParams } = new URL(request.url)
    const pesquisadorId = searchParams.get("pesquisadorId")
    const pesquisadorNome = searchParams.get("pesquisadorNome")

    let result

    if (pesquisadorId || pesquisadorNome) {
      // Busca por pesquisador específico com suas conexões
      const query = `
        // Encontrar o pesquisador alvo
        MATCH (alvo:Pesquisador)
        WHERE ${pesquisadorId ? "alvo.idLattes = $pesquisadorId" : "alvo.nome = $pesquisadorNome"}
        
        // Encontrar todos os ancestrais e descendentes até 3 níveis
        WITH alvo
        OPTIONAL MATCH (ancestral:Pesquisador)-[:ORIENTOU*1..3]->(alvo)
        WITH alvo, collect(DISTINCT ancestral) as ancestrais
        OPTIONAL MATCH (alvo)-[:ORIENTOU*1..3]->(descendente:Pesquisador)
        WITH alvo, ancestrais, collect(DISTINCT descendente) as descendentes
        
        // Combinar todos os nós relevantes
        WITH alvo, ancestrais + descendentes + [alvo] as allNodes
        
        // Coletar todos os nós com suas conexões diretas
        UNWIND allNodes as node
        OPTIONAL MATCH (node)-[:ORIENTOU]->(orientado)
        WHERE orientado IN allNodes
        WITH node, collect({
          id: orientado.idLattes,
          nome: orientado.nome
        }) as orientados
        
        OPTIONAL MATCH (orientador)-[:ORIENTOU]->(node)
        WHERE orientador IN allNodes
        WITH node, orientados, collect({
          id: orientador.idLattes,
          nome: orientador.nome
        }) as orientadores
        
        // Retornar nós com suas conexões
        RETURN {
          id: node.idLattes,
          label: node.nome,
          instituicaoCorrespondente: node.instituicaoCorrespondente,
          areaDoutorado: node.areaDoutorado,
          indicador_semente: TOSTRING(node.indicador_semente),
          orientados: orientados,
          orientadores: orientadores
        } as nodeData
      `

      result = await session.run(query, pesquisadorId ? { pesquisadorId } : { pesquisadorNome })
    } else {
      // Busca de todos os pesquisadores sem limite, mas com informações de relevância
      // para ajudar na renderização progressiva
      result = await session.run(`
        // Encontrar todos os pesquisadores
        MATCH (p:Pesquisador)
        
        // Encontrar conexões diretas
        OPTIONAL MATCH (p)-[:ORIENTOU]->(orientado)
        OPTIONAL MATCH (orientador)-[:ORIENTOU]->(p)
        
        // Calcular relevância para priorização na renderização
        WITH p, 
             collect(DISTINCT orientado) as orientados,
             collect(DISTINCT orientador) as orientadores,
             count(DISTINCT orientado) + count(DISTINCT orientador) as relevancia
        
        // Ordenar por relevância para priorizar nós importantes
        ORDER BY relevancia DESC
        
        // Retornar nós com suas conexões
        RETURN {
          id: p.idLattes,
          label: p.nome,
          instituicaoCorrespondente: p.instituicaoCorrespondente,
          areaDoutorado: p.areaDoutorado,
          indicador_semente: TOSTRING(p.indicador_semente),
          orientados: [o IN orientados WHERE o IS NOT NULL | {id: o.idLattes, nome: o.nome}],
          orientadores: [o IN orientadores WHERE o IS NOT NULL | {id: o.idLattes, nome: o.nome}],
          relevancia: relevancia
        } as nodeData
      `)
    }

    // Extrair os nós com suas conexões
    const nodes = result.records.map((record) => record.get("nodeData"))

    // Coletar metadados
    const institutions = [...new Set(nodes.map((node) => node.instituicaoCorrespondente))].filter(Boolean)
    const areas = [...new Set(nodes.map((node) => node.areaDoutorado))].filter(Boolean)

    await session.close()
    await driver.close()

    return NextResponse.json({
      nodes,
      metadata: {
        institutions: institutions.sort(),
        areas: areas.sort(),
        nodeCount: nodes.length,
      },
    })
  } catch (error) {
    console.error("Error fetching graph data:", error)
    return NextResponse.json({ error: "Falha ao consultar dados do grafo." }, { status: 500 })
  }
}
