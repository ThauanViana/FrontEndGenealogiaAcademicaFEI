"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import CytoscapeComponent from "react-cytoscapejs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Loader2, Maximize, Minimize, Search, ZoomIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useDebounce } from "@/hooks/use-debounce"
import type { Core } from "cytoscape"
import cytoscape from "cytoscape"
import elk from "cytoscape-elk"

cytoscape.use(elk)

export default function Grafo() {
  const [graphData, setGraphData] = useState<any[]>([])
  const [cytoscapeElements, setCytoscapeElements] = useState<any[]>([])
  const [selectedPesquisador, setSelectedPesquisador] = useState<{ id: string; nome: string } | null>(null)
  const [institutionFilter, setInstitutionFilter] = useState("Todas")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [institutions, setInstitutions] = useState<string[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodeCount, setNodeCount] = useState(0)
  const cyRef = useRef<Core | null>(null)

  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [pesquisadores, setPesquisadores] = useState<{ id: string; nome: string }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const debouncedSearchValue = useDebounce(searchValue, 300)

  const fetchGraphData = useCallback(
    async (pesquisadorId?: string, pesquisadorNome?: string) => {
      try {
        setLoading(true)

        let endpoint = "/api/graph-data"

        if (pesquisadorId) {
          endpoint = `/api/graph-data?pesquisadorId=${encodeURIComponent(pesquisadorId)}`
        } else if (pesquisadorNome) {
          endpoint = `/api/graph-data?pesquisadorNome=${encodeURIComponent(pesquisadorNome)}`
        }

        console.log(`Fetching data from: ${endpoint}`)
        const response = await fetch(endpoint)

        if (!response.ok) {
          throw new Error("Falha ao buscar dados do grafo.")
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setCytoscapeElements(data.elements)
        setInstitutions(data.metadata.institutions)
        setAreas(data.metadata.areas)
        setNodeCount(data.metadata.nodeCount)

        setLoading(false)
      } catch (err) {
        console.error("Erro ao buscar dados:", err)
        setError(err instanceof Error ? err.message : "Erro desconhecido")
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#6495ED",
        label: "data(label)",
        width: "mapData(relevancia, 0, 50, 20, 40)",
        height: "mapData(relevancia, 0, 50, 20, 40)",
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
      selector:
        "node[instituicaoCorrespondente = 'Centro Universitario Fundacao Educacional Inaciana Pe Saboia Medeiros']",
      style: {
        "background-color": "#FF6347",
      },
    },
    {
      selector: "node[indicador_semente = 'true']",
      style: {
        "background-color": "#FFD700",
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
    {
      selector: "node:selected",
      style: {
        "background-color": "#9C27B0", 
        "border-width": 3,
        "border-color": "#E1BEE7",
        "text-outline-color": "#E1BEE7",
        "text-outline-width": 3,
      },
    },
    {
      selector: `node[instituicaoCorrespondente = '${institutionFilter}']`,
      style: {
        "border-width": 3,
        "border-color": "#4CAF50",
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handlePesquisadorSelect = (pesquisador: { id: string; nome: string }) => {
    setSelectedPesquisador(pesquisador)
    setOpen(false)
    fetchGraphData(pesquisador.id)
  }

  const zoomToFit = () => {
    if (cyRef.current) {
      cyRef.current.fit()
    }
  }

  const zoomToSelection = () => {
    if (cyRef.current && selectedNode) {
      const node = cyRef.current.getElementById(selectedNode.id)
      if (node.length > 0) {
        cyRef.current.animate({
          zoom: 2,
          center: { eles: node },
        })
      }
    }
  }

  const elkLayout = {
    name: "elk",
    elk: {
      algorithm: "mrtree", 
      direction: "DOWN", 
      spacing: 50,
      "nodePlacement.strategy": "NETWORK_SIMPLEX",
      "separateConnectedComponents": true,
      "componentSpacing": 600,
      "edgeSpacingFactor": 30,
    },
    fit: true, 
    animate: false,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Grafo de Genealogia Acadêmica</h1>

      <div className="flex flex-wrap gap-4">
        <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Instituição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas as Instituições</SelectItem>
            {institutions
              .slice()
              .sort((a, b) => a.localeCompare(b))
              .map((inst) => (
                <SelectItem key={inst} value={inst}>
                  {inst}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <button
          onClick={() => {
            setSelectedPesquisador(null)
            fetchGraphData()
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 ml-auto"
        >
          Recarregar grafo
        </button>
      </div>

      <div className="border border-gray-300 rounded-lg relative" style={{ height: "600px" }}>
        <button onClick={toggleFullscreen} className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md z-10">
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
        <CytoscapeComponent
        elements={cytoscapeElements}
        stylesheet={stylesheet}
        style={{ width: "100%", height: "100%" }}
        minZoom={0.1}
        maxZoom={3}
        wheelSensitivity={0.2}
        cy={(cy) => {
          cyRef.current = cy

          const layout = cy.layout(elkLayout)
          layout.run()

          cy.on("tap", "node", (evt) => {
            const node = evt.target
            setSelectedNode(node.data())

            cy.elements().unselect()

            node.select()
          })

          cy.on("tap", (evt) => {
            if (evt.target === cy) {
              cy.elements().unselect()
              setSelectedNode(null)
            }
          })
        }}
      />
      </div>
    </div>
  )
}