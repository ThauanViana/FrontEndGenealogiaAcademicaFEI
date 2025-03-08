"use client"

import { useState, useEffect, useCallback } from "react"
import CytoscapeComponent from "react-cytoscapejs"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export default function Grafo() {
  const [elements, setElements] = useState<{ group: string; data: any }[]>([])
  const [nameFilter, setNameFilter] = useState("")
  const [institutionFilter, setInstitutionFilter] = useState("Todas")
  const [fieldFilter, setFieldFilter] = useState("Todas")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [institutions, setInstitutions] = useState<string[]>([])
  const [areas, setAreas] = useState<string[]>([])

  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/graph-data")
      if (!response.ok) {
        throw new Error("Falha ao buscar dados do grafo.")
      }
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }
      console.log(data)
      setElements([...data.nodes, ...data.edges])
      setInstitutions(data.metadata.institutions)
      setAreas(data.metadata.areas)
      setLoading(false)
    } catch (err) {
      console.error("Erro ao buscar dados:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  const applyFilters = useCallback(() => {
    if (elements.length === 0) return []

    // Se todos os filtros estiverem vazios, retorna todos os elementos
    if (nameFilter === "" && institutionFilter === "Todas" && fieldFilter === "Todas") {
      return elements
    }

    // Filtra os nós
    const filteredNodes = elements.filter((el) => {
      if (!el.data || !el.data.label) return false // Não é um nó

      const nameMatch = nameFilter === "" || el.data.label.toLowerCase().includes(nameFilter.toLowerCase())
      const institutionMatch = institutionFilter === "Todas" || el.data.instituicaoDoutorado === institutionFilter
      const fieldMatch = fieldFilter === "Todas" || el.data.areaDoutorado === fieldFilter

      return nameMatch && institutionMatch && fieldMatch
    })

    // Cria um Set com os IDs dos nós filtrados
    const filteredNodeIds = new Set(filteredNodes.map((node) => node.data.id))

    // Filtra as arestas que conectam os nós filtrados
    const filteredEdges = elements.filter((el) => {
      if (!el.data || !el.data.source) return false // Não é uma aresta
      return filteredNodeIds.has(el.data.source) && filteredNodeIds.has(el.data.target)
    })

    return [...filteredNodes, ...filteredEdges]
  }, [elements, nameFilter, institutionFilter, fieldFilter])

  const layout = {
    name: "cose",
    animate: false,
    nodeDimensionsIncludeLabels: true,
    padding: 50,
    componentSpacing: 100,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    edgeElasticity: 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
    randomize: true,
    refresh: 20,
    fit: true,
  }
  console.log("data")
  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#6495ED",
        label: "data(label)",
        width: 30,
        height: 30,
        "font-size": 12,
        "text-valign": "bottom",
        "text-halign": "center",
        "text-outline-color": "#ffffff",
        "text-outline-width": 2,
        "text-outline-opacity": 1,
        color: "#000000",
      },
    },
    {
      selector: "node[instituicaoDoutorado = 'FEI'], node[instituicaoDoutorado = 'FUNDAÇÃO EDUCACIONAL INACIANA']",
      style: {
        "background-color": "#FF6347",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#ccc",
        "target-arrow-color": "#ccc",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Carregando dados do grafo...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] text-destructive">
        <p>Erro: {error}</p>
      </div>
    )
  }

  const filteredElements = applyFilters()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Grafo de Genealogia Acadêmica</h1>

      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Filtrar por nome"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="max-w-xs"
        />
        <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Instituição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas as Instituições</SelectItem>
            {institutions.map((inst) => (
              <SelectItem key={inst} value={inst}>
                {inst}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fieldFilter} onValueChange={setFieldFilter}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas as Áreas</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area} value={area}>
                {area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-gray-300 rounded-lg" style={{ height: "600px" }}>
        <CytoscapeComponent
          elements={filteredElements}
          layout={layout}
          stylesheet={stylesheet}
          style={{ width: "100%", height: "100%" }}
          minZoom={0.5}
          maxZoom={2}
          wheelSensitivity={0.2}
        />
      </div>
    </div>
  )
}

