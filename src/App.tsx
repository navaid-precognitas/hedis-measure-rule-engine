import React, { useState, useCallback } from 'react';
import { Activity, Play, RotateCcw, Zap, Upload, Settings, BarChart3, CheckCircle, ArrowRight, Link } from 'lucide-react';
import { CSVUploader } from './components/CSVUploader';
import { ColumnSidebar } from './components/ColumnSidebar';
import { RuleBuilder } from './components/RuleBuilder';
import { WorkflowViewer } from './components/WorkflowViewer';
import { ResultsTable } from './components/ResultsTable';
import { WorkflowManager } from './components/WorkflowManager';
import { WorkflowChainManager } from './components/WorkflowChainManager';
import { ReferenceFileManager } from './components/ReferenceFileManager';
import { CSVData, RuleGroup, EvaluationResult, Workflow, ReferenceFile, ChainExecutionResult } from './types';
import { evaluateRules } from './utils/ruleEvaluator';

type TabType = 'data' | 'rules' | 'results' | 'chains';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('data');
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [rules, setRules] = useState<RuleGroup>({
    id: 'root',
    conditions: [],
    referenceConditions: [],
    groupConditions: [],
    logic: 'AND',
    groups: []
  });
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult | null>(null);
  const [chainResults, setChainResults] = useState<ChainExecutionResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);

  const handleDataLoaded = useCallback((data: CSVData) => {
    setCsvData(data);
    setSelectedColumn(null);
    setEvaluationResults(null);
    setChainResults(null);
    // Removed automatic tab switching - let user choose when to proceed
  }, []);

  const handleRulesChange = useCallback((newRules: RuleGroup) => {
    setRules(newRules);
    setEvaluationResults(null);
    setChainResults(null);
    // Clear current workflow when rules are manually changed
    setCurrentWorkflow(null);
  }, []);

  const handleReferenceFilesChange = useCallback((files: ReferenceFile[]) => {
    setReferenceFiles(files);
    setEvaluationResults(null);
    setChainResults(null);
  }, []);

  const handleEvaluateRules = useCallback(async () => {
    if (!csvData) return;

    setIsEvaluating(true);
    setEvaluationProgress(0);
    
    try {
      // Simulate progress for large files
      const progressInterval = setInterval(() => {
        setEvaluationProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Use allRows if available (for large files), otherwise use rows
      const dataToEvaluate = csvData.allRows || csvData.rows;
      
      const results = await evaluateRules(dataToEvaluate, rules, referenceFiles);
      
      clearInterval(progressInterval);
      setEvaluationProgress(100);
      setEvaluationResults(results);
      setChainResults(null); // Clear chain results when running single evaluation
      
      // Auto-advance to results tab when evaluation is complete
      setActiveTab('results');
      
      setTimeout(() => {
        setEvaluationProgress(0);
        setIsEvaluating(false);
      }, 500);
    } catch (error) {
      console.error('Error evaluating rules:', error);
      setIsEvaluating(false);
      setEvaluationProgress(0);
    }
  }, [csvData, rules, referenceFiles]);

  const handleLoadWorkflow = useCallback((workflow: Workflow) => {
    setRules(workflow.rules);
    setReferenceFiles(workflow.referenceFiles || []);
    setEvaluationResults(null);
    setChainResults(null);
    setCurrentWorkflow(workflow);
  }, []);

  const handleResetRules = useCallback(() => {
    setRules({
      id: 'root',
      conditions: [],
      referenceConditions: [],
      groupConditions: [],
      logic: 'AND',
      groups: []
    });
    setEvaluationResults(null);
    setChainResults(null);
    setCurrentWorkflow(null);
  }, []);

  const handleWorkflowSaved = useCallback((workflow: Workflow) => {
    setCurrentWorkflow(workflow);
  }, []);

  const handleChainExecuted = useCallback((result: ChainExecutionResult) => {
    setChainResults(result);
    setEvaluationResults(null); // Clear single evaluation results
    setActiveTab('results'); // Switch to results tab
  }, []);

  const hasRules = rules.conditions.length > 0 || (rules.referenceConditions?.length || 0) > 0 || (rules.groupConditions?.length || 0) > 0 || rules.groups.length > 0;

  const tabs = [
    {
      id: 'data' as TabType,
      name: 'Data & Files',
      icon: Upload,
      description: 'Upload CSV data and reference files',
      disabled: false,
      completed: !!csvData
    },
    {
      id: 'rules' as TabType,
      name: 'Rule Builder',
      icon: Settings,
      description: 'Create and manage evaluation rules',
      disabled: !csvData,
      completed: hasRules
    },
    {
      id: 'chains' as TabType,
      name: 'Workflow Chains',
      icon: Link,
      description: 'Sequential workflow processing',
      disabled: !csvData,
      completed: !!chainResults
    },
    {
      id: 'results' as TabType,
      name: 'Results & Testing',
      icon: BarChart3,
      description: 'Evaluate rules and view results',
      disabled: !csvData || (!hasRules && !chainResults),
      completed: !!(evaluationResults || chainResults)
    }
  ];

  const getTabContent = () => {
    switch (activeTab) {
      case 'data':
        return (
          <div className="space-y-8">
            {/* Progress Indicator */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Step 1: Load Your Data</h2>
                  <p className="text-gray-600">Upload your patient data CSV file and any reference files for cross-referencing.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${csvData ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                    {csvData ? <CheckCircle className="w-5 h-5" /> : '1'}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasRules ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {hasRules ? <CheckCircle className="w-5 h-5" /> : '2'}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${chainResults ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {chainResults ? <CheckCircle className="w-5 h-5" /> : '3'}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${evaluationResults || chainResults ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {evaluationResults || chainResults ? <CheckCircle className="w-5 h-5" /> : '4'}
                  </div>
                </div>
              </div>
            </div>

            {/* CSV Upload Section */}
            <CSVUploader 
              onDataLoaded={handleDataLoaded}
              currentData={csvData}
            />

            {/* Reference File Manager */}
            <ReferenceFileManager
              referenceFiles={referenceFiles}
              onReferenceFilesChange={handleReferenceFilesChange}
            />

            {csvData && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Data Successfully Loaded!</h3>
                  <p className="text-gray-600">
                    Your main data is ready. {referenceFiles.length > 0 ? `You have ${referenceFiles.length} reference file(s) loaded.` : 'You can add reference files above or proceed to rule building.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-3xl font-bold text-blue-700">{csvData.headers.length}</div>
                      <Upload className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="text-sm font-medium text-blue-800">Data Columns</div>
                    <div className="text-xs text-blue-600 mt-1">Available for rule building</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-3xl font-bold text-green-700">
                        {(csvData.totalRows || csvData.rows.length).toLocaleString()}
                      </div>
                      <BarChart3 className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="text-sm font-medium text-green-800">Total Records</div>
                    <div className="text-xs text-green-600 mt-1">Ready for evaluation</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-3xl font-bold text-purple-700">{referenceFiles.length}</div>
                      <Settings className="w-8 h-8 text-purple-500" />
                    </div>
                    <div className="text-sm font-medium text-purple-800">Reference Files</div>
                    <div className="text-xs text-purple-600 mt-1">For cross-referencing</div>
                  </div>
                </div>

                {/* Enhanced Call to Action */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Ready to Build Rules?</h4>
                    <p className="text-gray-600 mb-4">
                      {referenceFiles.length > 0 
                        ? `You have your main data and ${referenceFiles.length} reference file(s) loaded. You can add more reference files above or proceed to rule building.`
                        : 'You can add reference files above for advanced cross-referencing, or proceed directly to rule building with your main data.'
                      }
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      {referenceFiles.length === 0 && (
                        <div className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                          💡 Tip: Reference files enable powerful cross-referencing conditions
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <button
                    onClick={() => setActiveTab('rules')}
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Settings className="w-6 h-6 mr-3" />
                    Start Building Rules
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'rules':
        return (
          <div className="space-y-8">
            {/* Progress Indicator */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Step 2: Build Your Rules</h2>
                  <p className="text-gray-600">Create conditions and logic to filter your data according to HEDIS requirements.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasRules ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                    {hasRules ? <CheckCircle className="w-5 h-5" /> : '2'}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${chainResults ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {chainResults ? <CheckCircle className="w-5 h-5" /> : '3'}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${evaluationResults || chainResults ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {evaluationResults || chainResults ? <CheckCircle className="w-5 h-5" /> : '4'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Sidebar - Columns */}
              <div className="lg:col-span-1">
                <ColumnSidebar
                  columns={csvData?.headers || []}
                  onColumnSelect={setSelectedColumn}
                  selectedColumn={selectedColumn}
                />
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3 space-y-8">
                {/* Rule Builder */}
                <RuleBuilder
                  columns={csvData?.headers || []}
                  rules={rules}
                  referenceFiles={referenceFiles}
                  onRulesChange={handleRulesChange}
                />

                {/* Workflow Visualization */}
                <WorkflowViewer rules={rules} referenceFiles={referenceFiles} />

                {/* Workflow Management */}
                <WorkflowManager
                  currentRules={rules}
                  currentWorkflow={currentWorkflow}
                  referenceFiles={referenceFiles}
                  onLoadWorkflow={handleLoadWorkflow}
                  onRulesChange={handleRulesChange}
                  onWorkflowSaved={handleWorkflowSaved}
                />

                {hasRules && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg border border-green-200 p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Rules Ready for Testing!</h3>
                      <p className="text-gray-600 mb-6">
                        Your rules are configured and ready for evaluation against your {(csvData?.totalRows || csvData?.rows.length || 0).toLocaleString()} records.
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => setActiveTab('chains')}
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <Link className="w-5 h-5 mr-2" />
                          Create Workflow Chain
                        </button>
                        <span className="text-gray-400">or</span>
                        <button
                          onClick={() => setActiveTab('results')}
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <BarChart3 className="w-5 h-5 mr-2" />
                          Test Single Workflow
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'chains':
        return (
          <div className="space-y-8">
            {/* Progress Indicator */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Step 3: Create Workflow Chains</h2>
                  <p className="text-gray-600">Chain multiple workflows together for sequential data processing.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${chainResults ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                    {chainResults ? <CheckCircle className="w-5 h-5" /> : '3'}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${chainResults ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {chainResults ? <CheckCircle className="w-5 h-5" /> : '4'}
                  </div>
                </div>
              </div>
            </div>

            <WorkflowChainManager
              csvData={csvData}
              referenceFiles={referenceFiles}
              onChainExecuted={handleChainExecuted}
            />
          </div>
        );

      case 'results':
        return (
          <div className="space-y-8">
            {/* Progress Indicator */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Step 4: Evaluate & Analyze Results</h2>
                  <p className="text-gray-600">Run your rules against the data and analyze the results for insights.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${evaluationResults || chainResults ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                    {evaluationResults || chainResults ? <CheckCircle className="w-5 h-5" /> : '4'}
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluation Controls */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Rule Evaluation Center</h3>
                  <p className="text-gray-600">
                    Test your rules against <span className="font-semibold text-blue-600">{(csvData?.totalRows || csvData?.rows.length || 0).toLocaleString()}</span> records
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  {hasRules && (
                    <button
                      onClick={handleResetRules}
                      className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset Rules
                    </button>
                  )}
                  
                  <button
                    onClick={handleEvaluateRules}
                    disabled={!csvData || !hasRules || isEvaluating}
                    className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 relative overflow-hidden"
                  >
                    {isEvaluating && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 transition-all duration-300"
                        style={{ width: `${evaluationProgress}%` }}
                      />
                    )}
                    <div className="relative flex items-center">
                      <Play className="w-5 h-5 mr-3" />
                      {isEvaluating ? `Evaluating... ${evaluationProgress}%` : 'Run Single Evaluation'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Current Rules Summary */}
              {hasRules && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900">Active Rules Summary</h4>
                      <p className="text-sm text-blue-700">Current rule configuration ready for evaluation</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">{rules.conditions.length}</div>
                      <div className="text-sm font-medium text-blue-800">Standard Conditions</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="text-2xl font-bold text-purple-600">{rules.referenceConditions?.length || 0}</div>
                      <div className="text-sm font-medium text-purple-800">Reference Conditions</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="text-2xl font-bold text-orange-600">{rules.groupConditions?.length || 0}</div>
                      <div className="text-sm font-medium text-orange-800">Group Conditions</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="text-2xl font-bold text-indigo-600">{rules.groups.length}</div>
                      <div className="text-sm font-medium text-indigo-800">Rule Groups</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {evaluationResults ? (
              <ResultsTable
                results={evaluationResults}
                columns={csvData?.headers || []}
              />
            ) : chainResults ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <Link className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Workflow Chain Results</h3>
                    <p className="text-gray-600">Sequential processing completed successfully</p>
                  </div>
                </div>

                {/* Chain Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="text-3xl font-bold text-blue-700">{chainResults.finalResults.totalRows.toLocaleString()}</div>
                    <div className="text-sm font-medium text-blue-800">Input Records</div>
                    <div className="text-xs text-blue-600 mt-1">Starting dataset</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="text-3xl font-bold text-green-700">{chainResults.finalResults.matchedCount.toLocaleString()}</div>
                    <div className="text-sm font-medium text-green-800">Final Output</div>
                    <div className="text-xs text-green-600 mt-1">After all steps</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="text-3xl font-bold text-purple-700">{chainResults.finalResults.percentage.toFixed(1)}%</div>
                    <div className="text-sm font-medium text-purple-800">Retention Rate</div>
                    <div className="text-xs text-purple-600 mt-1">Overall efficiency</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                    <div className="text-3xl font-bold text-orange-700">{chainResults.steps.length}</div>
                    <div className="text-sm font-medium text-orange-800">Processing Steps</div>
                    <div className="text-xs text-orange-600 mt-1">Workflows executed</div>
                  </div>
                </div>

                {/* Step Results */}
                <div className="space-y-4 mb-8">
                  <h4 className="text-lg font-semibold text-gray-900">Step-by-Step Results</h4>
                  {chainResults.steps.map((step, index) => (
                    <div key={step.stepId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900">{step.workflowName}</h5>
                            <p className="text-sm text-gray-600">
                              {step.inputRecords.toLocaleString()} → {step.outputRecords.toLocaleString()} records
                              ({((step.outputRecords / step.inputRecords) * 100).toFixed(1)}% retention)
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {(step.executionTime / 1000).toFixed(2)}s
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${(step.outputRecords / step.inputRecords) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final Results Table */}
                <ResultsTable
                  results={chainResults.finalResults}
                  columns={csvData?.headers || []}
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Ready to See Results?
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Run a single evaluation or execute a workflow chain to analyze your data and discover insights.
                  </p>
                  {!hasRules && (
                    <button
                      onClick={() => setActiveTab('rules')}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Settings className="w-5 h-5 mr-2" />
                      Build Rules First
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  HEDIS Measure Platform
                  <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                    <Zap className="w-4 h-4" />
                    Enhanced
                  </div>
                </h1>
                <p className="text-sm text-gray-600">Advanced rule-based patient data analysis with group conditions</p>
              </div>
            </div>
            
            {currentWorkflow && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <div>
                  <div className="text-sm font-semibold text-blue-900">
                    Active Workflow
                  </div>
                  <div className="text-xs text-blue-700">
                    {currentWorkflow.name}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDisabled = tab.disabled;
              const isCompleted = tab.completed;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`group inline-flex items-center py-6 px-1 border-b-3 font-semibold text-sm transition-all duration-200 ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : isDisabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className={`mr-3 p-2 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-100' 
                      : isDisabled 
                      ? 'bg-gray-100' 
                      : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      isActive 
                        ? 'text-blue-600' 
                        : isDisabled 
                        ? 'text-gray-400' 
                        : 'text-gray-500 group-hover:text-gray-600'
                    }`} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      {tab.name}
                      {isCompleted && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <div className={`text-xs ${
                      isActive 
                        ? 'text-blue-500' 
                        : isDisabled 
                        ? 'text-gray-400' 
                        : 'text-gray-400'
                    }`}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {getTabContent()}
      </main>
    </div>
  );
}

export default App;