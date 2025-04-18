"use client"

import { useState, useEffect, useCallback } from "react"
import CytoscapeComponent from "react-cytoscapejs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Loader2, Maximize, Minimize, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useDebounce } from "@/hooks/use-debounce"

export default function Grafo() {
  const [elements, setElements] = useState<{ group: string; data: any }[]>([])
  const [selectedPesquisador, setSelectedPesquisador] = useState<{ id: string; nome: string } | null>(null)
  const [institutionFilter, setInstitutionFilter] = useState("Todas")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [institutions, setInstitutions] = useState<string[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [filteredElements, setFilteredElements] = useState<{ group: string; data: any }[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)

  // Estados para o autocomplete de pesquisadores
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [pesquisadores, setPesquisadores] = useState<{ id: string; nome: string }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const debouncedSearchValue = useDebounce(searchValue, 300)

  // Buscar pesquisadores com base no termo de busca
  useEffect(() => {
    const fetchPesquisadores = async () => {
      if (!debouncedSearchValue || debouncedSearchValue.length < 3) {
        setPesquisadores([])
        return
      }

      try {
        setSearchLoading(true)
        const response = await fetch(`/api/pesquisadores?query=${encodeURIComponent(debouncedSearchValue)}`)
        if (!response.ok) throw new Error("Falha ao buscar pesquisadores")

        const data = await response.json()
        setPesquisadores(data)
      } catch (err) {
        console.error("Erro ao buscar pesquisadores:", err)
      } finally {
        setSearchLoading(false)
      }
    }

    fetchPesquisadores()
  }, [debouncedSearchValue])

  const fetchGraphData = useCallback(
    async (pesquisadorId?: string, pesquisadorNome?: string) => {
      try {
        setLoading(true)

        let endpoint = isInitialLoad ? "/api/graph-data?initial=true" : "/api/graph-data"

        // Se temos um pesquisador selecionado, buscamos sua árvore genealógica
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

        console.log("Dados recebidos:", data)
        setElements([...data.nodes, ...data.edges])
        setFilteredElements([...data.nodes, ...data.edges])

        setInstitutions(data.metadata.institutions)
        setAreas(data.metadata.areas)

        if (isInitialLoad) {
          setIsInitialLoad(false)
        }

        setLoading(false)
      } catch (err) {
        console.error("Erro ao buscar dados:", err)
        setError(err instanceof Error ? err.message : "Erro desconhecido")
        setLoading(false)
      }
    },
    [isInitialLoad],
  )

  useEffect(() => {
    if (isInitialLoad) {
      fetchGraphData()
    }
  }, [isInitialLoad, fetchGraphData])

  // Aplicar filtro de instituição (apenas visual, não filtra os dados)
  useEffect(() => {
    if (institutionFilter !== "Todas") {
      // Não precisamos recarregar os dados, apenas atualizar o estilo
      // O estilo é aplicado diretamente no stylesheet do Cytoscape
    }
  }, [institutionFilter])

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
        "background-color": "#9C27B0", // Roxo vibrante para alto contraste
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Grafo de Genealogia Acadêmica</h1>

      <div className="flex flex-wrap gap-4">
        <div className="w-[280px]">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                {selectedPesquisador ? selectedPesquisador.nome : "Selecione um pesquisador..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
              <Command>
                <CommandInput placeholder="Buscar pesquisador..." value={searchValue} onValueChange={setSearchValue} />
                {searchLoading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {!searchLoading && (
                  <CommandList>
                    <CommandEmpty>Nenhum pesquisador encontrado.</CommandEmpty>
                    <CommandGroup>
                      {pesquisadores.map((pesquisador) => (
                        <CommandItem
                          key={pesquisador.id}
                          value={pesquisador.nome}
                          onSelect={() => handlePesquisadorSelect(pesquisador)}
                        >
                          {pesquisador.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                )}
              </Command>
            </PopoverContent>
          </Popover>
        </div>

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
          Grafo com todos pesquisadores
        </button>
      </div>

      <div className="border border-gray-300 rounded-lg relative" style={{ height: "600px" }}>
        <button onClick={toggleFullscreen} className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md z-10">
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
        <CytoscapeComponent
          elements={filteredElements}
          layout={layout}
          stylesheet={stylesheet}
          style={{ width: "100%", height: "100%" }}
          minZoom={0.5}
          maxZoom={2}
          wheelSensitivity={0.2}
          cy={(cy) => {
            cy.on("tap", "node", (evt) => {
              const node = evt.target
              setSelectedNode(node.data())

              // Limpar seleções anteriores
              cy.elements().unselect()

              // Selecionar o nó clicado
              node.select()
            })

            cy.on("tap", (evt) => {
              if (evt.target === cy) {
                // Clique no fundo limpa a seleção
                cy.elements().unselect()
                setSelectedNode(null)
              }
            })
          }}
        />
        {selectedNode && (
          <div className="absolute bottom-4 right-4 w-64 bg-white p-4 rounded-lg shadow-lg z-20">
            <h3 className="font-bold text-lg mb-2">{selectedNode.label}</h3>
            <p className="text-sm mb-1">
              <span className="font-semibold">Instituição:</span> {selectedNode.instituicaoCorrespondente || "N/A"}
            </p>
            <p className="text-sm mb-1">
              <span className="font-semibold">Área:</span> {selectedNode.areaDoutorado || "N/A"}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Semente:</span>{" "}
              {selectedNode.indicador_semente === "true" ? "Sim" : "Não"}
            </p>
          </div>
        )}
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
              layout={layout}
              stylesheet={stylesheet}
              style={{ width: "100%", height: "100%" }}
              minZoom={0.5}
              maxZoom={2}
              wheelSensitivity={0.2}
              cy={(cy) => {
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
            {selectedNode && (
              <div className="absolute bottom-4 right-4 w-64 bg-white p-4 rounded-lg shadow-lg z-20">
                <h3 className="font-bold text-lg mb-2">{selectedNode.label}</h3>
                <p className="text-sm mb-1">
                  <span className="font-semibold">Instituição:</span> {selectedNode.instituicaoCorrespondente || "N/A"}
                </p>
                <p className="text-sm mb-1">
                  <span className="font-semibold">Área:</span> {selectedNode.areaDoutorado || "N/A"}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Semente:</span>{" "}
                  {selectedNode.indicador_semente === "true" ? "Sim" : "Não"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
