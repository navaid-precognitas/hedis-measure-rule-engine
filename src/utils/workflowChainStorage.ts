import { WorkflowChain, ChainExecutionResult, WorkflowChainStepResult, CSVData, ReferenceFile, EvaluationResult } from '../types';
import { getWorkflows } from './workflowStorage';
import { evaluateRules } from './ruleEvaluator';

const CHAIN_STORAGE_KEY = 'hedis_workflow_chains';

export const saveWorkflowChain = (chain: WorkflowChain): void => {
  const chains = getWorkflowChains();
  const existingIndex = chains.findIndex(c => c.id === chain.id);
  
  if (existingIndex >= 0) {
    chains[existingIndex] = chain;
  } else {
    chains.push(chain);
  }
  
  try {
    localStorage.setItem(CHAIN_STORAGE_KEY, JSON.stringify(chains));
  } catch (error) {
    console.error('Failed to save workflow chain:', error);
    throw new Error('Unable to save workflow chain: Storage quota exceeded');
  }
};

export const getWorkflowChains = (): WorkflowChain[] => {
  const stored = localStorage.getItem(CHAIN_STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const chains = JSON.parse(stored);
    return chains.map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      lastExecutedAt: c.lastExecutedAt ? new Date(c.lastExecutedAt) : undefined,
      workflows: c.workflows.map((w: any) => ({
        ...w,
        executedAt: w.executedAt ? new Date(w.executedAt) : undefined
      }))
    }));
  } catch {
    return [];
  }
};

export const deleteWorkflowChain = (id: string): void => {
  const chains = getWorkflowChains().filter(c => c.id !== id);
  localStorage.setItem(CHAIN_STORAGE_KEY, JSON.stringify(chains));
};

export const executeWorkflowChain = async (
  chain: WorkflowChain,
  initialData: CSVData,
  referenceFiles: ReferenceFile[],
  onProgress?: (progress: number) => void
): Promise<ChainExecutionResult> => {
  const startTime = Date.now();
  const workflows = getWorkflows();
  const stepResults: WorkflowChainStepResult[] = [];
  
  // Use allRows if available (for large files), otherwise use rows
  let currentData = initialData.allRows || initialData.rows;
  const isLazyLoader = currentData && typeof currentData.filter === 'function' && typeof currentData.length === 'number' && !Array.isArray(currentData);
  
  console.log(`Starting chain execution with ${isLazyLoader ? currentData.length.toLocaleString() : currentData.length.toLocaleString()} records`);
  
  for (let i = 0; i < chain.workflows.length; i++) {
    const step = chain.workflows[i];
    const stepStartTime = Date.now();
    
    // Update progress
    const progress = Math.round((i / chain.workflows.length) * 100);
    onProgress?.(progress);
    
    // Find the workflow
    const workflow = workflows.find(w => w.id === step.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${step.workflowName}`);
    }
    
    console.log(`Executing step ${i + 1}: ${workflow.name}`);
    
    // Get input record count
    const inputRecordCount = isLazyLoader ? currentData.length : currentData.length;
    
    // Execute the workflow on current data
    const stepResult = await evaluateRules(currentData, workflow.rules, referenceFiles);
    const stepEndTime = Date.now();
    
    console.log(`Step ${i + 1} complete: ${stepResult.matchedCount.toLocaleString()} matches from ${inputRecordCount.toLocaleString()} inputs`);
    
    // Store step result
    const stepResultData: WorkflowChainStepResult = {
      stepId: step.id,
      workflowId: workflow.id,
      workflowName: workflow.name,
      inputRecords: inputRecordCount,
      outputRecords: stepResult.matchedCount,
      executionTime: stepEndTime - stepStartTime,
      results: stepResult,
      startedAt: new Date(stepStartTime),
      completedAt: new Date(stepEndTime)
    };
    
    stepResults.push(stepResultData);
    
    // Update current data for next step (use matched rows as input)
    currentData = stepResult.matchedRows;
    
    // If no records remain, break the chain
    if (stepResult.matchedCount === 0) {
      console.warn(`Chain execution stopped at step ${i + 1}: No records remaining`);
      break;
    }
  }
  
  // Final progress update
  onProgress?.(100);
  
  const endTime = Date.now();
  
  // Create final results
  const finalInputCount = initialData.allRows?.length || initialData.rows.length;
  const finalOutputCount = Array.isArray(currentData) ? currentData.length : 0;
  
  const finalResults: EvaluationResult = {
    matchedRows: Array.isArray(currentData) ? currentData : [],
    totalRows: finalInputCount,
    matchedCount: finalOutputCount,
    percentage: finalInputCount > 0 ? (finalOutputCount / finalInputCount) * 100 : 0
  };
  
  console.log(`Chain execution complete: ${finalOutputCount.toLocaleString()} final results from ${finalInputCount.toLocaleString()} initial records`);
  
  return {
    chainId: chain.id,
    steps: stepResults,
    finalResults,
    totalExecutionTime: endTime - startTime,
    startedAt: new Date(startTime),
    completedAt: new Date(endTime)
  };
};

export const exportWorkflowChains = (): void => {
  const chains = getWorkflowChains();
  const dataStr = JSON.stringify(chains, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hedis_workflow_chains.json';
  link.click();
  URL.revokeObjectURL(url);
};

export const importWorkflowChain = (jsonString: string): WorkflowChain => {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate required fields
    if (!data.id || !data.name || !Array.isArray(data.workflows)) {
      throw new Error('Invalid workflow chain JSON: missing required fields');
    }
    
    // Convert date strings back to Date objects
    const chain: WorkflowChain = {
      id: data.id,
      name: data.name,
      description: data.description || '',
      workflows: data.workflows,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      lastExecutedAt: data.lastExecutedAt ? new Date(data.lastExecutedAt) : undefined,
      finalResults: data.finalResults
    };
    
    return chain;
  } catch (error) {
    throw new Error(`Failed to import workflow chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};