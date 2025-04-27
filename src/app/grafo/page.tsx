"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Maximize, Minimize } from "lucide-react";
import type { Core } from "cytoscape";
import cytoscape from "cytoscape";
import elk from "cytoscape-elk";
import { set } from "date-fns";

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
  const [labels, setLabels] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filteredResearcherId, setFilteredResearcherId] = useState<string | null>(null);
  const [filteredInstitutionId, setFilteredInstitutionId] = useState<string | null>(null);
  //const [selectedNode, setSelectedNode] = useState(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isLayoutApplied, setIsLayoutApplied] = useState(false);
  const [shouldReapplyLayout, setShouldReapplyLayout] = useState(false);
  const [filteredTreeNodeIds, setFilteredTreeNodeIds] = useState<Set<string>>(new Set());
  const [originalInstitutions, setOriginalInstitutions] = useState<string[]>([]);
const [originalLabels, setOriginalLabels] = useState<string[]>([]);
const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
const [selectedResearcher, setSelectedResearcher] = useState<string | null>(null);
const [firstFilter, setFirstFilter] = useState<"institution" | "researcher" | null>(null);

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
  
      // Adiciona a propriedade "primeiroNome" aos nós
      const elementsWithFirstName = data.elements.map((el) => {
        if (el.group === "nodes" && el.data.label) {
          const firstName = el.data.label.split(" ")[0]; // Extrai apenas o primeiro nome
          return {
            ...el,
            data: {
              ...el.data,
              primeiroNome: firstName, // Adiciona a propriedade primeiroNome
            },
          };
        }
        return el;
      });
  
      setGraphData(elementsWithFirstName);
      setCytoscapeElements(elementsWithFirstName);
      setInstitutions(data.metadata.institutions);

      
      setOriginalInstitutions(data.metadata.institutions);
setOriginalLabels(data.elements.filter((el) => el.group === "nodes").map((node) => node.data.label));
setLabels(originalLabels);
setLoading(false);
  
      console.log("Dados recebidos:", elementsWithFirstName);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

 
  const buildTreeRecursively = (nodeId: string, visitedNodes: Set<string>, nodeIdsToInclude: Set<string>) => {
    graphData.forEach((el) => {
      if (el.group === "edges" && (el.data.source === nodeId || el.data.target === nodeId)) {
        const connectedNodeId = el.data.source === nodeId ? el.data.target : el.data.source;
  
        if (!visitedNodes.has(connectedNodeId)) {
          visitedNodes.add(connectedNodeId);
          nodeIdsToInclude.add(connectedNodeId);
          buildTreeRecursively(connectedNodeId, visitedNodes, nodeIdsToInclude); // Chamada recursiva
        }
      }
    });
  };

  useEffect(() => {
    if (cyRef.current && shouldReapplyLayout) {
      const cy = cyRef.current;
  
      // Remove todos os elementos existentes
      cy.elements().remove();
  
      // Adiciona os novos elementos filtrados
      cy.add(cytoscapeElements);
  
      // Configura e aplica o layout
      const layout = cy.layout({
        name: "elk",
        elk: {
          algorithm: "layered", // ou "mrtree", mas "layered" costuma separar melhor
          "elk.spacing.nodeNode": 100, // Espaçamento entre nós
          "elk.layered.spacing.nodeNodeBetweenLayers": 125, // Espaço vertical entre camadas
          "elk.layered.spacing.edgeNodeBetweenLayers": 100, // Espaço de arestas
          "elk.spacing.edgeEdge": 50, // Espaço entre arestas
          "elk.spacing.componentComponent": 100, // Espaço entre componentes desconectados
          "elk.direction": "DOWN", // Direção do layout
          "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED", // Deixa a árvore mais equilibrada
        },
        fit: true,
        animate: false,
      });
      
  
      console.log("Reaplicando layout com configurações:", layout.options.elk);
  
      layout.run();
  
      // Ajusta o zoom para caber no grafo
      cy.fit();
  
      // Marque que o layout foi reaplicado
      setShouldReapplyLayout(false);
    }
  }, [cytoscapeElements, shouldReapplyLayout]);
  const handleInstitutionFilterChange = (value: string) => {
    setInstitutionFilter(value);
  
    if (value === "Todas") {
      // Retorna ao estado inicial
      setSelectedInstitution(null);
      setSelectedResearcher(null);
      setCytoscapeElements(graphData);
      setLabels(originalLabels); // Mostra todos os pesquisadores
      setInstitutions(originalInstitutions); // Mostra todas as instituições
    } else {
      setSelectedInstitution(value);
  setFilteredInstitutionId(value);
      // Filtra os nós que pertencem à instituição selecionada
      const filteredNodes = graphData.filter(
        (el) =>
          el.group === "nodes" &&
          el.data.instituicaoCorrespondente === value
      );
  
      // Cria um conjunto com os IDs dos nós filtrados
      const filteredNodeIds = new Set(filteredNodes.map((node) => node.data.id));
  
      // Constrói a árvore recursivamente
      const visitedNodes = new Set(filteredNodeIds);
      filteredNodeIds.forEach((nodeId) => {
        buildTreeRecursively(nodeId, visitedNodes, filteredNodeIds);
      });
  
      // Filtra os nós finais com base nos IDs coletados
      const finalFilteredNodes = graphData.filter(
        (el) => el.group === "nodes" && filteredNodeIds.has(el.data.id)
      );
  
      // Filtra as arestas que conectam os nós finais
      const finalFilteredEdges = graphData.filter(
        (el) =>
          el.group === "edges" &&
          filteredNodeIds.has(el.data.source) &&
          filteredNodeIds.has(el.data.target)
      );
  
      // Atualiza os elementos do grafo com os nós e arestas filtrados
      setCytoscapeElements([...finalFilteredNodes, ...finalFilteredEdges]);
    }
  
    setShouldReapplyLayout(true);
  };
  
  const handleLabelFilterChange = (value: string) => {
    setLabelFilter(value);
  
    if (value === "Todos") {
      // Retorna ao estado inicial
      setSelectedResearcher(null);
      setSelectedInstitution(null);
      setCytoscapeElements(graphData);
      setLabels(originalLabels); // Mostra todos os pesquisadores
      setInstitutions(originalInstitutions); // Mostra todas as instituições
    } else {
      setSelectedResearcher(value);
      
      // Filtra os nós que possuem o label selecionado
      const filteredNodes = graphData.filter(
        (el) => el.group === "nodes" && el.data.label === value
      );
  
      // Cria um conjunto com os IDs dos nós filtrados
      const filteredNodeIds = new Set(filteredNodes.map((node) => node.data.id));
      setFilteredResearcherId(filteredNodes[0]?.data.id || null);
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
  
    setShouldReapplyLayout(true);
  };
  
  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#6495ED",
        label: "data(primeiroNome)", // Exibe apenas o primeiro nome
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
      selector: "node.filtered", // Estilo para os nós filtrados
      style: {
        "background-color": "#FFA500", // Cor laranja
        "border-width": 3,
        "border-color": "red", // Adiciona uma borda vermelha para depuração
      },
    },
    
    
    {
      selector: `node[instituicaoCorrespondente = '${filteredInstitutionId}']`, // Estilo dinâmico para a instituição filtrada
      style: {
        "background-color": "#eb3434", // Cor amarela
        
      },
    },
    {
      selector: `node[id = '${filteredResearcherId}']`, // Estilo dinâmico para o pesquisador filtrado
      style: {
        "background-color": "#FFA500", // Cor laranja
    
      },
    },
    {
      selector: "node.selected", // Estilo para o nó selecionado
      style: {
        "background-color": "#800080", // Cor roxa
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
          {[...new Set(labels)]
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

            if (!isLayoutApplied) {
              const layout = cy.layout({
                name: "elk",
                elk: {
                  algorithm: "layered", // ou "mrtree", mas "layered" costuma separar melhor
                  "elk.spacing.nodeNode": 100, // Espaçamento entre nós
                  "elk.layered.spacing.nodeNodeBetweenLayers": 125, // Espaço vertical entre camadas
                  "elk.layered.spacing.edgeNodeBetweenLayers": 100, // Espaço de arestas
                  "elk.spacing.edgeEdge": 50, // Espaço entre arestas
                  "elk.spacing.componentComponent": 100, // Espaço entre componentes desconectados
                  "elk.direction": "DOWN", // Direção do layout
                  "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED", // Deixa a árvore mais equilibrada
                },
                fit: true,
                animate: false,
              });
              
          
              layout.run();
              setIsLayoutApplied(true); // Marca o layout como aplicado
            }

            cy.on("tap", "node", (evt) => {
              const node = evt.target;
            
              // Remove a classe 'selected' de todos os nós
              cy.elements("node").removeClass("selected");
            
              // Adiciona a classe 'selected' ao nó clicado
              node.addClass("selected");
            
              // Atualiza o estado do nó selecionado
              setSelectedNode(node.data());
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