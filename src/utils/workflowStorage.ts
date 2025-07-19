import { Workflow } from '../types';

const STORAGE_KEY = 'hedis_workflows';

export const saveWorkflow = (workflow: Workflow): void => {
  const workflows = getWorkflows();
  const existingIndex = workflows.findIndex(w => w.id === workflow.id);
  
  // Save the complete workflow including all reference file details
  const completeWorkflow = {
    ...workflow,
    updatedAt: new Date(),
    // Preserve all reference file information including data
    referenceFiles: workflow.referenceFiles?.map(refFile => ({
      id: refFile.id,
      name: refFile.name,
      headers: refFile.headers,
      fileName: refFile.fileName,
      uploadedAt: refFile.uploadedAt,
      totalRows: refFile.totalRows,
      isLimited: refFile.isLimited,
      fileSize: refFile.fileSize,
      // Keep a sample of the data for reference (first 100 rows)
      rows: refFile.rows?.slice(0, 100) || [],
      // Store metadata about the full dataset
      sampleData: refFile.rows?.slice(0, 10) || [],
      columnSample: refFile.headers?.reduce((acc, header) => {
        const values = (refFile.allRows || refFile.rows || [])
          .slice(0, 50)
          .map(row => row[header])
          .filter(val => val && String(val).trim() !== '')
          .slice(0, 10);
        acc[header] = [...new Set(values)];
        return acc;
      }, {} as Record<string, any[]>)
    })) || []
  };
  
  if (existingIndex >= 0) {
    workflows[existingIndex] = completeWorkflow;
  } else {
    workflows.push(completeWorkflow);
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  } catch (error) {
    console.warn('Storage quota exceeded, attempting to save with reduced reference data');
    
    // If storage fails, try saving with minimal reference file data but keep structure
    const reducedWorkflow = {
      ...workflow,
      updatedAt: new Date(),
      referenceFiles: workflow.referenceFiles?.map(refFile => ({
        id: refFile.id,
        name: refFile.name,
        headers: refFile.headers,
        fileName: refFile.fileName,
        uploadedAt: refFile.uploadedAt,
        totalRows: refFile.totalRows,
        isLimited: refFile.isLimited,
        fileSize: refFile.fileSize,
        // Keep only essential structure info
        rows: [], // Empty but preserve structure
        sampleData: refFile.rows?.slice(0, 5) || [], // Just 5 sample rows
        columnSample: refFile.headers?.reduce((acc, header) => {
          const values = (refFile.allRows || refFile.rows || [])
            .slice(0, 10)
            .map(row => row[header])
            .filter(val => val && String(val).trim() !== '')
            .slice(0, 3);
          acc[header] = [...new Set(values)];
          return acc;
        }, {} as Record<string, any[]>)
      })) || []
    };
    
    const reducedWorkflows = [...workflows];
    if (existingIndex >= 0) {
      reducedWorkflows[existingIndex] = reducedWorkflow;
    } else {
      reducedWorkflows.push(reducedWorkflow);
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedWorkflows));
      console.warn('Saved workflow with reduced reference file data due to storage constraints');
    } catch (secondError) {
      console.error('Failed to save workflow even with reduced data:', secondError);
      
      // Final fallback - save only rules and reference file metadata
      const minimalWorkflow = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || '',
        createdAt: workflow.createdAt,
        updatedAt: new Date(),
        rules: workflow.rules,
        referenceFiles: workflow.referenceFiles?.map(refFile => ({
          id: refFile.id,
          name: refFile.name,
          headers: refFile.headers,
          fileName: refFile.fileName,
          uploadedAt: refFile.uploadedAt,
          totalRows: refFile.totalRows,
          isLimited: refFile.isLimited,
          fileSize: refFile.fileSize,
          rows: [], // Empty
          sampleData: [],
          columnSample: {}
        })) || []
      };
      
      const minimalWorkflows = [...workflows];
      if (existingIndex >= 0) {
        minimalWorkflows[existingIndex] = minimalWorkflow;
      } else {
        minimalWorkflows.push(minimalWorkflow);
      }
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalWorkflows));
        console.warn('Saved workflow with minimal reference file metadata only');
      } catch (finalError) {
        console.error('Unable to save workflow - storage completely full:', finalError);
        // Clear some old workflows if storage is completely full
        const recentWorkflows = minimalWorkflows.slice(-3); // Keep only last 3 workflows
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(recentWorkflows));
          console.warn('Saved only the 3 most recent workflows due to storage constraints');
        } catch (ultimateError) {
          console.error('Unable to save workflows - storage completely full:', ultimateError);
          throw new Error('Unable to save workflow: Storage quota exceeded and cleanup failed');
        }
      }
    }
  }
};

export const getWorkflows = (): Workflow[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const workflows = JSON.parse(stored);
    return workflows.map((w: any) => ({
      ...w,
      createdAt: new Date(w.createdAt),
      updatedAt: new Date(w.updatedAt),
      referenceFiles: w.referenceFiles?.map((refFile: any) => ({
        ...refFile,
        uploadedAt: new Date(refFile.uploadedAt),
        // Restore the reference file structure
        allRows: refFile.rows || [], // Use saved rows as allRows for compatibility
      })) || []
    }));
  } catch {
    return [];
  }
};

export const deleteWorkflow = (id: string): void => {
  const workflows = getWorkflows().filter(w => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
};

export const exportWorkflows = (): void => {
  const workflows = getWorkflows();
  const dataStr = JSON.stringify(workflows, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hedis_workflows_complete.json';
  link.click();
  URL.revokeObjectURL(url);
};