import React, { useState, useEffect } from 'react';
import { Save, Folder, Trash2, Download, Plus, Edit3, CheckCircle, Upload, FileText, AlertTriangle, Info, Database, RotateCcw, Copy } from 'lucide-react';
import { Workflow, RuleGroup, ReferenceFile } from '../types';
import { saveWorkflow, getWorkflows, deleteWorkflow, exportWorkflows } from '../utils/workflowStorage';
import { importWorkflowFromJSON, exportWorkflowToJSON } from '../utils/workflowImporter';

interface WorkflowManagerProps {
  currentRules: RuleGroup;
  currentWorkflow: Workflow | null;
  referenceFiles: ReferenceFile[];
  onLoadWorkflow: (workflow: Workflow) => void;
  onRulesChange: (rules: RuleGroup) => void;
  onWorkflowSaved: (workflow: Workflow) => void;
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({
  currentRules,
  currentWorkflow,
  referenceFiles,
  onLoadWorkflow,
  onRulesChange,
  onWorkflowSaved
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'save' | 'load' | 'import' | 'edit'>('save');
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = () => {
    setWorkflows(getWorkflows());
  };

  const handleSaveWorkflow = () => {
    if (!workflowName.trim()) return;

    const workflow: Workflow = {
      id: editingWorkflow?.id || Date.now().toString(),
      name: workflowName.trim(),
      description: workflowDescription.trim(),
      rules: currentRules,
      referenceFiles: referenceFiles, // Save complete reference files
      createdAt: editingWorkflow?.createdAt || new Date(),
      updatedAt: new Date()
    };

    saveWorkflow(workflow);
    loadWorkflows();
    onWorkflowSaved(workflow);
    resetModal();
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setModalMode('edit');
    setWorkflowName(workflow.name);
    setWorkflowDescription(workflow.description);
    setEditingWorkflow(workflow);
    setIsModalOpen(true);
  };

  const handleUpdateWorkflow = () => {
    if (!editingWorkflow || !workflowName.trim()) return;

    const updatedWorkflow: Workflow = {
      ...editingWorkflow,
      name: workflowName.trim(),
      description: workflowDescription.trim(),
      rules: currentRules,
      referenceFiles: referenceFiles,
      updatedAt: new Date()
    };

    saveWorkflow(updatedWorkflow);
    loadWorkflows();
    onWorkflowSaved(updatedWorkflow);
    resetModal();
  };

  const handleDuplicateWorkflow = (workflow: Workflow) => {
    const duplicatedWorkflow: Workflow = {
      ...workflow,
      id: Date.now().toString(),
      name: `${workflow.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    saveWorkflow(duplicatedWorkflow);
    loadWorkflows();
  };

  const handleImportWorkflow = () => {
    try {
      setImportError('');
      const workflow = importWorkflowFromJSON(importText);
      
      // Save the imported workflow with all reference file details
      saveWorkflow(workflow);
      loadWorkflows();
      
      // Load the imported workflow
      onLoadWorkflow(workflow);
      
      resetModal();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  };

  const handleExportWorkflow = (workflow: Workflow) => {
    const jsonString = exportWorkflowToJSON(workflow);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_workflow_complete.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteWorkflow = (id: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      deleteWorkflow(id);
      loadWorkflows();
      // Clear current workflow if it was deleted
      if (currentWorkflow?.id === id) {
        onWorkflowSaved(null as any);
      }
    }
  };

  const handleLoadWorkflow = (workflow: Workflow) => {
    // Check if workflow has reference file information
    const hasReferenceInfo = workflow.referenceFiles && workflow.referenceFiles.length > 0;
    
    if (hasReferenceInfo) {
      const refFileNames = workflow.referenceFiles.map(rf => rf.name).join(', ');
      const hasData = workflow.referenceFiles.some(rf => rf.rows && rf.rows.length > 0);
      
      if (hasData) {
        alert(`Loading workflow with reference files: ${refFileNames}\n\nReference file structure and sample data will be restored.`);
      } else {
        alert(`This workflow includes reference file definitions: ${refFileNames}\n\nFile structure is preserved, but you may need to re-upload the complete data files.`);
      }
    }
    
    onLoadWorkflow(workflow);
    setIsModalOpen(false);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportText(content);
      };
      reader.readAsText(file);
    }
  };

  const openSaveModal = () => {
    setModalMode('save');
    setWorkflowName('');
    setWorkflowDescription('');
    setEditingWorkflow(null);
    setIsModalOpen(true);
  };

  const openLoadModal = () => {
    setModalMode('load');
    setIsModalOpen(true);
  };

  const openImportModal = () => {
    setModalMode('import');
    setImportText('');
    setImportError('');
    setIsModalOpen(true);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setWorkflowName('');
    setWorkflowDescription('');
    setEditingWorkflow(null);
    setImportText('');
    setImportError('');
  };

  const hasRules = currentRules.conditions.length > 0 || (currentRules.referenceConditions?.length || 0) > 0 || currentRules.groups.length > 0;

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Folder className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Workflow Management</h3>
            <p className="text-gray-600">Save, load, edit, and manage your rule configurations</p>
          </div>
          {currentWorkflow && (
            <div className="ml-auto flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {currentWorkflow.name} loaded
              </span>
            </div>
          )}
        </div>

        {/* Enhanced Reference File Storage Info */}
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="text-sm text-green-800">
              <div className="font-semibold mb-2">Complete Workflow Storage & Editing:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>• Edit and update saved workflows</div>
                <div>• Duplicate workflows for variations</div>
                <div>• Reference file names and structure</div>
                <div>• Complete rule preservation</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={openSaveModal}
            disabled={!hasRules}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Save className="w-5 h-5 mr-2" />
            Save New Workflow
          </button>

          {currentWorkflow && hasRules && (
            <button
              onClick={() => handleEditWorkflow(currentWorkflow)}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Edit3 className="w-5 h-5 mr-2" />
              Update Current Workflow
            </button>
          )}
          
          <button
            onClick={openLoadModal}
            disabled={workflows.length === 0}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Folder className="w-5 h-5 mr-2" />
            Load Workflow
          </button>
          
          <button
            onClick={openImportModal}
            className="flex items-center px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import JSON
          </button>
          
          <button
            onClick={exportWorkflows}
            disabled={workflows.length === 0}
            className="flex items-center px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Download className="w-5 h-5 mr-2" />
            Export All
          </button>
        </div>

        {workflows.length > 0 && (
          <div className="mt-8">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Saved Workflows ({workflows.length})
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Editable & Complete
              </span>
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {workflows.slice(0, 5).map((workflow) => {
                const isCurrentWorkflow = currentWorkflow?.id === workflow.id;
                const refFileCount = workflow.referenceFiles?.length || 0;
                const hasRefData = workflow.referenceFiles?.some(rf => rf.rows && rf.rows.length > 0);
                const hasRefStructure = workflow.referenceFiles?.some(rf => rf.headers && rf.headers.length > 0);
                
                return (
                  <div 
                    key={workflow.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                      isCurrentWorkflow 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold truncate flex items-center gap-2 ${
                        isCurrentWorkflow ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {isCurrentWorkflow && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                        {workflow.name}
                        {refFileCount > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                              {refFileCount} ref files
                            </span>
                            {hasRefData && (
                              <CheckCircle className="w-4 h-4 text-green-600" title="Reference data included" />
                            )}
                            {!hasRefData && hasRefStructure && (
                              <Info className="w-4 h-4 text-blue-600" title="Reference structure saved" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className={`text-sm truncate ${
                        isCurrentWorkflow ? 'text-blue-700' : 'text-gray-500'
                      }`}>
                        {workflow.description || 'No description'}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isCurrentWorkflow ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        Updated {workflow.updatedAt.toLocaleDateString()}
                        {refFileCount > 0 && (
                          <span className="ml-2">
                            • {workflow.referenceFiles?.map(rf => rf.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {!isCurrentWorkflow && (
                        <button
                          onClick={() => handleLoadWorkflow(workflow)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Load workflow"
                        >
                          <Folder className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicateWorkflow(workflow)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Duplicate workflow"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExportWorkflow(workflow)}
                        className={`p-2 rounded-lg transition-colors ${
                          isCurrentWorkflow 
                            ? 'text-purple-600 hover:bg-purple-50' 
                            : 'text-purple-600 hover:bg-purple-50'
                        }`}
                        title="Export workflow as JSON"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditWorkflow(workflow)}
                        className={`p-2 rounded-lg transition-colors ${
                          isCurrentWorkflow 
                            ? 'text-orange-600 hover:bg-orange-100' 
                            : 'text-orange-600 hover:bg-orange-50'
                        }`}
                        title="Edit workflow"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete workflow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {modalMode === 'save' 
                  ? 'Save New Workflow'
                  : modalMode === 'edit'
                  ? 'Edit Workflow'
                  : modalMode === 'load'
                  ? 'Load Workflow'
                  : 'Import Workflow from JSON'
                }
              </h3>

              {(modalMode === 'save' || modalMode === 'edit') ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Workflow Name *
                    </label>
                    <input
                      type="text"
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter workflow name..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={workflowDescription}
                      onChange={(e) => setWorkflowDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe this workflow..."
                    />
                  </div>
                  
                  {/* Reference Files Summary */}
                  {referenceFiles.length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                      <div className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Reference Files to be Saved ({referenceFiles.length})
                      </div>
                      <div className="space-y-2">
                        {referenceFiles.map(rf => (
                          <div key={rf.id} className="text-xs text-green-700 bg-white rounded p-2 border border-green-200">
                            <div className="font-medium">{rf.name}</div>
                            <div className="text-green-600">
                              {rf.headers.length} columns • {(rf.totalRows || rf.rows.length).toLocaleString()} records
                            </div>
                            <div className="text-green-600 mt-1">
                              Columns: {rf.headers.slice(0, 5).join(', ')}{rf.headers.length > 5 ? '...' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-800 mb-1">
                      {modalMode === 'edit' ? 'What will be updated:' : 'What will be saved:'}
                    </div>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• All rule conditions and logic</li>
                      <li>• Reference file names and structure</li>
                      <li>• Column names and sample values</li>
                      <li>• File metadata and statistics</li>
                      {referenceFiles.length > 0 && (
                        <li>• Sample data from reference files (for structure reference)</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : modalMode === 'import' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Import from File
                    </label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <div className="text-center text-gray-500">or</div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paste JSON Content
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="Paste your workflow JSON here..."
                    />
                  </div>
                  {importError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-red-800 text-sm font-medium">Import Error:</div>
                      <div className="text-red-700 text-sm mt-1">{importError}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {workflows.map((workflow) => {
                    const isCurrentWorkflow = currentWorkflow?.id === workflow.id;
                    const refFileCount = workflow.referenceFiles?.length || 0;
                    const hasRefData = workflow.referenceFiles?.some(rf => rf.rows && rf.rows.length > 0);
                    const hasRefStructure = workflow.referenceFiles?.some(rf => rf.headers && rf.headers.length > 0);
                    
                    return (
                      <div
                        key={workflow.id}
                        onClick={() => handleLoadWorkflow(workflow)}
                        className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                          isCurrentWorkflow
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className={`font-medium flex items-center gap-2 ${
                          isCurrentWorkflow ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {isCurrentWorkflow && (
                            <>
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Currently Loaded
                              </span>
                            </>
                          )}
                          {workflow.name}
                          {refFileCount > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                                {refFileCount} ref files
                              </span>
                              {hasRefData && (
                                <CheckCircle className="w-4 h-4 text-green-600" title="Reference data included" />
                              )}
                              {!hasRefData && hasRefStructure && (
                                <Info className="w-4 h-4 text-blue-600" title="Reference structure saved" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`text-sm ${
                          isCurrentWorkflow ? 'text-blue-700' : 'text-gray-500'
                        }`}>
                          {workflow.description || 'No description'}
                        </div>
                        <div className={`text-xs mt-1 ${
                          isCurrentWorkflow ? 'text-blue-600' : 'text-gray-400'
                        }`}>
                          Updated {workflow.updatedAt.toLocaleDateString()}
                          {refFileCount > 0 && (
                            <div className="mt-1 text-xs">
                              Reference files: {workflow.referenceFiles?.map(rf => rf.name).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={resetModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                {modalMode === 'save' && (
                  <button
                    onClick={handleSaveWorkflow}
                    disabled={!workflowName.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Save New Workflow
                  </button>
                )}
                {modalMode === 'edit' && (
                  <button
                    onClick={handleUpdateWorkflow}
                    disabled={!workflowName.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-lg hover:from-orange-700 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Update Workflow
                  </button>
                )}
                {modalMode === 'import' && (
                  <button
                    onClick={handleImportWorkflow}
                    disabled={!importText.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Import Workflow
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};