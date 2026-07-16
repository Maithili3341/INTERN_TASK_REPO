import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Search, ChevronLeft, ChevronRight, Moon, Sun, Eye, GitBranch, Info, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';

// Mock data generator (mimicking the Flask backend)
const generateMockData = () => {
  const relations = ["belongs_to", "depends_on", "connected_to", "linked_to"];
  const data: Array<{ child: string; parent: string; relation: string }> = [];
  
  for (let i = 1; i <= 500; i++) {
    const child = `Node_${i}`;
    const parent = `Node_${Math.floor(Math.random() * i)}`;
    const relation = relations[Math.floor(Math.random() * relations.length)];
    data.push({ child, parent, relation });
  }
  
  return data;
};

const mockData = generateMockData();

// Helper functions to mimic Flask endpoints
const getRootNodes = () => {
  const allChildren = new Set(mockData.map(d => d.child));
  const allParents = new Set(mockData.map(d => d.parent));
  return Array.from(allParents).filter(p => !allChildren.has(p)).slice(0, 10);
};

const expandNode = (nodeId: string) => {
  const edges: Array<{ from: string; to: string; label: string }> = [];
  
  mockData.forEach(row => {
    if (row.parent === nodeId) {
      edges.push({ from: row.parent, to: row.child, label: row.relation });
    }
    if (row.child === nodeId) {
      edges.push({ from: row.parent, to: row.child, label: row.relation });
    }
  });
  
  return { edges };
};

const getFullLineage = (nodeId: string) => {
  const lineageNodes = new Set<string>();
  const lineageEdges: Array<{ from: string; to: string; label: string }> = [];
  
  let current = nodeId;
  
  while (true) {
    const parent = mockData.find(d => d.child === current);
    if (!parent) break;
    
    lineageNodes.add(parent.parent);
    lineageNodes.add(parent.child);
    lineageEdges.push({
      from: parent.parent,
      to: parent.child,
      label: parent.relation
    });
    
    current = parent.parent;
  }
  
  mockData.forEach(row => {
    if (row.parent === nodeId) {
      lineageNodes.add(row.parent);
      lineageNodes.add(row.child);
      lineageEdges.push({
        from: row.parent,
        to: row.child,
        label: row.relation
      });
    }
  });
  
  return { nodes: Array.from(lineageNodes), edges: lineageEdges };
};

const getPath = (nodeId: string): string[] => {
  const path: string[] = [];
  let current = nodeId;
  
  while (true) {
    const parent = mockData.find(d => d.child === current);
    if (!parent) break;
    
    path.push(parent.parent);
    current = parent.parent;
  }
  
  return path.reverse();
};

const getAllNodes = () => {
  const allNodes = new Set<string>();
  mockData.forEach(d => {
    allNodes.add(d.child);
    allNodes.add(d.parent);
  });
  return Array.from(allNodes);
};

export function GraphExplorer() {
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstance = useRef<Network | null>(null);
  const nodesDataSet = useRef(new DataSet());
  const edgesDataSet = useRef(new DataSet());
  
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [forwardStack, setForwardStack] = useState<string[]>([]);
  const [allNodes] = useState<string[]>(getAllNodes());
  const [isFullView, setIsFullView] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [nodeDetails, setNodeDetails] = useState<{
    parents: Array<{ from: string; to: string; label: string }>;
    children: Array<{ from: string; to: string; label: string }>;
  }>({ parents: [], children: [] });
  const [nodePath, setNodePath] = useState<string[]>([]);

  // Initialize network
  useEffect(() => {
    if (!networkRef.current) return;

    const rootNodes = getRootNodes();
    const initialNodes = rootNodes.map(n => ({ id: n, label: n, shape: 'box' }));
    
    nodesDataSet.current.clear();
    nodesDataSet.current.add(initialNodes);

    const options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'UD',
          sortMethod: 'directed',
          nodeSpacing: 150,
          levelSeparation: 150,
          treeSpacing: 200,
        },
      },
      physics: {
        enabled: false,
      },
      nodes: {
        shape: 'box',
        margin: 10,
        borderWidth: 2,
        borderWidthSelected: 3,
        widthConstraint: {
          minimum: 100,
          maximum: 200,
        },
        font: {
          size: 14,
          color: darkMode ? '#fff' : '#000',
        },
        color: {
          border: darkMode ? '#4a5568' : '#cbd5e0',
          background: darkMode ? '#2d3748' : '#fff',
          highlight: {
            border: '#3b82f6',
            background: '#dbeafe',
          },
        },
      },
      edges: {
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.5,
          },
        },
        smooth: {
          enabled: true,
          type: 'cubicBezier',
          roundness: 0.5,
        },
        color: {
          color: darkMode ? '#718096' : '#a0aec0',
          highlight: '#3b82f6',
        },
        font: {
          size: 11,
          color: darkMode ? '#cbd5e0' : '#4a5568',
          strokeWidth: 0,
        },
      },
      interaction: {
        hover: true,
        navigationButtons: false,
        keyboard: false,
        zoomView: true,
        dragView: true,
      },
    };

    networkInstance.current = new Network(
      networkRef.current,
      { nodes: nodesDataSet.current, edges: edgesDataSet.current },
      options
    );

    // Fit the network after a short delay
    setTimeout(() => {
      networkInstance.current?.fit({
        animation: {
          duration: 500,
          easingFunction: 'easeInOutQuad',
        },
      });
    }, 100);

    networkInstance.current.on('click', (params) => {
      if (params.nodes.length > 0) {
        loadNode(params.nodes[0], true);
      }
    });

    return () => {
      networkInstance.current?.destroy();
    };
  }, []); // Remove darkMode dependency

  // Update network styling when dark mode changes
  useEffect(() => {
    if (!networkInstance.current) return;

    // Update nodes styling
    const allNodes = nodesDataSet.current.get();
    allNodes.forEach((node: any) => {
      const updates: any = {
        id: node.id,
        font: {
          ...node.font,
          color: node.color?.background === '#ef4444' || 
                 node.color?.background === '#60a5fa' || 
                 node.color?.background === '#fb923c' 
                 ? '#fff' 
                 : (darkMode ? '#fff' : '#000'),
        },
      };
      
      // Only update default styled nodes, not the colored ones (selected, parent, child)
      if (!node.color?.background || (node.color.background !== '#ef4444' && 
          node.color.background !== '#60a5fa' && 
          node.color.background !== '#fb923c')) {
        updates.color = {
          border: darkMode ? '#4a5568' : '#cbd5e0',
          background: darkMode ? '#2d3748' : '#fff',
        };
      }
      
      nodesDataSet.current.update(updates);
    });

    // Update edges styling
    const allEdges = edgesDataSet.current.get();
    allEdges.forEach((edge: any) => {
      // Don't update the purple highlighted path edges
      if (edge.color?.color !== '#8b5cf6') {
        edgesDataSet.current.update({
          id: edge.id,
          color: {
            color: darkMode ? '#718096' : '#a0aec0',
          },
          font: {
            ...edge.font,
            color: darkMode ? '#cbd5e0' : '#4a5568',
          },
        });
      }
    });
  }, [darkMode]);

  // Load node function
  const loadNode = (nodeId: string, saveHistory = true) => {
    if (saveHistory) {
      setHistoryStack(prev => [...prev, nodeId]);
      setForwardStack([]);
    }

    const data = isFullView ? getFullLineage(nodeId) : expandNode(nodeId);

    nodesDataSet.current.clear();
    edgesDataSet.current.clear();

    nodesDataSet.current.add({
      id: nodeId,
      label: nodeId,
      color: { background: '#ef4444', border: '#dc2626' },
      font: { color: '#fff' },
      shape: 'box',
    });

    const parents: Array<{ from: string; to: string; label: string }> = [];
    const children: Array<{ from: string; to: string; label: string }> = [];

    data.edges.forEach((e) => {
      if (e.to === nodeId) parents.push(e);
      if (e.from === nodeId) children.push(e);

      if (!nodesDataSet.current.get(e.from)) {
        nodesDataSet.current.add({
          id: e.from,
          label: e.from,
          color: { background: '#60a5fa', border: '#3b82f6' },
          font: { color: '#fff' },
          shape: 'box',
        });
      }

      if (!nodesDataSet.current.get(e.to)) {
        nodesDataSet.current.add({
          id: e.to,
          label: e.to,
          color: { background: '#fb923c', border: '#f97316' },
          font: { color: '#fff' },
          shape: 'box',
        });
      }

      edgesDataSet.current.add({
        id: e.from + '-' + e.to,
        from: e.from,
        to: e.to,
        label: e.label,
        width: 1,
      });
    });

    networkInstance.current?.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });

    setCurrentNode(nodeId);
    setNodeDetails({ parents, children });
    
    const path = getPath(nodeId);
    setNodePath(path);
    highlightPath(path, nodeId);
  };

  // Highlight path
  const highlightPath = (path: string[], nodeId: string) => {
    edgesDataSet.current.get().forEach((e: any) => {
      edgesDataSet.current.update({ id: e.id, width: 1 });
    });

    for (let i = 0; i < path.length - 1; i++) {
      const id = path[i] + '-' + path[i + 1];
      if (edgesDataSet.current.get(id)) {
        edgesDataSet.current.update({ id: id, width: 4, color: { color: '#8b5cf6' } });
      }
    }
    
    if (path.length > 0) {
      const lastId = path[path.length - 1] + '-' + nodeId;
      if (edgesDataSet.current.get(lastId)) {
        edgesDataSet.current.update({ id: lastId, width: 4, color: { color: '#8b5cf6' } });
      }
    }
  };

  // Search functionality
  useEffect(() => {
    if (searchValue.length >= 3) {
      const matches = allNodes
        .filter(n => n.toLowerCase().includes(searchValue.toLowerCase()))
        .slice(0, 20);
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchValue, allNodes]);

  const handleSearch = (nodeId?: string) => {
    const targetNode = nodeId || searchValue;
    if (targetNode) {
      loadNode(targetNode, true);
      setSearchValue('');
      setShowSuggestions(false);
    }
  };

  // History navigation
  const goBack = () => {
    if (historyStack.length > 1) {
      const newHistory = [...historyStack];
      const current = newHistory.pop()!;
      setHistoryStack(newHistory);
      setForwardStack(prev => [...prev, current]);
      loadNode(newHistory[newHistory.length - 1], false);
    }
  };

  const goForward = () => {
    if (forwardStack.length > 0) {
      const newForward = [...forwardStack];
      const next = newForward.pop()!;
      setForwardStack(newForward);
      setHistoryStack(prev => [...prev, next]);
      loadNode(next, false);
    }
  };

  // Toggle view
  const handleToggleView = () => {
    setIsFullView(!isFullView);
    if (historyStack.length > 0) {
      loadNode(historyStack[historyStack.length - 1], false);
    }
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Main Graph Area */}
      <div className="relative flex-1">
        <div
          ref={networkRef}
          className={`w-full h-full ${darkMode ? 'bg-gray-900' : 'bg-white'} transition-colors`}
        />

        {/* Top Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 flex gap-2"
        >
          <Button
            onClick={goBack}
            disabled={historyStack.length <= 1}
            variant="secondary"
            size="icon"
            className={`shadow-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={goForward}
            disabled={forwardStack.length === 0}
            variant="secondary"
            size="icon"
            className={`shadow-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setDarkMode(!darkMode)}
            variant="secondary"
            size="icon"
            className={`shadow-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}`}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </motion.div>

        {/* Bottom Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4"
        >
          <Button
            onClick={handleToggleView}
            variant="secondary"
            className={`shadow-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}`}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isFullView ? 'Full Lineage' : 'Local View'}
          </Button>
        </motion.div>
      </div>

      {/* Side Panel */}
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        className={`w-96 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col h-screen overflow-hidden`}
      >
        {/* Search Section - Fixed at top */}
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-5 w-5 text-blue-500" />
            <h2 className={`text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>Search Nodes</h2>
          </div>
          <div className="relative">
            <Input
              type="text"
              placeholder="Type to search nodes..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={`${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
            />
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute z-10 w-full mt-1 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                  } shadow-lg max-h-60 overflow-auto`}
                >
                  {suggestions.map((node, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSearch(node)}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-gray-600 text-blue-300' : 'hover:bg-blue-50 text-blue-600'
                      }`}
                    >
                      {node}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {searchValue.length > 0 && searchValue.length < 3 && (
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Type at least 3 characters
            </p>
          )}
        </div>

        {/* Details Section - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">{/* Node Info Card */}
            {currentNode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-purple-500" />
                      <CardTitle className={darkMode ? 'text-white' : ''}>Node Details</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Badge variant="outline" className="text-sm">
                          {currentNode}
                        </Badge>
                      </div>

                      <Separator />

                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Parents ({nodeDetails.parents.length})
                        </h4>
                        {nodeDetails.parents.length === 0 ? (
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>None</p>
                        ) : (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {nodeDetails.parents.map((p, idx) => (
                              <div
                                key={idx}
                                onClick={() => loadNode(p.from, true)}
                                className={`text-sm cursor-pointer px-2 py-1 rounded transition-colors ${
                                  darkMode
                                    ? 'text-blue-300 hover:bg-gray-600'
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                              >
                                {p.from}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Children ({nodeDetails.children.length})
                        </h4>
                        {nodeDetails.children.length === 0 ? (
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>None</p>
                        ) : (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {nodeDetails.children.map((c, idx) => (
                              <div
                                key={idx}
                                onClick={() => loadNode(c.to, true)}
                                className={`text-sm cursor-pointer px-2 py-1 rounded transition-colors ${
                                  darkMode
                                    ? 'text-orange-300 hover:bg-gray-600'
                                    : 'text-orange-600 hover:bg-orange-50'
                                }`}
                              >
                                {c.to}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Path Card */}
            {currentNode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-purple-500" />
                      <CardTitle className={darkMode ? 'text-white' : ''}>Lineage Path</CardTitle>
                    </div>
                    <CardDescription className={darkMode ? 'text-gray-400' : ''}>
                      Path from root to current node
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {nodePath.length === 0 ? (
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{currentNode}</strong> (Root)
                      </p>
                    ) : (
                      <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} space-y-1 max-h-48 overflow-y-auto`}>
                        {nodePath.map((node, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span
                              onClick={() => loadNode(node, true)}
                              className={`cursor-pointer transition-colors ${
                                darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'
                              }`}
                            >
                              {node}
                            </span>
                            <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>→</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{currentNode}</strong>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Legend Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <CardTitle className={darkMode ? 'text-white' : ''}>Legend</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Selected Node</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-400 rounded"></div>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Parent Node</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-400 rounded"></div>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Child Node</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-purple-500 rounded"></div>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Lineage Path</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* View Mode Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                <CardHeader>
                  <CardTitle className={darkMode ? 'text-white' : ''}>View Mode</CardTitle>
                  <CardDescription className={darkMode ? 'text-gray-400' : ''}>
                    Toggle between local and full lineage view
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="view-mode" className={darkMode ? 'text-gray-300' : ''}>
                      {isFullView ? 'Full Lineage' : 'Local View'}
                    </Label>
                    <Switch
                      id="view-mode"
                      checked={isFullView}
                      onCheckedChange={handleToggleView}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}