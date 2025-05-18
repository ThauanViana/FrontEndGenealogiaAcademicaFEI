"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Maximize, Minimize } from "lucide-react";
import type { Core } from "cytoscape";
import cytoscape from "cytoscape";
import elk from "cytoscape-elk";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
const [shouldHandleInstitutionFilter, setShouldHandleInstitutionFilter] = useState(false);
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
  
      const elementsWithFirstName = data.elements.map((el) => {
        if (el.group === "nodes" && el.data.label) {
          const names = el.data.label.trim().split(/\s+/); // divide por espaços múltiplos também
          const firstName = names[0];
          const lastName = names[names.length - 1];
          const fullNameConcat = `${firstName} ${lastName}`;
          
          return {
            ...el,
            data: {
              ...el.data,
              primeiroNome: fullNameConcat, // Agora é a concatenação do primeiro e último nome
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
      setLabels(data.elements.filter((el) => el.group === "nodes").map((node) => node.data.label));
      setLoading(false);
      //console.log("Dados do grafo:", data);
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
    if (shouldHandleInstitutionFilter && firstFilter === "institution" && selectedInstitution) {
      handleInstitutionFilterChange(selectedInstitution);
      setShouldHandleInstitutionFilter(false); // Reseta a variável de controle
    }
  }, [shouldHandleInstitutionFilter, firstFilter, selectedInstitution]);

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
      
  
      //console.log("Reaplicando layout com configurações:", layout.options.elk);
  
      layout.run();
  
      // Ajusta o zoom para caber no grafo
      cy.fit();
      //cy.zoom(cy.zoom() * 0.5); 
      // Marque que o layout foi reaplicado
      setShouldReapplyLayout(false);
    }
  }, [cytoscapeElements, shouldReapplyLayout]);


  const resetFilter = (value: string) => {

    setInstitutionFilter("Todas");
    setLabelFilter("Todos");
    setInstitutions(originalInstitutions);
    setLabels(originalLabels);
    setSelectedInstitution(null);
    setSelectedResearcher(null);
    setFilteredInstitutionId(null);
    setFilteredResearcherId(null);
    setCytoscapeElements(graphData);
    setFirstFilter(null); 
    setShouldReapplyLayout(true);
  }


  const handleInstitutionFilterChange = (value: string) => {
    setInstitutionFilter(value);
  
    if (value === "Todas") {
      // Retorna ao estado inicial
      setSelectedInstitution(null);
      //setSelectedResearcher(null);
      setFilteredInstitutionId(null);
      //setCytoscapeElements(graphData);
      

      if (firstFilter === "institution" && selectedResearcher === null) {
        setLabels(originalLabels); // Mostra todos os pesquisadores
        setInstitutions(originalInstitutions); // Mostra todas as instituições
        setFirstFilter(null); // Reseta o primeiro filtro
        setCytoscapeElements(graphData);
      }else if (selectedResearcher !== null) {
        setFirstFilter("researcher"); // Mantém o filtro de pesquisador
        setLabels(originalLabels);
        //handleLabelFilterChange(selectedResearcher); // Aplica o filtro de pesquisador novamente
      }
    } else {
      if (firstFilter === null || firstFilter === "institution") {
        // Caso seja o primeiro filtro aplicado
        setFirstFilter("institution");
        setSelectedInstitution(value);
        setFilteredInstitutionId(value);
        setLabelFilter("Todos");
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

        // Atualiza a lista de labels com base nos nós filtrados pela instituição
      const filteredLabels = new Set(
        finalFilteredNodes.map((node) => node.data.label)
      );

      setLabels([...filteredLabels]); // Atualiza a lista de labels
  
        // Atualiza os elementos do grafo com os nós e arestas filtrados
        setCytoscapeElements([...finalFilteredNodes, ...finalFilteredEdges]);
      } else {
        // Caso o primeiro filtro já tenha sido aplicado
      setSelectedInstitution(value);
      setFilteredInstitutionId(value);

      if (firstFilter === "institution") {
        console.log("RODOU AQUI!! INSTITUIÇAO")
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
        
      }
    }
    //console.log("Valor do firstfilter:", firstFilter);
    setShouldReapplyLayout(true);
  };
  
  const handleLabelFilterChange = (value: string) => {
    setLabelFilter(value);
    
    if (value === "Todos") {
      // Retorna ao estado inicial
      setSelectedResearcher(null);
      
      setFilteredResearcherId(null);
      
      
      //setInstitutions(originalInstitutions); // Mostra todas as instituições
      if (firstFilter === "researcher" && selectedInstitution === null) {
        setLabels(originalLabels); // Mostra todos os pesquisadores
        setSelectedInstitution(null);
        setInstitutions(originalInstitutions);
        setFirstFilter(null); // Reseta o primeiro filtro
        setCytoscapeElements(graphData);
      }else if (selectedInstitution !== null) {
        
        setFirstFilter("institution"); // Mantém o filtro de pesquisador
        setInstitutions(originalInstitutions);
        //handleInstitutionFilterChange(selectedInstitution); // Aplica o filtro de instituição novamente
        //console.log("valor do firstfilter:", firstFilter) 
        
        //console.log("RODOU AQUI!!")
      }
    } else {
      setSelectedResearcher(value);
      //handleInstitutionFilterChange(institutionFilter); // Aplica o filtro de instituição novamente
      if(firstFilter === null  || firstFilter === "researcher"){
        setFirstFilter("researcher");
      
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
      // Atualiza a lista de instituições com base nos pesquisadores filtrados pelo label
      const filteredInstitutions = new Set(
        finalFilteredNodes.map((node) => node.data.instituicaoCorrespondente)
      );
  
      setInstitutions([...filteredInstitutions]); // Atualiza a lista de instituições
  
      // Atualiza os elementos do grafo com os nós e arestas filtrados
      setCytoscapeElements([...finalFilteredNodes, ...filteredEdges]);

      console.log("RESEARCHER FIRST!!")
    }else{
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
  }

    
    setShouldReapplyLayout(true);
    //console.log("Valor do firstfilter:", firstFilter);
  };
  
  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#6495ED",
        label: "data(primeiroNome)", // Exibe apenas o primeiro nome
        width:  80,// Mapeia largura com base em relevancia
        height: 80, // Mapeia altura com base em relevancia
        "font-size": 18,
        "text-valign": "bottom",
        "text-halign": "center",
        "text-outline-color": "#ffffff",
        "text-outline-width": 2,
        "text-outline-opacity": 1,
        color: "#000000",
      },
    },
    
    
    // {
    //   selector: "node[!relevancia]", // Nós sem relevancia
    //   style: {
    //     width: 20, // Valor padrão
    //     height: 20, // Valor padrão
    //   },
    // },
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
      selector: `node[id = '${filteredResearcherId}']`, 
      style: {
        "background-color": "#FFA500", // Cor laranja
    
      },
    },
    {
      selector: "node.selected", 
      style: {
        "background-color": "#800080", 
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
    areaDoutorado: "Área Doutorado",
    quantidadeDeFilhos: "Quantidade de Filhos Acadêmicos",
    quantidadeDeNetos: "Quantidade de Netos Acadêmicos",
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Grafo de Genealogia Acadêmica</h1>
  
      <div className="flex flex-wrap gap-4 items-center">
        {/* Filtro por Instituição */}
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
  
        {/* Filtro por Label */}
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
  
        {/* Botão para resetar os filtros */}
        <button
          onClick={() => {
            resetFilter("Todas");
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 focus:outline-none"
        >
          Resetar Filtros
        </button>
      </div>
  
      {/* Área principal: grafo + detalhes */}
      <div
        className={`flex ${isFullscreen ? "fixed inset-0 z-50 bg-white p-4" : ""}`}
        style={isFullscreen ? { height: "100vh" } : { height: "auto" }}
      >
        {/* Área do grafo */}
        <div
          className="flex-1 border border-gray-300 rounded-lg relative"
          style={{ height: isFullscreen ? "100%" : "600px", width: isFullscreen ? "100%" : "75%" }}
        >
          <button
            onClick={() => {
              toggleFullscreen();
              if (cyRef.current) {
                setTimeout(() => {
                  cyRef.current.resize();
                  cyRef.current.fit();
                }, 0);
              }
            }}
            className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md z-10"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <CytoscapeComponent
            elements={cytoscapeElements}
            stylesheet={stylesheet}
            style={{ width: "100%", height: "100%" }}
            minZoom={0.01}
            maxZoom={3}
            wheelSensitivity={0.2}
            cy={(cy) => {
              cyRef.current = cy;
  
              if (!isLayoutApplied) {
                const layout = cy.layout({
                  name: "elk",
                  elk: {
                    algorithm: "layered",
                    "elk.spacing.nodeNode": 100,
                    "elk.layered.spacing.nodeNodeBetweenLayers": 125,
                    "elk.layered.spacing.edgeNodeBetweenLayers": 100,
                    "elk.spacing.edgeEdge": 50,
                    "elk.spacing.componentComponent": 100,
                    "elk.direction": "DOWN",
                    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
                  },
                  fit: true,
                  animate: false,
                });
  
                layout.run();
                cy.fit();
                setIsLayoutApplied(true);
              }
  
              cy.on("tap", "node", (evt) => {
                const node = evt.target;
  
                cy.elements("node").removeClass("selected");
  
                node.addClass("selected");
  
                setSelectedNode(node.data());
              });
            }}
          />
        </div>
  
        {/* Retângulo para exibir as propriedades do nó */}
        <div style={{ maxWidth: "400px", minWidth: "300px" }}>
          {selectedNode ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedNode.label}</CardTitle>
                <CardDescription>Detalhes do pesquisador</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Instituição Correspondente</p>
                    <p className="text-2xl">{selectedNode.instituicaoCorrespondente || "Não especificado"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Área de Doutorado</p>
                    <p className="text-2xl">{selectedNode.areaDoutorado || "Não especificado"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Quantidade de Filhos Acadêmicos</p>
                    <p className="text-2xl">{selectedNode.quantidadeDeFilhos || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Quantidade de Netos Acadêmicos</p>
                    <p className="text-2xl">{selectedNode.quantidadeDeNetos || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">ID Lattes</p>
                    <p className="text-2xl">{selectedNode.id || "Não especificado"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
                <CardDescription>Selecione um pesquisador para ver detalhes</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Clique em um nó no grafo para visualizar informações como:</p>
                <ul className="mt-4 space-y-2 list-disc list-inside">
                  <li>Instituição do pesquisador</li>
                  <li>Quantidade de filhos acadêmicos</li>
                  <li>Quantidade de netos acadêmicos</li>
                  <li>ID Lattes</li>
                </ul>
              </CardContent>
            </Card>
          )}
  
          {/* Legenda para as cores dos nós */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Legenda</CardTitle>
              <CardDescription>Significado das cores dos nós</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2">
                  <span className="w-4 h-4 rounded-full bg-[#6495ED] inline-block"></span>
                  <span>Pesquisador padrão</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-4 h-4 rounded-full bg-[#FFD700] inline-block"></span>
                  <span>Pesquisador semente</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-4 h-4 rounded-full bg-[#FFA500] inline-block"></span>
                  <span>Pesquisador filtrado</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-4 h-4 rounded-full bg-[#eb3434] inline-block"></span>
                  <span>Instituição filtrada</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-4 h-4 rounded-full bg-[#800080] inline-block"></span>
                  <span>Pesquisador selecionado</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
