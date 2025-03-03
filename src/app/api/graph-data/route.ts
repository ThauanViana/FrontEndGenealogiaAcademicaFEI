import { NextResponse } from "next/server"
import neo4j from "neo4j-driver"

export async function GET() {
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
  const session = driver.session()

  try {
    // Consulta otimizada para trazer dados e metadados em uma única query
    const result = await session.run(`
MATCH (n:Pesquisador)
OPTIONAL MATCH (n)-[r:ORIENTOU]->(m:Pesquisador)
WITH COLLECT(DISTINCT n.instituicaoDoutorado) as instituicaoDoutorado,
     COLLECT(DISTINCT n.areaDoutorado) as areas,
     COLLECT(DISTINCT {
       id: n.idLattes,
       label: n.nome,
       instituicaoDoutorado: n.instituicaoDoutorado,
       areaDoutorado: n.areaDoutorado
     }) as nodes,
     COLLECT(DISTINCT {
       source: n.idLattes,
       target: m.idLattes
     }) as relationships
RETURN {
  instituicaoDoutorado: instituicaoDoutorado,
  areas: areas,
  nodes: nodes,
  edges: [rel IN relationships WHERE rel.source IS NOT NULL AND rel.target IS NOT NULL]
} as result
    `)

    const data = result.records[0].get("result")

    // Formata os dados para o Cytoscape
    const nodes = data.nodes.map((node) => ({
      data: {
        ...node,
        id: node.id,
      },
    }))

    const edges = data.edges.map((edge, index) => ({
      data: {
        ...edge,
        id: `e${index}`,
      },
    }))

    await session.close()
    await driver.close()

    return NextResponse.json({
      nodes,
      edges,
      metadata: {
        institutions: data.instituicaoDoutorado.filter(Boolean).sort(),
        areas: data.areas.filter(Boolean).sort(),
      },
    })
  } catch (error) {
    console.error("Error fetching graph data:", error)
    return NextResponse.json({ error: "Failed to fetch graph data" }, { status: 500 })
  }
}