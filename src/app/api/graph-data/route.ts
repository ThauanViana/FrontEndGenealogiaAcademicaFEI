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
    const isInitialLoad = searchParams.get("initial") === "true"

    let result

    if (isInitialLoad) {
      // Query para a primeira inicialização
      result = await session.run(`
        MATCH (alvo:Pesquisador {idLattes: "4231401119207209"})
OPTIONAL MATCH (alvo)-[:ORIENTOU]->(orientados:Pesquisador)
OPTIONAL MATCH (orientador:Pesquisador)-[:ORIENTOU]->(alvo)
OPTIONAL MATCH (orientador)-[:ORIENTOU]->(coorientados:Pesquisador)
WHERE coorientados.idLattes <> alvo.idLattes

WITH 
  // Cria listas individuais e remove nulos com WHERE
  COLLECT(DISTINCT CASE 
    WHEN alvo.idLattes IS NOT NULL THEN {
      id: alvo.idLattes,
      label: alvo.nome,
      instituicaoCorrespondente: alvo.instituicaoCorrespondente,
      areaDoutorado: alvo.areaDoutorado,
      indicador_semente: TOSTRING(alvo.indicador_semente)
    }
    ELSE NULL
  END) AS alvoNode,

  COLLECT(DISTINCT CASE 
    WHEN orientados.idLattes IS NOT NULL THEN {
      id: orientados.idLattes,
      label: orientados.nome,
      instituicaoCorrespondente: orientados.instituicaoCorrespondente,
      areaDoutorado: orientados.areaDoutorado,
      indicador_semente: TOSTRING(orientados.indicador_semente)
    }
    ELSE NULL
  END) AS orientadosNodes,

  COLLECT(DISTINCT CASE 
    WHEN orientador.idLattes IS NOT NULL THEN {
      id: orientador.idLattes,
      label: orientador.nome,
      instituicaoCorrespondente: orientador.instituicaoCorrespondente,
      areaDoutorado: orientador.areaDoutorado,
      indicador_semente: TOSTRING(orientador.indicador_semente)
    }
    ELSE NULL
  END) AS orientadorNode,

  COLLECT(DISTINCT CASE 
    WHEN coorientados.idLattes IS NOT NULL THEN {
      id: coorientados.idLattes,
      label: coorientados.nome,
      instituicaoCorrespondente: coorientados.instituicaoCorrespondente,
      areaDoutorado: coorientados.areaDoutorado,
      indicador_semente: TOSTRING(coorientados.indicador_semente)
    }
    ELSE NULL
  END) AS coorientadosNodes,

  // Relacionamentos
  COLLECT(DISTINCT CASE 
    WHEN orientados.idLattes IS NOT NULL THEN {
      source: alvo.idLattes,
      target: orientados.idLattes
    }
    ELSE NULL
  END) AS rel1,

  COLLECT(DISTINCT CASE 
    WHEN orientador.idLattes IS NOT NULL THEN {
      source: orientador.idLattes,
      target: alvo.idLattes
    }
    ELSE NULL
  END) AS rel2,

  COLLECT(DISTINCT CASE 
    WHEN coorientados.idLattes IS NOT NULL THEN {
      source: orientador.idLattes,
      target: coorientados.idLattes
    }
    ELSE NULL
  END) AS rel3,

  // Instituições e áreas
  COLLECT(DISTINCT alvo.instituicaoCorrespondente) +
  COLLECT(DISTINCT orientados.instituicaoCorrespondente) +
  COLLECT(DISTINCT orientador.instituicaoCorrespondente) +
  COLLECT(DISTINCT coorientados.instituicaoCorrespondente) AS instituicaoCorrespondente,

  COLLECT(DISTINCT alvo.areaDoutorado) +
  COLLECT(DISTINCT orientados.areaDoutorado) +
  COLLECT(DISTINCT orientador.areaDoutorado) +
  COLLECT(DISTINCT coorientados.areaDoutorado) AS areas

WITH 
  [n IN alvoNode + orientadosNodes + orientadorNode + coorientadosNodes WHERE n IS NOT NULL] AS nodes,
  [r IN rel1 + rel2 + rel3 WHERE r.source IS NOT NULL AND r.target IS NOT NULL] AS relationships,
  instituicaoCorrespondente,
  areas

RETURN {
  instituicaoCorrespondente: instituicaoCorrespondente,
  areas: areas,
  nodes: nodes,
  edges: relationships
} AS result



      `)
    } else {
      // Query principal para filtros e outras operações
      result = await session.run(`
        MATCH (n:Pesquisador)
        OPTIONAL MATCH (n)-[r:ORIENTOU]->(m:Pesquisador)
        WITH COLLECT(DISTINCT n.instituicaoCorrespondente) as instituicaoCorrespondente,
             COLLECT(DISTINCT n.areaDoutorado) as areas,
             COLLECT(DISTINCT {
               id: n.idLattes,
               label: n.nome,
               indicador_semente: TOSTRING(n.indicador_semente),
               instituicaoCorrespondente: n.instituicaoCorrespondente,
               areaDoutorado: n.areaDoutorado
             }) as nodes,
             COLLECT(DISTINCT {
               source: n.idLattes,
               target: m.idLattes
             }) as relationships
        RETURN {
          instituicaoCorrespondente: instituicaoCorrespondente,
          areas: areas,
          nodes: nodes,
          edges: [rel IN relationships WHERE rel.source IS NOT NULL AND rel.target IS NOT NULL]
        } as result
      `)
    }

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
        institutions: data.instituicaoCorrespondente?.filter(Boolean).sort() || [],
        areas: data.areas?.filter(Boolean).sort() || [],
      },
    })
  } catch (error) {
    console.error("Error fetching graph data:", error)
    return NextResponse.json({ error: "Falha ao consultar dados do grafo." }, { status: 500 })
  }
}