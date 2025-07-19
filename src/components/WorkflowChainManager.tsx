import React, { useState, useEffect } from 'react';
import { 
  Link, 
  Play, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  Download,
  Eye,
  EyeOff,
  Loader,
  TrendingUp,
  Users,
  Database,
  GripVertical,
  ArrowDown,
  ArrowUp,
  Copy,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText,
  Filter,
  Table
} from 'lucide-react';
import { 
  WorkflowChain, 
  WorkflowChainStep, 
  Workflow, 
  ChainExecutionResult,
  EvaluationResult,
  CSVData,
  ReferenceFile
} from '../types';
import { 
  saveWorkflowChain, 
  getWorkflowChains, 
  deleteWorkflowChain,
  executeWorkflowChain
} from '../utils/workflowChainStorage';
import { getWorkflows } from '../utils/workflowStorage';

interface WorkflowChainManagerProps {
  csvData: CSVData | null;
  referenceFiles: ReferenceFile[];
  onChainExecuted: (result: ChainExecutionResult) => void;
}

interface DraggedItem {
  type: 'workflow' | 'step';
  id: string;
  data: Workflow | WorkflowChainStep;
}

export const WorkflowChainManager: React.FC<WorkflowChainManagerProps> = ({
  csvData,
  referenceFiles,
  onChainExecuted
}) => {
  const [chains, setChains] = useState<WorkflowChain[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'execute'>('create');
  const [editingChain, setEditingChain] = useState<WorkflowChain | null>(null);
  const [chainName, setChainName] = useState('');
  const [chainDescription, setChainDescription] = useState('');
  const [selectedWorkflows, setSelectedWorkflows] = useState<WorkflowChainStep[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executingChainId, setExecutingChainId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [stepDataView, setStepDataView] = useState<{ [key: string]: 'summary' | 'data' }>({});
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingOverChain, setIsDraggingOverChain] = useState(false);

  useEffect(() => {
    loadChains();
    loadWorkflows();
  }, []);

  const loadChains = () => {
    setChains(getWorkflowChains());
  };

  const loadWorkflows = () => {
    setWorkflows(getWorkflows());
  };

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const handleCreateChain = () => {
    setModalMode('create');
    setChainName('');
    setChainDescription('');
    setSelectedWorkflows([]);
    setEditingChain(null);
    setIsModalOpen(true);
  };

  const handleEditChain = (chain: WorkflowChain) => {
    setModalMode('edit');
    setChainName(chain.name);
    setChainDescription(chain.description);
    setSelectedWorkflows([...chain.workflows]);
    setEditingChain(chain);
    setIsModalOpen(true);
  };

  const handleSaveChain = () => {
    if (!chainName.trim() || selectedWorkflows.length === 0) return;

    const chain: WorkflowChain = {
      id: editingChain?.id || generateId(),
      name: chainName.trim(),
      description: chainDescription.trim(),
      workflows: selectedWorkflows.map((step, index) => ({
        ...step,
        order: index + 1
      })),
      createdAt: editingChain?.createdAt || new Date(),
      updatedAt: new Date()
    };

    saveWorkflowChain(chain);
    loadChains();
    resetModal();
  };

  const handleDeleteChain = (id: string) => {
    if (window.confirm('Are you sure you want to delete this workflow chain?')) {
      deleteWorkflowChain(id);
      loadChains();
    }
  };

  const handleExecuteChain = async (chain: WorkflowChain) => {
    if (!csvData) {
      alert('Please load CSV data first');
      return;
    }

    setIsExecuting(true);
    setExecutingChainId(chain.id);
    setExecutionProgress(0);

    try {
      const result = await executeWorkflowChain(
        chain, 
        csvData, 
        referenceFiles,
        (progress) => setExecutionProgress(progress)
      );
      
      onChainExecuted(result);
      
      // Update the chain with final results
      const updatedChain: WorkflowChain = {
        ...chain,
        lastExecutedAt: new Date(),
        finalResults: result.finalResults,
        workflows: chain.workflows.map((step, index) => ({
          ...step,
          results: result.steps[index]?.results,
          executedAt: result.steps[index]?.completedAt,
          inputRecords: result.steps[index]?.inputRecords,
          outputRecords: result.steps[index]?.outputRecords
        }))
      };
      
      saveWorkflowChain(updatedChain);
      loadChains();
      
    } catch (error) {
      console.error('Chain execution failed:', error);
      alert(`Chain execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
      setExecutingChainId(null);
      setExecutionProgress(0);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: DraggedItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // For Firefox compatibility
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
    setIsDraggingOverChain(false);
  };

  const handleDragOver = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (index !== undefined) {
      setDragOverIndex(index);
    }
    setIsDraggingOverChain(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if we're leaving the entire drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
      setIsDraggingOverChain(false);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    if (draggedItem.type === 'workflow') {
      // Adding a new workflow from the available list
      const workflow = draggedItem.data as Workflow;
      const newStep: WorkflowChainStep = {
        id: generateId(),
        workflowId: workflow.id,
        workflowName: workflow.name,
        order: targetIndex !== undefined ? targetIndex + 1 : selectedWorkflows.length + 1,
        description: workflow.description
      };

      const newSteps = [...selectedWorkflows];
      if (targetIndex !== undefined) {
        newSteps.splice(targetIndex, 0, newStep);
      } else {
        newSteps.push(newStep);
      }

      // Reorder all steps
      const reorderedSteps = newSteps.map((step, index) => ({
        ...step,
        order: index + 1
      }));

      setSelectedWorkflows(reorderedSteps);
    } else if (draggedItem.type === 'step') {
      // Reordering existing steps
      const step = draggedItem.data as WorkflowChainStep;
      const currentIndex = selectedWorkflows.findIndex(s => s.id === step.id);
      
      if (currentIndex !== -1 && targetIndex !== undefined && currentIndex !== targetIndex) {
        const newSteps = [...selectedWorkflows];
        const [movedStep] = newSteps.splice(currentIndex, 1);
        newSteps.splice(targetIndex, 0, movedStep);

        // Reorder all steps
        const reorderedSteps = newSteps.map((step, index) => ({
          ...step,
          order: index + 1
        }));

        setSelectedWorkflows(reorderedSteps);
      }
    }

    setDraggedItem(null);
    setDragOverIndex(null);
    setIsDraggingOverChain(false);
  };

  const addWorkflowToChain = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const newStep: WorkflowChainStep = {
      id: generateId(),
      workflowId: workflow.id,
      workflowName: workflow.name,
      order: selectedWorkflows.length + 1,
      description: workflow.description
    };

    setSelectedWorkflows([...selectedWorkflows, newStep]);
  };

  const removeWorkflowFromChain = (stepId: string) => {
    const newSteps = selectedWorkflows.filter(step => step.id !== stepId);
    const reorderedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index + 1
    }));
    setSelectedWorkflows(reorderedSteps);
  };

  const duplicateStep = (step: WorkflowChainStep) => {
    const newStep: WorkflowChainStep = {
      ...step,
      id: generateId(),
      order: step.order + 1
    };

    const newSteps = [...selectedWorkflows];
    const insertIndex = selectedWorkflows.findIndex(s => s.id === step.id) + 1;
    newSteps.splice(insertIndex, 0, newStep);

    // Reorder all steps
    const reorderedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index + 1
    }));

    setSelectedWorkflows(reorderedSteps);
  };

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const toggleStepDataView = (stepId: string) => {
    setStepDataView(prev => ({
      ...prev,
      [stepId]: prev[stepId] === 'data' ? 'summary' : 'data'
    }));
  };

  const exportStepResults = (step: WorkflowChainStep, chainName: string) => {
    if (!step.results) return;

    const headers = csvData?.headers || [];
    const rows = step.results.matchedRows.map(row => 
      headers.map(col => row[col] || '').join(',')
    ).join('\n');
    
    const csvContent = `${headers.join(',')}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chainName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_step_${step.order}_${step.workflowName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setChainName('');
    setChainDescription('');
    setSelectedWorkflows([]);
    setEditingChain(null);
  };

  const exportChainResults = (chain: WorkflowChain) => {
    if (!chain.finalResults) return;

    const headers = csvData?.headers || [];
    const rows = chain.finalResults.matchedRows.map(row => 
      headers.map(col => row[col] || '').join(',')
    ).join('\n');
    
    const csvContent = `${headers.join(',')}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chain.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chain_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const renderStepDataTable = (step: WorkflowChainStep, maxRows: number = 10) => {
    if (!step.results || !csvData) return null;

    const headers = csvData.headers;
    const rows = step.results.matchedRows.slice(0, maxRows);

    return (
      <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h6 className="font-medium text-gray-900 flex items-center gap-2">
            <Table className="w-4 h-4" />
            Step Output Data
          </h6>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Showing {Math.min(maxRows, step.results.matchedRows.length)} of {step.results.matchedRows.length} records
            </span>
            <button
              onClick={() => exportStepResults(step, 'chain')}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              Export
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-64">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-900 border-b">#</th>
                {headers.slice(0, 8).map((header, index) => (
                  <th key={index} className="px-3 py-2 text-left font-medium text-gray-900 border-b">
                    {header}
                  </th>
                ))}
                {headers.length > 8 && (
                  <th className="px-3 py-2 text-left font-medium text-gray-500 border-b">
                    +{headers.length - 8} more...
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600 font-medium bg-gray-50">
                    {index + 1}
                  </td>
                  {headers.slice(0, 8).map((header, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-gray-800">
                      {row[header] || '-'}
                    </td>
                  ))}
                  {headers.length > 8 && (
                    <td className="px-3 py-2 text-gray-400">...</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <Link className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Workflow Chains</h3>
              <p className="text-gray-600">Drag and drop to create sequential workflows</p>
            </div>
          </div>
          
          <button
            onClick={handleCreateChain}
            disabled={workflows.length === 0}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Chain
          </button>
        </div>

        {/* Enhanced Info Box */}
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <GripVertical className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="text-sm text-purple-800">
              <div className="font-semibold mb-2">Drag & Drop Workflow Chaining with Step-by-Step Results:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>• Drag workflows from available list to chain</div>
                <div>• View detailed output data for each step</div>
                <div>• Export results from individual steps</div>
                <div>• Track data transformation through the pipeline</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chains List */}
        {chains.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
            <Link className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-600 mb-2">No workflow chains created</p>
            <p className="text-sm text-gray-500 mb-6">
              Create chains to execute multiple workflows sequentially with drag & drop
            </p>
            <button
              onClick={handleCreateChain}
              disabled={workflows.length === 0}
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mx-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create First Chain
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {chains.map((chain) => (
              <div key={chain.id} className="border border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{chain.name}</h4>
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        {chain.workflows.length} steps
                      </span>
                      {chain.lastExecutedAt && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Last run: {chain.lastExecutedAt.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{chain.description}</p>
                    
                    {/* Enhanced Workflow Steps Preview with Drag Indicators */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {chain.workflows.map((step, index) => (
                        <React.Fragment key={step.id}>
                          <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-2 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                            <GripVertical className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-medium text-purple-600">{index + 1}.</span>
                            <span className="text-sm text-gray-800">{step.workflowName}</span>
                            {step.outputRecords !== undefined && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                {step.outputRecords.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {index < chain.workflows.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-purple-400" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {chain.finalResults && (
                      <button
                        onClick={() => setShowResults(showResults === chain.id ? null : chain.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View detailed results"
                      >
                        {showResults === chain.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                    
                    {chain.finalResults && (
                      <button
                        onClick={() => exportChainResults(chain)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Export final results"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleExecuteChain(chain)}
                      disabled={!csvData || isExecuting}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Execute chain"
                    >
                      {isExecuting && executingChainId === chain.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleEditChain(chain)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Edit chain"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteChain(chain.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete chain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Execution Progress */}
                {isExecuting && executingChainId === chain.id && (
                  <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Loader className="w-4 h-4 text-purple-600 animate-spin" />
                      <span className="text-sm font-medium text-purple-800">
                        Executing chain... {executionProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${executionProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Enhanced Results Display with Step-by-Step Data */}
                {showResults === chain.id && chain.finalResults && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Detailed Chain Results & Step-by-Step Data
                    </h5>
                    
                    {/* Final Results Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-lg font-bold text-blue-600">{chain.finalResults.totalRows.toLocaleString()}</div>
                        <div className="text-xs text-blue-800">Input Records</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-lg font-bold text-green-600">{chain.finalResults.matchedCount.toLocaleString()}</div>
                        <div className="text-xs text-green-800">Final Output</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-lg font-bold text-purple-600">{chain.finalResults.percentage.toFixed(1)}%</div>
                        <div className="text-xs text-purple-800">Retention Rate</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-lg font-bold text-orange-600">{chain.workflows.length}</div>
                        <div className="text-xs text-orange-800">Processing Steps</div>
                      </div>
                    </div>

                    {/* Detailed Step-by-step results with data output */}
                    <div className="space-y-4">
                      <h6 className="font-medium text-gray-800 text-sm flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Step-by-Step Processing Results:
                      </h6>
                      {chain.workflows.map((step, index) => (
                        <div key={step.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          {/* Step Header */}
                          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleStepExpansion(step.id)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                >
                                  {expandedSteps.has(step.id) ? (
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                  )}
                                </button>
                                <span className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                  {index + 1}
                                </span>
                                <div>
                                  <h6 className="font-medium text-gray-900">{step.workflowName}</h6>
                                  <p className="text-xs text-gray-600">{step.description}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                {/* Data Flow Visualization */}
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                    In: {step.inputRecords?.toLocaleString() || 'N/A'}
                                  </div>
                                  <ArrowRight className="w-3 h-3 text-gray-400" />
                                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                    Out: {step.outputRecords?.toLocaleString() || 'N/A'}
                                  </div>
                                  {step.inputRecords && step.outputRecords && (
                                    <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                                      {((step.outputRecords / step.inputRecords) * 100).toFixed(1)}%
                                    </div>
                                  )}
                                </div>
                                
                                {step.results && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => toggleStepDataView(step.id)}
                                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                    >
                                      {stepDataView[step.id] === 'data' ? 'Hide Data' : 'View Data'}
                                    </button>
                                    <button
                                      onClick={() => exportStepResults(step, chain.name)}
                                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                                    >
                                      Export
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Step Details */}
                          {expandedSteps.has(step.id) && (
                            <div className="p-4">
                              {step.results ? (
                                <div className="space-y-4">
                                  {/* Step Statistics */}
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                      <div className="text-lg font-bold text-blue-700">{step.results.totalRows.toLocaleString()}</div>
                                      <div className="text-xs text-blue-800">Input Records</div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                      <div className="text-lg font-bold text-green-700">{step.results.matchedCount.toLocaleString()}</div>
                                      <div className="text-xs text-green-800">Output Records</div>
                                    </div>
                                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                      <div className="text-lg font-bold text-purple-700">{step.results.percentage.toFixed(1)}%</div>
                                      <div className="text-xs text-purple-800">Pass Rate</div>
                                    </div>
                                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                      <div className="text-lg font-bold text-orange-700">
                                        {(step.results.totalRows - step.results.matchedCount).toLocaleString()}
                                      </div>
                                      <div className="text-xs text-orange-800">Filtered Out</div>
                                    </div>
                                  </div>

                                  {/* Group Statistics if available */}
                                  {step.results.groupStats && (
                                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                      <h6 className="font-medium text-orange-900 mb-2">Group Analysis</h6>
                                      <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div>
                                          <div className="font-bold text-orange-700">{step.results.groupStats.totalGroups}</div>
                                          <div className="text-xs text-orange-800">Total Groups</div>
                                        </div>
                                        <div>
                                          <div className="font-bold text-orange-700">{step.results.groupStats.matchedGroups}</div>
                                          <div className="text-xs text-orange-800">Matched Groups</div>
                                        </div>
                                        <div>
                                          <div className="font-bold text-orange-700">{step.results.groupStats.groupPercentage.toFixed(1)}%</div>
                                          <div className="text-xs text-orange-800">Group Success Rate</div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Data Output Table */}
                                  {stepDataView[step.id] === 'data' && renderStepDataTable(step)}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No results data available for this step</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Modal with Drag & Drop */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-purple-600" />
                {modalMode === 'create' ? 'Create Workflow Chain' : 'Edit Workflow Chain'}
                <span className="text-sm font-normal text-gray-500">- Drag & Drop Interface</span>
              </h3>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chain Name *
                    </label>
                    <input
                      type="text"
                      value={chainName}
                      onChange={(e) => setChainName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter chain name..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={chainDescription}
                      onChange={(e) => setChainDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Describe this chain..."
                    />
                  </div>
                </div>

                {/* Enhanced Drag & Drop Interface */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Build Your Workflow Chain
                  </label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Available Workflows */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Available Workflows
                        <span className="text-xs text-gray-500">({workflows.filter(w => !selectedWorkflows.some(s => s.workflowId === w.id)).length} available)</span>
                      </h4>
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 min-h-64 max-h-80 overflow-y-auto bg-gray-50">
                        {workflows.filter(w => !selectedWorkflows.some(s => s.workflowId === w.id)).map((workflow) => (
                          <div
                            key={workflow.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, { type: 'workflow', id: workflow.id, data: workflow })}
                            onDragEnd={handleDragEnd}
                            className="group p-3 mb-2 bg-white border border-gray-200 rounded-lg hover:border-purple-300 cursor-move transition-all hover:shadow-md"
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{workflow.name}</div>
                                <div className="text-sm text-gray-600 truncate">{workflow.description}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Updated {workflow.updatedAt.toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={() => addWorkflowToChain(workflow.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-purple-600 hover:bg-purple-50 rounded transition-all"
                                title="Add to chain"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {workflows.filter(w => !selectedWorkflows.some(s => s.workflowId === w.id)).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">All workflows added to chain</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Chain Builder */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Chain Steps (in order)
                        <span className="text-xs text-gray-500">({selectedWorkflows.length} steps)</span>
                      </h4>
                      <div 
                        className={`border-2 border-dashed rounded-lg p-4 min-h-64 max-h-80 overflow-y-auto transition-colors ${
                          isDraggingOverChain 
                            ? 'border-purple-400 bg-purple-50' 
                            : 'border-gray-300 bg-gray-50'
                        }`}
                        onDragOver={(e) => handleDragOver(e)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e)}
                      >
                        {selectedWorkflows.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <GripVertical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">Drag workflows here to build your chain</p>
                            <p className="text-xs mt-1">Or click the + button on workflows</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedWorkflows.map((step, index) => (
                              <div key={step.id}>
                                {/* Drop zone above each step */}
                                <div
                                  className={`h-2 rounded transition-colors ${
                                    dragOverIndex === index ? 'bg-purple-300' : 'bg-transparent'
                                  }`}
                                  onDragOver={(e) => handleDragOver(e, index)}
                                  onDrop={(e) => handleDrop(e, index)}
                                />
                                
                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, { type: 'step', id: step.id, data: step })}
                                  onDragEnd={handleDragEnd}
                                  className="group p-3 bg-white border border-purple-200 rounded-lg hover:border-purple-400 cursor-move transition-all hover:shadow-md"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <GripVertical className="w-4 h-4 text-purple-400 group-hover:text-purple-600" />
                                      <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                        {index + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate">{step.workflowName}</div>
                                        <div className="text-xs text-gray-600 truncate">{step.description}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => duplicateStep(step)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                        title="Duplicate step"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => removeWorkflowFromChain(step.id)}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                        title="Remove step"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Arrow between steps */}
                                {index < selectedWorkflows.length - 1 && (
                                  <div className="flex justify-center py-1">
                                    <ArrowDown className="w-4 h-4 text-purple-400" />
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {/* Drop zone at the end */}
                            <div
                              className={`h-8 rounded border-2 border-dashed transition-colors ${
                                dragOverIndex === selectedWorkflows.length 
                                  ? 'border-purple-400 bg-purple-100' 
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                              onDragOver={(e) => handleDragOver(e, selectedWorkflows.length)}
                              onDrop={(e) => handleDrop(e, selectedWorkflows.length)}
                            >
                              <div className="flex items-center justify-center h-full text-xs text-gray-500">
                                Drop here to add at end
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chain Preview */}
                {selectedWorkflows.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Chain Execution Preview:
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium">
                        Input Data
                      </div>
                      {selectedWorkflows.map((step, index) => (
                        <React.Fragment key={step.id}>
                          <ArrowRight className="w-4 h-4 text-purple-600" />
                          <div className="bg-white border border-purple-200 px-3 py-1 rounded-lg text-sm">
                            <span className="text-purple-600 font-medium">{index + 1}.</span> {step.workflowName}
                          </div>
                        </React.Fragment>
                      ))}
                      <ArrowRight className="w-4 h-4 text-purple-600" />
                      <div className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm font-medium">
                        Final Results
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={resetModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChain}
                  disabled={!chainName.trim() || selectedWorkflows.length === 0}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {modalMode === 'create' ? 'Create Chain' : 'Update Chain'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};