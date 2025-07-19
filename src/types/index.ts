export interface CSVData {
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
  totalRows?: number;
  isLimited?: boolean;
  allRows?: Record<string, any>[]; // Keep all data for evaluation and filtering
}

export interface ReferenceFile {
  id: string;
  name: string;
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
  uploadedAt: Date;
  totalRows?: number;
  isLimited?: boolean;
  fileSize?: number;
  allRows?: Record<string, any>[]; // Keep all data for filtering and matching
}

export interface ReferenceCondition {
  id: string;
  type: 'reference_match' | 'reference_not_match';
  column: string; // Column in main data
  referenceFileId: string;
  referenceColumn: string; // Column in reference file to match against
  filterColumn?: string; // Optional: Column in reference file to filter by
  filterValue?: string; // Optional: Value to filter reference file by
  description?: string;
}

export interface GroupCondition {
  id: string;
  type: 'grouped_condition';
  groupBy: string; // Column to group by (e.g., patient_id)
  targetColumn: string; // Column to evaluate (e.g., Code)
  aggregationType: 'distinct_count' | 'count' | 'sum' | 'avg' | 'min' | 'max';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal';
  value: number; // Threshold value
  withinDistinct?: string; // Optional: Column that must be distinct (e.g., diagnosis_date)
  action: 'keep_matching_groups' | 'exclude_matching_groups';
  description?: string;
}

export interface RuleCondition {
  id: string;
  column: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | 'between' | 'not_between';
  value: string;
  value2?: string; // For between operations
}

export interface RuleGroup {
  id: string;
  conditions: RuleCondition[];
  referenceConditions: ReferenceCondition[];
  groupConditions: GroupCondition[];
  logic: 'AND' | 'OR';
  groups: RuleGroup[];
  negated?: boolean; // For NOT logic
  name?: string; // Optional name for the group
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  rules: RuleGroup;
  referenceFiles: ReferenceFile[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowChain {
  id: string;
  name: string;
  description: string;
  workflows: WorkflowChainStep[];
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  finalResults?: EvaluationResult;
}

export interface WorkflowChainStep {
  id: string;
  workflowId: string;
  workflowName: string;
  order: number;
  description?: string;
  results?: EvaluationResult;
  executedAt?: Date;
  inputRecords?: number;
  outputRecords?: number;
}

export interface ChainExecutionResult {
  chainId: string;
  steps: WorkflowChainStepResult[];
  finalResults: EvaluationResult;
  totalExecutionTime: number;
  startedAt: Date;
  completedAt: Date;
}

export interface WorkflowChainStepResult {
  stepId: string;
  workflowId: string;
  workflowName: string;
  inputRecords: number;
  outputRecords: number;
  executionTime: number;
  results: EvaluationResult;
  startedAt: Date;
  completedAt: Date;
}

export interface EvaluationResult {
  matchedRows: Record<string, any>[];
  totalRows: number;
  matchedCount: number;
  percentage: number;
  groupStats?: {
    totalGroups: number;
    matchedGroups: number;
    groupPercentage: number;
  };
}

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'bedrock';
  modelId: string;
  description: string;
  maxTokens: number;
}

export interface AIRuleRequest {
  prompt: string;
  columns: string[];
  model: AIModel;
  credentials: AWSCredentials;
}

export const OPERATORS = [
  { value: 'equals', label: 'Equals (=)', symbol: '=', description: 'Exact match' },
  { value: 'not_equals', label: 'Not Equals (≠)', symbol: '≠', description: 'Does not match' },
  { value: 'greater_than', label: 'Greater Than (>)', symbol: '>', description: 'Larger than value' },
  { value: 'less_than', label: 'Less Than (<)', symbol: '<', description: 'Smaller than value' },
  { value: 'greater_equal', label: 'Greater or Equal (≥)', symbol: '≥', description: 'Larger than or equal to value' },
  { value: 'less_equal', label: 'Less or Equal (≤)', symbol: '≤', description: 'Smaller than or equal to value' },
  { value: 'between', label: 'Between', symbol: '↔', description: 'Value is between two numbers/dates' },
  { value: 'not_between', label: 'Not Between', symbol: '↮', description: 'Value is not between two numbers/dates' },
  { value: 'contains', label: 'Contains', symbol: '∋', description: 'Text contains the value' },
  { value: 'not_contains', label: 'Does Not Contain', symbol: '∌', description: 'Text does not contain the value' },
  { value: 'starts_with', label: 'Starts With', symbol: '⌐', description: 'Text begins with the value' },
  { value: 'ends_with', label: 'Ends With', symbol: '¬', description: 'Text ends with the value' },
  { value: 'is_empty', label: 'Is Empty', symbol: '∅', description: 'Field has no value' },
  { value: 'is_not_empty', label: 'Is Not Empty', symbol: '≠∅', description: 'Field has a value' },
] as const;

export const REFERENCE_OPERATORS = [
  { 
    value: 'reference_match', 
    label: 'Matches Reference File', 
    symbol: '∈', 
    description: 'Value exists in reference file' 
  },
  { 
    value: 'reference_not_match', 
    label: 'Does Not Match Reference File', 
    symbol: '∉', 
    description: 'Value does not exist in reference file' 
  },
] as const;

export const GROUP_AGGREGATION_TYPES = [
  { value: 'distinct_count', label: 'Count of Distinct Values', description: 'Number of unique values in the target column' },
  { value: 'count', label: 'Count of Records', description: 'Total number of records in the group' },
  { value: 'sum', label: 'Sum', description: 'Sum of numeric values in the target column' },
  { value: 'avg', label: 'Average', description: 'Average of numeric values in the target column' },
  { value: 'min', label: 'Minimum', description: 'Minimum value in the target column' },
  { value: 'max', label: 'Maximum', description: 'Maximum value in the target column' },
] as const;

export const AI_MODELS: AIModel[] = [
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'bedrock',
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    description: 'Most capable model for complex reasoning and rule building',
    maxTokens: 8192
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'bedrock',
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    description: 'Fast and efficient for simple rule generation',
    maxTokens: 4096
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'bedrock',
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    description: 'Balanced performance for most rule building tasks',
    maxTokens: 4096
  },
  {
    id: 'llama3-70b',
    name: 'Llama 3 70B Instruct',
    provider: 'bedrock',
    modelId: 'meta.llama3-70b-instruct-v1:0',
    description: 'Meta\'s powerful open-source model with enhanced instruction following',
    maxTokens: 2048
  },
  {
    id: 'llama3-8b',
    name: 'Llama 3 8B Instruct',
    provider: 'bedrock',
    modelId: 'meta.llama3-8b-instruct-v1:0',
    description: 'Faster Llama 3 model for quick rule generation',
    maxTokens: 2048
  },
  {
    id: 'titan-text-premier',
    name: 'Amazon Titan Text Premier',
    provider: 'bedrock',
    modelId: 'amazon.titan-text-premier-v1:0',
    description: 'Amazon\'s flagship text model',
    maxTokens: 4096
  }
];