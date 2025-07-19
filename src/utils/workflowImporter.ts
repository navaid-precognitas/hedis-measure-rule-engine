import { Workflow, RuleGroup } from '../types';

export const importWorkflowFromJSON = (jsonString: string): Workflow => {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate required fields
    if (!data.id || !data.name || !data.rules) {
      throw new Error('Invalid workflow JSON: missing required fields');
    }
    
    // Convert date strings back to Date objects
    const workflow: Workflow = {
      id: data.id,
      name: data.name,
      description: data.description || '',
      rules: data.rules,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    };
    
    return workflow;
  } catch (error) {
    throw new Error(`Failed to import workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const exportWorkflowToJSON = (workflow: Workflow): string => {
  return JSON.stringify(workflow, null, 2);
};

export const validateRuleGroup = (ruleGroup: any): boolean => {
  if (!ruleGroup.id || !Array.isArray(ruleGroup.conditions) || !Array.isArray(ruleGroup.groups)) {
    return false;
  }
  
  // Validate conditions
  for (const condition of ruleGroup.conditions) {
    if (!condition.id || !condition.column || !condition.operator || condition.value === undefined) {
      return false;
    }
  }
  
  // Recursively validate nested groups
  for (const group of ruleGroup.groups) {
    if (!validateRuleGroup(group)) {
      return false;
    }
  }
  
  return true;
};