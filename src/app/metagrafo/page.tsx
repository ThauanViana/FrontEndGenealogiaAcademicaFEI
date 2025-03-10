"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import CytoscapeComponent from "react-cytoscapejs"
import { Loader2, Maximize, Minimize } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Core, NodeSingular } from "cytoscape"

export default function MetaGrafo() {
  const [elements, setElements] = useState<{ group: string; data: any }[]>([])
  const [filteredElements, setFilteredElements] = useState<{ group: string; data: any }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [institutionFilter, setInstitutionFilter] = useState("Todas")
  const [institutions, setInstitutions] = useState<string[]>([])
  const cyRef = useRef<Core | null>(null)
  const [layoutExecuted, setLayoutExecuted] = useState(false)

  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/metagrafo")
      if (!response.ok) {
        throw new Error("Falha ao buscar dados do metagrafo.")
      }
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const institutionsList = data.nodes.map((node) => node.data.label).sort()
      setInstitutions(institutionsList)

      const connectionCounts = new Map()

      data.nodes.forEach((node) => {
        connectionCounts.set(node.data.id, 0)
      })

      data.edges.forEach((edge) => {
        connectionCounts.set(edge.data.source, (connectionCounts.get(edge.data.source) || 0) + 1)
        connectionCounts.set(edge.data.target, (connectionCounts.get(edge.data.target) || 0) + 1)
      })

      const nodesWithConnections = data.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          connections: connectionCounts.get(node.data.id) || 0,
        },
      }))

      setElements([...nodesWithConnections, ...data.edges])
      setFilteredElements([...nodesWithConnections, ...data.edges])
      setLoading(false)
    } catch (err) {
      console.error("Erro ao buscar dados:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      setLoading(false)
    }
  }, [])

  const applyFilters = useCallback(() => {
    if (elements.length === 0) return

    if (institutionFilter === "Todas") {
      setFilteredElements(elements)
      return
    }

    const nodes = elements.filter((el) => !el.data.source && !el.data.target)
    const edges = elements.filter((el) => el.data.source && el.data.target)

    const filteredEdges = edges.filter(
      (edge) => edge.data.source === institutionFilter || edge.data.target === institutionFilter,
    )

    const nodeIdsToKeep = new Set()
    nodeIdsToKeep.add(institutionFilter)

    filteredEdges.forEach((edge) => {
      nodeIdsToKeep.add(edge.data.source)
      nodeIdsToKeep.add(edge.data.target)
    })

    const filteredNodes = nodes.filter((node) => nodeIdsToKeep.has(node.data.id))

    setFilteredElements([...filteredNodes, ...filteredEdges])
  }, [elements, institutionFilter])

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const layout = {
    name: "cose",
    animate: false,
    nodeDimensionsIncludeLabels: true,
    padding: 100,
    componentSpacing: 150,
    nodeRepulsion: (node) => {
      const connections = node.data("connections") || 0
      return 8000 + connections * 500
    },
    idealEdgeLength: (edge) => {
      const sourceNode = edge.source()
      const targetNode = edge.target()
      const sourceConnections = sourceNode.data("connections") || 0
      const targetConnections = targetNode.data("connections") || 0
      const maxConnections = Math.max(sourceConnections, targetConnections)
      return 100 + maxConnections * 5
    },
    edgeElasticity: 100,
    nestingFactor: 5,
    gravity: 0.5,
    numIter: 2000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
    randomize: true,
    refresh: 20,
    fit: true,
    infinite: false,
  }

  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#6495ED",
        label: "data(label)",
        width: "mapData(size, 1, 100, 20, 60)",
        height: "mapData(size, 1, 100, 20, 60)",
        "font-size": 12,
        "text-valign": "bottom",
        "text-halign": "center",
        "text-outline-color": "#ffffff",
        "text-outline-width": 2,
        "text-outline-opacity": 1,
        "text-background-color": "#ffffff",
        "text-background-opacity": 0.7,
        "text-background-padding": "2px",
        color: "#000000",
        "text-wrap": "wrap",
        "text-max-width": "120px",
      },
    },
    {
      selector: "node[label = 'FEI'], node[label = 'FUNDAÇÃO EDUCACIONAL INACIANA']",
      style: {
        "background-color": "#FF6347",
        width: 50,
        height: 50,
      },
    },
    {
      selector: "edge",
      style: {
        width: "mapData(weight, 1, 10, 1, 8)",
        "line-color": "#ccc",
        "target-arrow-color": "#ccc",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        opacity: 0.7,
      },
    },
    {
      selector: "edge[source = target]",
      style: {
        "curve-style": "bezier",
        "control-point-step-size": 80,
        "loop-direction": "0deg",
        "loop-sweep": "60deg",
        "line-color": "#FF6347",
        "target-arrow-color": "#FF6347",
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 3,
        "border-color": "#FFA500",
        "background-color": "#FFC107",
      },
    },
    {
      selector: "edge:selected",
      style: {
        width: "mapData(weight, 1, 10, 3, 10)",
        "line-color": "#FFA500",
        "target-arrow-color": "#FFA500",
        opacity: 1,
      },
    },
    {
      selector: "node[connections > 10]",
      style: {
        "border-width": 2,
        "border-color": "#4CAF50",
      },
    },
  ]

  const handleNodeClick = useCallback((event: any) => {
    event.stopPropagation()
    const node = event.target.data()
    setSelectedInstitution(node)
  }, [])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const initializeCytoscape = useCallback(
    (cy: Core) => {
      cyRef.current = cy
      cy.removeListener("tap")
      cy.on("tap", "node", handleNodeClick)
      cy.on("tap", (event) => {
        if (event.target === cy) {
          setSelectedInstitution(null)
        }
      })

      if (elements.length > 0 && !layoutExecuted) {
        cy.layout(layout).run()
        setLayoutExecuted(true);
      }
    },
    [handleNodeClick, elements, layoutExecuted]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Carregando dados do metagrafo...</p>
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Metagrafo de Instituições</h1>

      <p className="text-muted-foreground">
        Este grafo mostra as relações entre instituições acadêmicas. Cada nó representa uma instituição, e o tamanho do
        nó indica o número de pesquisadores. As arestas representam relações de orientação entre pesquisadores dessas
        instituições, e a espessura indica a quantidade de relações.
      </p>

      <div className="flex flex-wrap gap-4">
        <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filtrar por instituição" />
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
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 border border-gray-300 rounded-lg relative" style={{ height: "600px" }}>
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md z-10"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <CytoscapeComponent
            elements={filteredElements}
            stylesheet={stylesheet}
            style={{ width: "100%", height: "100%" }}
            minZoom={0.5}
            maxZoom={2}
            wheelSensitivity={0.2}
            cy={initializeCytoscape}
            userZoomingEnabled={true}
            userPanningEnabled={true}
            boxSelectionEnabled={false}
          />
        </div>

        <div>
          {selectedInstitution ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedInstitution.label}</CardTitle>
                <CardDescription>Detalhes da instituição</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Pesquisadores</p>
                    <p className="text-2xl">{selectedInstitution.size}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Orientações fornecidas</p>
                    <p className="text-2xl">{selectedInstitution.outgoing}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Orientações recebidas</p>
                    <p className="text-2xl">{selectedInstitution.incoming}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Conexões totais</p>
                    <p className="text-2xl">{selectedInstitution.connections}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Balanço de influência</p>
                    <p
                      className={`text-2xl ${selectedInstitution.outgoing > selectedInstitution.incoming ? "text-green-600" : "text-blue-600"}`}
                    >
                      {selectedInstitution.outgoing > selectedInstitution.incoming ? "Influenciadora" : "Receptora"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
                <CardDescription>Selecione uma instituição para ver detalhes</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Clique em uma instituição no grafo para visualizar suas estatísticas e relações.</p>
                <p className="mt-4">
                  O tamanho de cada nó representa o número de pesquisadores formados pela instituição.
                </p>
                <p className="mt-2">
                  A espessura das arestas representa a quantidade de relações de orientação entre as instituições.
                </p>
                <p className="mt-2 text-orange-600">
                  As arestas em vermelho representam auto-orientações (mesma instituição).
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="border border-gray-300 rounded-lg relative" style={{ height: "100%" }}>
            <button
              onClick={toggleFullscreen}
              className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md z-10"
            >
              <Minimize size={16} />
            </button>
            <CytoscapeComponent
              elements={filteredElements}
              stylesheet={stylesheet}
              style={{ width: "100%", height: "100%" }}
              minZoom={0.5}
              maxZoom={2}
              wheelSensitivity={0.2}
              cy={initializeCytoscape}
              userZoomingEnabled={true}
              userPanningEnabled={true}
              boxSelectionEnabled={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}