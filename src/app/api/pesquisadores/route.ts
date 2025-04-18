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
    const query = searchParams.get("query") || ""
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    console.log(`Buscando pesquisadores com query: "${query}", limit: ${limit}`)

    // Busca pesquisadores que correspondem ao termo de busca
    // Usando CONTAINS para busca parcial e case-insensitive
    const result = await session.run(
      `
      MATCH (p:Pesquisador)
      WHERE toLower(p.nome) CONTAINS toLower($query)
      RETURN p.idLattes as id, p.nome as nome
      ORDER BY p.nome
      LIMIT $limit
    `,
      { query, limit },
    )

    const pesquisadores = result.records.map((record) => ({
      id: record.get("id"),
      nome: record.get("nome"),
    }))

    console.log(`Encontrados ${pesquisadores.length} pesquisadores`)

    await session.close()
    await driver.close()

    return NextResponse.json(pesquisadores)
  } catch (error) {
    console.error("Error fetching pesquisadores:", error)

    // Log mais detalhado do erro
    if (error instanceof Error) {
      console.error("Detalhes do erro:", error.message)
      console.error("Stack trace:", error.stack)
    }

    return NextResponse.json({ error: "Falha ao buscar pesquisadores." }, { status: 500 })
  }
}
