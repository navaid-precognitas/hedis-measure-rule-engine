import React from 'react';
import { GitBranch, Filter, ArrowRight, Ban, Database, Users } from 'lucide-react';
import { RuleGroup, RuleCondition, ReferenceCondition, GroupCondition, ReferenceFile, OPERATORS, REFERENCE_OPERATORS, GROUP_AGGREGATION_TYPES } from '../types';

interface WorkflowViewerProps {
  rules: RuleGroup;
  referenceFiles?: ReferenceFile[];
}

export const WorkflowViewer: React.FC<WorkflowViewerProps> = ({ rules, referenceFiles = [] }) => {
  const getOperatorSymbol = (operator: string) => {
    const op = OPERATORS.find(o => o.value === operator);
    return op?.symbol || operator;
  };

  const getReferenceOperatorSymbol = (type: string) => {
    const op = REFERENCE_OPERATORS.find(o => o.value === type);
    return op?.symbol || type;
  };

  const getAggregationLabel = (type: string) => {
    const agg = GROUP_AGGREGATION_TYPES.find(a => a.value === type);
    return agg?.label || type;
  };

  const renderConditionNode = (condition: RuleCondition) => (
    <div key={condition.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 min-w-0">
      <div className="font-medium text-blue-900 text-sm truncate">
        {condition.column}
      </div>
      <div className="text-blue-700 text-xs mt-1">
        {getOperatorSymbol(condition.operator)} {condition.value}
        {condition.value2 && ` - ${condition.value2}`}
      </div>
    </div>
  );

  const renderReferenceConditionNode = (condition: ReferenceCondition) => {
    const refFile = referenceFiles.find(f => f.id === condition.referenceFileId);
    const refFileName = refFile?.name || 'Unknown File';
    
    return (
      <div key={condition.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <Database className="w-3 h-3 text-purple-600" />
          <div className="font-medium text-purple-900 text-sm truncate">
            {condition.column}
          </div>
        </div>
        <div className="text-purple-700 text-xs">
          {getReferenceOperatorSymbol(condition.type)} {refFileName}.{condition.referenceColumn}
        </div>
        {condition.filterColumn && condition.filterValue && (
          <div className="text-purple-600 text-xs mt-1">
            where {condition.filterColumn} = "{condition.filterValue}"
          </div>
        )}
      </div>
    );
  };

  const renderGroupConditionNode = (condition: GroupCondition) => {
    return (
      <div key={condition.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <Users className="w-3 h-3 text-orange-600" />
          <div className="font-medium text-orange-900 text-sm truncate">
            Group by {condition.groupBy}
          </div>
        </div>
        <div className="text-orange-700 text-xs">
          {getAggregationLabel(condition.aggregationType)} of {condition.targetColumn}
        </div>
        <div className="text-orange-600 text-xs mt-1">
          {getOperatorSymbol(condition.operator)} {condition.value}
          {condition.withinDistinct && ` (distinct ${condition.withinDistinct})`}
        </div>
        <div className="text-orange-800 text-xs mt-1 font-medium">
          {condition.action === 'keep_matching_groups' ? '✓ Keep' : '✗ Exclude'} matching groups
        </div>
      </div>
    );
  };

  const renderLogicConnector = (logic: string, isLast: boolean, negated?: boolean) => (
    <div className="flex items-center justify-center py-2">
      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
        negated
          ? 'bg-red-100 text-red-800 border border-red-200'
          : logic === 'AND' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-orange-100 text-orange-800'
      }`}>
        {negated && <Ban className="w-3 h-3" />}
        {negated ? 'AND NOT' : logic}
      </div>
      {!isLast && <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />}
    </div>
  );

  const renderGroup = (group: RuleGroup, level = 0): React.ReactNode => {
    const hasContent = group.conditions.length > 0 || (group.referenceConditions?.length || 0) > 0 || (group.groupConditions?.length || 0) > 0 || group.groups.length > 0;
    
    if (!hasContent) return null;

    const allConditions = [
      ...group.conditions.map(c => ({ type: 'condition' as const, data: c })),
      ...(group.referenceConditions || []).map(c => ({ type: 'reference' as const, data: c })),
      ...(group.groupConditions || []).map(c => ({ type: 'group' as const, data: c }))
    ];

    return (
      <div key={group.id} className={`space-y-3 ${level > 0 ? 'ml-6 pl-4 border-l-2 border-gray-200' : ''}`}>
        {level > 0 && (
          <div className={`text-xs font-medium px-2 py-1 rounded inline-flex items-center gap-1 ${
            group.negated
              ? 'text-red-700 bg-red-100 border border-red-200'
              : 'text-gray-600 bg-gray-100'
          }`}>
            {group.negated && <Ban className="w-3 h-3" />}
            {group.name || (group.negated ? 'AND NOT Group' : `Group (${group.logic})`)}
          </div>
        )}
        
        <div className="space-y-2">
          {allConditions.map((item, index) => (
            <div key={`${item.type}-${item.data.id}`} className="space-y-2">
              {item.type === 'condition' 
                ? renderConditionNode(item.data as RuleCondition)
                : item.type === 'reference'
                ? renderReferenceConditionNode(item.data as ReferenceCondition)
                : renderGroupConditionNode(item.data as GroupCondition)
              }
              {(index < allConditions.length - 1 || group.groups.length > 0) && 
                renderLogicConnector(group.logic, false, group.negated && level === 0)}
            </div>
          ))}
          
          {group.groups.map((childGroup, index) => (
            <div key={childGroup.id} className="space-y-2">
              {renderGroup(childGroup, level + 1)}
              {index < group.groups.length - 1 && 
                renderLogicConnector(group.logic, false)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasAnyRules = rules.conditions.length > 0 || (rules.referenceConditions?.length || 0) > 0 || (rules.groupConditions?.length || 0) > 0 || rules.groups.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Workflow Visualization</h3>
      </div>
      
      {!hasAnyRules ? (
        <div className="text-center py-12 text-gray-500">
          <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">No workflow to visualize</p>
          <p className="text-xs mt-1">Create some rules to see the workflow diagram</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Start
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
          
          {renderGroup(rules)}
          
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-200">
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Results
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
            <span>Standard conditions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-100 rounded-full flex items-center justify-center">
              <Database className="w-2 h-2 text-purple-600" />
            </div>
            <span>Reference file conditions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-100 rounded-full flex items-center justify-center">
              <Users className="w-2 h-2 text-orange-600" />
            </div>
            <span>Group-based conditions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 rounded-full"></div>
            <span>AND: All conditions must be true</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-100 rounded-full"></div>
            <span>OR: Any condition can be true</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 rounded-full flex items-center justify-center">
              <Ban className="w-2 h-2 text-red-600" />
            </div>
            <span>AND NOT: Exclude records matching these conditions</span>
          </div>
        </div>
      </div>
    </div>
  );
};