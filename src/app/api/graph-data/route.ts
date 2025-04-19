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
      const query = `
      MATCH (alvo:Pesquisador)
      WHERE alvo.idLattes = $pesquisadorId OR alvo.nome = $pesquisadorNome

      WITH alvo
      OPTIONAL MATCH (ancestral:Pesquisador)-[:ORIENTOU]->(alvo)
      WITH alvo, collect(DISTINCT ancestral) as ancestrais
      OPTIONAL MATCH (alvo)-[:ORIENTOU]->(descendente:Pesquisador)
      WITH alvo, ancestrais, collect(DISTINCT descendente) as descendentes

      // Combinar todos os nós relevantes
      WITH alvo, ancestrais + descendentes + [alvo] as allNodes

      // Primeiro coletar todos os nós para o Cytoscape
      WITH allNodes, [node IN allNodes | {
        group: 'nodes',
        data: {
          id: node.idLattes,
          label: node.nome,
          instituicaoCorrespondente: node.instituicaoCorrespondente,
          areaDoutorado: node.areaDoutorado,
          indicador_semente: TOSTRING(node.indicador_semente),
          relevancia: size((node)-[:ORIENTOU]-()) + size(()-[:ORIENTOU]->(node))
        }
      }] as cyNodes

      // Depois coletar todas as arestas entre esses nós
      UNWIND allNodes as source
      MATCH (source)-[r:ORIENTOU]->(target)
      WHERE target IN allNodes
      WITH DISTINCT cyNodes, collect(DISTINCT {
        group: 'edges',
        data: {
          id: source.idLattes + '_to_' + target.idLattes,
          source: source.idLattes,
          target: target.idLattes
        }
      }) as cyEdges

      // Retornar elementos do Cytoscape e metadados
      WITH cyNodes, cyEdges,
          [node IN DISTINCT cyNodes WHERE node.data.instituicaoCorrespondente IS NOT NULL | node.data.instituicaoCorrespondente] as institutions,
          [node IN DISTINCT cyNodes WHERE node.data.areaDoutorado IS NOT NULL | node.data.areaDoutorado] as areas

      RETURN {
        elements: cyNodes + cyEdges,
        metadata: {
          institutions: institutions,
          areas: areas,
          nodeCount: size(cyNodes)
        }
      } as result
    `

      result = await session.run(query, pesquisadorId ? { pesquisadorId } : { pesquisadorNome })
    } else {
      result = await session.run(
        `
        MATCH (p:Pesquisador)
        WITH p, size((p)-[:ORIENTOU]->()) + size(()-[:ORIENTOU]->(p)) as relevancia
        ORDER BY relevancia DESC
        WITH collect({
          group: 'nodes',
          data: {
            id: p.idLattes,
            label: p.nome,
            instituicaoCorrespondente: p.instituicaoCorrespondente,
            areaDoutorado: p.areaDoutorado,
            indicador_semente: TOSTRING(p.indicador_semente),
            relevancia: relevancia
          }
        }) as cyNodes, collect(p) as allNodes
        
        // Coletar instituições e áreas para os metadados
        WITH cyNodes, allNodes,
            [node IN allNodes WHERE node.instituicaoCorrespondente IS NOT NULL | node.instituicaoCorrespondente] as institutions,
            [node IN allNodes WHERE node.areaDoutorado IS NOT NULL | node.areaDoutorado] as areas
        
        UNWIND allNodes as source
        MATCH (source)-[r:ORIENTOU]->(target)
        WHERE target IN allNodes
        WITH cyNodes, collect({
          group: 'edges',
          data: {
            id: source.idLattes + '_to_' + target.idLattes,
            source: source.idLattes,
            target: target.idLattes
          }
        }) as cyEdges, institutions, areas
        
        RETURN {
          elements: cyNodes + cyEdges,
          metadata: {
            institutions: institutions,
            areas: areas,
            nodeCount: size(cyNodes)
          }
        } as result
        `);    
      }

    const data = result.records[0].get("result");

    const convertedData = {
      elements: data.elements.map((element: any) => ({
        ...element,
        data: {
          ...element.data,
          relevancia: element.data.relevancia?.toNumber?.() || element.data.relevancia, // Converter relevância, se for Integer
        },
      })),
      metadata: {
        institutions: data.metadata.institutions || [], // Provide default empty array if undefined
        areas: data.metadata.areas || [], // Provide default empty array if undefined
        nodeCount: data.metadata.nodeCount?.toNumber?.() || data.metadata.nodeCount || 0, // Converter nodeCount, se for Integer
      },
    };
    await session.close();
    await driver.close();

    return NextResponse.json(convertedData);
  } catch (error) {
    console.error("Error fetching graph data:", error)
    return NextResponse.json({ error: "Falha ao consultar dados do grafo." }, { status: 500 })
  }
}