import { NextResponse } from "next/server"
import neo4j from "neo4j-driver"

export const dynamic = "force-dynamic";


export async function GET() {
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))

  try {
    let session = driver.session()
    const result = await session.run(`
      MATCH (orientador:Pesquisador)-[:ORIENTOU]->(orientado:Pesquisador)
      WHERE orientador.instituicaoCorrespondente IS NOT NULL AND orientado.instituicaoCorrespondente IS NOT NULL
      WITH orientador.instituicaoCorrespondente AS sourceInst, orientado.instituicaoCorrespondente AS targetInst, count(*) AS weight
      RETURN sourceInst, targetInst, weight
      ORDER BY weight DESC
    `)

    await session.close()
    const institutionsMap = new Map()

    result.records.forEach((record) => {
      const sourceInst = record.get("sourceInst")
      const targetInst = record.get("targetInst")
      const weight = record.get("weight").toNumber()

      if (!institutionsMap.has(sourceInst)) {
        institutionsMap.set(sourceInst, { count: 0, outgoing: 0, incoming: 0 })
      }
      if (!institutionsMap.has(targetInst)) {
        institutionsMap.set(targetInst, { count: 0, outgoing: 0, incoming: 0 })
      }

      institutionsMap.get(sourceInst).outgoing += weight
      institutionsMap.get(targetInst).incoming += weight
    })

    session = driver.session()
    const countResult = await session.run(`
      MATCH (p:Pesquisador)
      WHERE p.instituicaoCorrespondente IS NOT NULL
      RETURN p.instituicaoCorrespondente AS institution, count(*) AS count
    `)

    await session.close()

    countResult.records.forEach((record) => {
      const institution = record.get("institution")
      const count = record.get("count").toNumber()

      if (institutionsMap.has(institution)) {
        institutionsMap.get(institution).count = count
      } else {
        institutionsMap.set(institution, { count, outgoing: 0, incoming: 0 })
      }
    })

    const nodes = Array.from(institutionsMap.entries()).map(([name, data]) => ({
      data: {
        id: name,
        label: name,
        size: data.count,
        outgoing: data.outgoing,
        incoming: data.incoming,
      },
    }))

    const edges = result.records.map((record, index) => ({
      data: {
        id: `e${index}`,
        source: record.get("sourceInst"),
        target: record.get("targetInst"),
        weight: record.get("weight").toNumber(),
      },
    }))

    await driver.close()

    return NextResponse.json({ nodes, edges })
  } catch (error) {
    console.error("Error fetching institution graph data:", error)

    try {
      await driver.close()
    } catch (closeError) {
      console.error("Error closing driver:", closeError)
    }

    return NextResponse.json({ error: "Falha ao buscar dados do metagrafo" }, { status: 500 })
  }
}

