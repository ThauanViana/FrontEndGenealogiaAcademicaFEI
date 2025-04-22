"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Maximize, Minimize } from "lucide-react";
import type { Core } from "cytoscape";
import cytoscape from "cytoscape";
import elk from "cytoscape-elk";

cytoscape.use(elk);

export default function Grafo() {
  const [graphData, setGraphData] = useState<any[]>([]);
  const [cytoscapeElements, setCytoscapeElements] = useState<any[]>([]);
  const [selectedPesquisador, setSelectedPesquisador] = useState<{ id: string; nome: string } | null>(null);
  const [institutionFilter, setInstitutionFilter] = useState("Todas");
  const [labelFilter, setLabelFilter] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  //const [selectedNode, setSelectedNode] = useState(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const fetchGraphData = useCallback(async (pesquisadorId?: string) => {
    try {
      setLoading(true);

      let endpoint = "/api/graph-data";
      if (pesquisadorId) {
        endpoint = `/api/graph-data?pesquisadorId=${encodeURIComponent(pesquisadorId)}`;
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Falha ao buscar dados do grafo.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Adiciona a propriedade "iniciais" aos nós
      const elementsWithInitials = data.elements.map((el) => {
        if (el.group === "nodes" && el.data.label) {
          const initials = el.data.label
            .split(" ")
            .map((word) => word[0].toUpperCase() + ".")
            .join(" ");
          return {
            ...el,
            data: {
              ...el.data,
              iniciais: initials, // Adiciona a propriedade iniciais
            },
          };
        }
        return el;
      });

      setGraphData(elementsWithInitials);
      setCytoscapeElements(elementsWithInitials);
      setInstitutions(data.metadata.institutions);
      setLoading(false);

      console.log("Dados recebidos:", elementsWithInitials);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;
      const currentZoom = cy.zoom();
    const currentPan = cy.pan();
      // Remove todos os elementos existentes
      cy.elements().remove();

      // Adiciona os novos elementos filtrados
      cy.add(cytoscapeElements);

      // Reaplica o layout
      const layout = cy.layout({
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
      });
      layout.run();

      // Ajusta o zoom para caber no grafo
      // Restaura o estado de zoom e pan
    cy.zoom(currentZoom);
    cy.pan(currentPan);
    }
  }, [cytoscapeElements]);

  const handleInstitutionFilterChange = (value: string) => {
    setInstitutionFilter(value);

    if (value === "Todas") {
      setCytoscapeElements(graphData); // Mostra todos os elementos
    } else {
      // Filtra os nós que pertencem à instituição selecionada
      const filteredNodes = graphData.filter(
        (el) =>
          el.group === "nodes" &&
          (el.data.instituicaoCorrespondente === value || el.data.indicador_semente === "true")
      );

      // Cria um conjunto com os IDs dos nós filtrados
      const filteredNodeIds = new Set(filteredNodes.map((node) => node.data.id));

      // Filtra as arestas que conectam os nós filtrados
      const filteredEdges = graphData.filter(
        (el) =>
          el.group === "edges" &&
          filteredNodeIds.has(el.data.source) &&
          filteredNodeIds.has(el.data.target)
      );

      // Atualiza os elementos do grafo com os nós e arestas filtrados
      setCytoscapeElements([...filteredNodes, ...filteredEdges]);
    }
  };

  const handleLabelFilterChange = (value: string) => {
    setLabelFilter(value);

    if (value === "Todos") {
      setCytoscapeElements(graphData); // Mostra todos os elementos
    } else {
      // Filtra os nós que possuem o label selecionado
      const filteredNodes = graphData.filter(
        (el) => el.group === "nodes" && el.data.label === value
      );

      // Cria um conjunto com os IDs dos nós filtrados
      const filteredNodeIds = new Set(filteredNodes.map((node) => node.data.id));

      // Adiciona recursivamente os nós conectados
      const addConnectedNodes = (nodeId: string) => {
        graphData.forEach((el) => {
          if (el.group === "edges" && (el.data.source === nodeId || el.data.target === nodeId)) {
            const connectedNodeId = el.data.source === nodeId ? el.data.target : el.data.source;
            if (!filteredNodeIds.has(connectedNodeId)) {
              filteredNodeIds.add(connectedNodeId);
              addConnectedNodes(connectedNodeId); // Recursivamente adiciona nós conectados
            }
          }
        });
      };

      // Inicia a busca recursiva para cada nó filtrado
      filteredNodes.forEach((node) => addConnectedNodes(node.data.id));

      // Filtra os nós finais com base nos IDs coletados
      const finalFilteredNodes = graphData.filter(
        (el) => el.group === "nodes" && filteredNodeIds.has(el.data.id)
      );

      // Filtra as arestas que conectam os nós finais
      const filteredEdges = graphData.filter(
        (el) =>
          el.group === "edges" &&
          filteredNodeIds.has(el.data.source) &&
          filteredNodeIds.has(el.data.target)
      );

      // Atualiza os elementos do grafo com os nós e arestas filtrados
      setCytoscapeElements([...finalFilteredNodes, ...filteredEdges]);
    }
  };


  
  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#6495ED",
        label: "data(iniciais)", // Exibe as iniciais no lugar do label
        width: "mapData(relevancia, 0, 50, 20, 40)", // Mapeia largura com base em relevancia
        height: "mapData(relevancia, 0, 50, 20, 40)", // Mapeia altura com base em relevancia
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
      selector: "node[!relevancia]", // Nós sem relevancia
      style: {
        width: 20, // Valor padrão
        height: 20, // Valor padrão
      },
    },
    {
      selector: "node[indicador_semente = 'true']", // Nós marcados como sementes
      style: {
        "background-color": "#FFD700", // Cor amarela para as sementes
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
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Carregando dados do grafo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] text-destructive">
        <p>Erro: {error}</p>
      </div>
    );
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  const keyMapping: { [key: string]: string } = {
    label: "Nome",
    instituicaoCorrespondente: "Instituição",
    id: "Id Lattes",
    areaDoutorado: "Área Doutorado"
  };
  return (
    
    <div className="space-y-6">
    <h1 className="text-3xl font-bold">Grafo de Genealogia Acadêmica</h1>

    <div className="flex flex-wrap gap-4">
      <Select value={institutionFilter} onValueChange={handleInstitutionFilterChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Instituição" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todas">Todas as Instituições</SelectItem>
          {[...new Set(institutions)]
            .sort((a, b) => a.localeCompare(b))
            .map((inst) => (
              <SelectItem key={inst} value={inst}>
                {inst}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Select value={labelFilter} onValueChange={handleLabelFilterChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Label" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todos">Todos os Pesquisadores</SelectItem>
          {[...new Set(graphData.filter((el) => el.group === "nodes").map((node) => node.data.label))]
            .sort((a, b) => a.localeCompare(b))
            .map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <button
        onClick={() => {
          setSelectedPesquisador(null);
          fetchGraphData();
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 ml-auto"
      >
        Recarregar grafo
      </button>
    </div>

    <div className="flex">
      {/* Área do grafo */}
      <div className={`flex-1 border border-gray-300 rounded-lg relative ${selectedNode ? "mr-4" : ""}`} style={{ height: "600px" }}>
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
            cyRef.current = cy;

            const layout = cy.layout({
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
            });
            layout.run();

            cy.on("tap", "node", (evt) => {
              const node = evt.target;
              setSelectedNode(node.data());
            
              // Apenas seleciona o nó sem alterar o zoom ou o layout
              cy.elements().unselect();
              node.select();
            });

            cy.on("tap", (evt) => {
              if (evt.target === cy) {
                cy.elements().unselect();
                setSelectedNode(null);
              }
            });
          }}
        />
      </div>

 {/* Retângulo para exibir as propriedades do nó */}
{selectedNode && (
  <div className="p-4 border border-gray-300 rounded-lg" style={{ minWidth: "400px", maxWidth: "600px" }}>
    <h2 className="text-xl font-bold mb-4">Informações do Pesquisador</h2>
    <div className="space-y-2">
      {Object.entries(selectedNode)
        .filter(([key]) => key !== "relevancia" && key !== "indicador_semente") // Filtra para não exibir a propriedade relevancia
        .map(([key, value]) => (
          <div key={key} className="flex">
            <span className="font-medium w-1/3">{keyMapping[key] || key}:</span>
            <span className="w-2/3">{String(value)}</span>
          </div>
        ))}
    </div>
  </div>
)}
    </div>
  </div>
  )
}