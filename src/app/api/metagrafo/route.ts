import { NextResponse } from "next/server";
import neo4j from "neo4j-driver";

//export const dynamic = "force-dynamic";

export async function GET() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  try {
    let session = driver.session();
    const result = await session.run(`
      MATCH (orientador:Pesquisador)-[:ORIENTOU]->(orientado:Pesquisador)
      WHERE orientador.instituicaoCorrespondente IS NOT NULL AND orientado.instituicaoCorrespondente IS NOT NULL
      WITH orientador.instituicaoCorrespondente AS sourceInst, orientado.instituicaoCorrespondente AS targetInst, count(*) AS weight
      RETURN sourceInst, targetInst, weight
      ORDER BY weight DESC
    `);

    await session.close();

    const institutionsMap = new Map();
    const conexao_instituicao = new Map(); // Dicionário para conexões de saída entre instituições
    const conexao_instituicao_incoming = new Map(); // Dicionário para conexões de entrada entre instituições

    result.records.forEach((record) => {
      const sourceInst = record.get("sourceInst");
      const targetInst = record.get("targetInst");
      const weight = record.get("weight").toNumber();

      // Inicializa o dicionário para a instituição de origem, se necessário
      if (!conexao_instituicao.has(sourceInst)) {
        conexao_instituicao.set(sourceInst, {});
      }

      // Inicializa o dicionário para a instituição de destino, se necessário
      if (!conexao_instituicao_incoming.has(targetInst)) {
        conexao_instituicao_incoming.set(targetInst, {});
      }

      // Adiciona ou atualiza a quantidade de outgoing para a instituição de destino
      const sourceConnections = conexao_instituicao.get(sourceInst);
      sourceConnections[targetInst] = (sourceConnections[targetInst] || 0) + weight;

      // Adiciona ou atualiza a quantidade de incoming para a instituição de origem
      const targetConnections = conexao_instituicao_incoming.get(targetInst);
      targetConnections[sourceInst] = (targetConnections[sourceInst] || 0) + weight;

      // Inicializa o institutionsMap, se necessário
      if (!institutionsMap.has(sourceInst)) {
        institutionsMap.set(sourceInst, { count: 0, outgoing: 0, incoming: 0 });
      }
      if (!institutionsMap.has(targetInst)) {
        institutionsMap.set(targetInst, { count: 0, outgoing: 0, incoming: 0 });
      }

      // Atualiza os valores de outgoing e incoming
      institutionsMap.get(sourceInst).outgoing += weight;
      institutionsMap.get(targetInst).incoming += weight;
    });

    session = driver.session();
    const countResult = await session.run(`
      MATCH (p:Pesquisador)
      WHERE p.instituicaoCorrespondente IS NOT NULL
      RETURN p.instituicaoCorrespondente AS institution, count(*) AS count
    `);

    await session.close();

    countResult.records.forEach((record) => {
      const institution = record.get("institution");
      const count = record.get("count").toNumber();

      if (institutionsMap.has(institution)) {
        institutionsMap.get(institution).count = count;
      } else {
        institutionsMap.set(institution, { count, outgoing: 0, incoming: 0 });
      }
    });

    // Cria os nós e inclui os dicionários de conexões
    const nodes = Array.from(institutionsMap.entries()).map(([name, data]) => ({
      data: {
        id: name,
        label: name,
        size: data.incoming,
        outgoing: data.outgoing,
        incoming: data.incoming,
        conexao_instituicao: conexao_instituicao.get(name) || {}, // Inclui o dicionário de conexões de saída
        conexao_instituicao_incoming: conexao_instituicao_incoming.get(name) || {}, // Inclui o dicionário de conexões de entrada
        coeficiente_influencia: data.incoming > 0 ? data.outgoing / data.incoming : data.outgoing, // Coeficiente de influência
      },
    }));

    const edges = result.records.map((record, index) => ({
      data: {
        id: `e${index}`,
        source: record.get("sourceInst"),
        target: record.get("targetInst"),
        weight: record.get("weight").toNumber(),
      },
    }));

    await driver.close();

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error("Error fetching institution graph data:", error);

    try {
      await driver.close();
    } catch (closeError) {
      console.error("Error closing driver:", closeError);
    }

    return NextResponse.json({ error: "Falha ao buscar dados do metagrafo" }, { status: 500 });
  }
}
