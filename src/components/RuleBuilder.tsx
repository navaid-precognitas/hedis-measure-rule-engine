import React, { useState, useRef } from 'react';
import { Plus, Trash2, Copy, ChevronDown, Filter, Move, Eye, EyeOff, Lightbulb, AlertCircle, X, Edit3, Check, Ban, Database, Users, RotateCcw, Save, Folder } from 'lucide-react';
import { RuleCondition, RuleGroup, ReferenceCondition, GroupCondition, ReferenceFile, OPERATORS } from '../types';
import { AIRuleBuilder } from './AIRuleBuilder';
import { ReferenceConditionBuilder } from './ReferenceConditionBuilder';
import { GroupConditionBuilder } from './GroupConditionBuilder';

interface RuleBuilderProps {
  columns: string[];
  rules: RuleGroup;
  referenceFiles: ReferenceFile[];
  onRulesChange: (rules: RuleGroup) => void;
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({ 
  columns, 
  rules, 
  referenceFiles,
  onRulesChange 
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [showPreview, setShowPreview] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{ type: 'condition' | 'group'; id: string; groupId: string } | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const dragOverRef = useRef<string | null>(null);

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const addCondition = (groupId: string, condition?: Partial<RuleCondition>) => {
    const newCondition: RuleCondition = {
      id: generateId(),
      column: condition?.column || selectedColumn || columns[0] || '',
      operator: condition?.operator || 'equals',
      value: condition?.value || '',
      value2: condition?.value2 || ''
    };

    updateGroup(groupId, (group) => ({
      ...group,
      conditions: [...group.conditions, newCondition]
    }));
  };

  const addReferenceCondition = (groupId: string) => {
    const newCondition: ReferenceCondition = {
      id: generateId(),
      type: 'reference_match',
      column: selectedColumn || columns[0] || '',
      referenceFileId: referenceFiles[0]?.id || '',
      referenceColumn: ''
    };

    updateGroup(groupId, (group) => ({
      ...group,
      referenceConditions: [...(group.referenceConditions || []), newCondition]
    }));
  };

  const addGroupCondition = (groupId: string) => {
    const newCondition: GroupCondition = {
      id: generateId(),
      type: 'grouped_condition',
      groupBy: columns.find(col => col.toLowerCase().includes('patient') || col.toLowerCase().includes('member') || col.toLowerCase().includes('id')) || columns[0] || '',
      targetColumn: columns[1] || columns[0] || '',
      aggregationType: 'distinct_count',
      operator: 'greater_equal',
      value: 2,
      action: 'keep_matching_groups'
    };

    updateGroup(groupId, (group) => ({
      ...group,
      groupConditions: [...(group.groupConditions || []), newCondition]
    }));
  };

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<RuleCondition>) => {
    updateGroup(groupId, (group) => ({
      ...group,
      conditions: group.conditions.map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      )
    }));
  };

  const updateReferenceCondition = (groupId: string, conditionId: string, updates: Partial<ReferenceCondition>) => {
    updateGroup(groupId, (group) => ({
      ...group,
      referenceConditions: (group.referenceConditions || []).map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      )
    }));
  };

  const updateGroupCondition = (groupId: string, conditionId: string, updates: Partial<GroupCondition>) => {
    updateGroup(groupId, (group) => ({
      ...group,
      groupConditions: (group.groupConditions || []).map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      )
    }));
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    updateGroup(groupId, (group) => ({
      ...group,
      conditions: group.conditions.filter(c => c.id !== conditionId)
    }));
  };

  const removeReferenceCondition = (groupId: string, conditionId: string) => {
    updateGroup(groupId, (group) => ({
      ...group,
      referenceConditions: (group.referenceConditions || []).filter(c => c.id !== conditionId)
    }));
  };

  const removeGroupCondition = (groupId: string, conditionId: string) => {
    updateGroup(groupId, (group) => ({
      ...group,
      groupConditions: (group.groupConditions || []).filter(c => c.id !== conditionId)
    }));
  };

  const updateGroup = (groupId: string, updater: (group: RuleGroup) => RuleGroup) => {
    const updateGroupRecursive = (group: RuleGroup): RuleGroup => {
      if (group.id === groupId) {
        return updater(group);
      }
      return {
        ...group,
        groups: group.groups.map(updateGroupRecursive)
      };
    };

    onRulesChange(updateGroupRecursive(rules));
  };

  const addGroup = (parentGroupId: string, negated: boolean = false) => {
    const newGroup: RuleGroup = {
      id: generateId(),
      conditions: [],
      referenceConditions: [],
      groupConditions: [],
      logic: 'AND',
      groups: [],
      negated: negated,
      name: negated ? 'Exclusion Group' : ''
    };

    updateGroup(parentGroupId, (group) => ({
      ...group,
      groups: [...group.groups, newGroup]
    }));
  };

  const removeGroup = (parentGroupId: string, groupId: string) => {
    updateGroup(parentGroupId, (group) => ({
      ...group,
      groups: group.groups.filter(g => g.id !== groupId)
    }));
  };

  const duplicateCondition = (groupId: string, condition: RuleCondition) => {
    addCondition(groupId, { ...condition, id: undefined });
  };

  const duplicateReferenceCondition = (groupId: string, condition: ReferenceCondition) => {
    const newCondition: ReferenceCondition = {
      ...condition,
      id: generateId()
    };

    updateGroup(groupId, (group) => ({
      ...group,
      referenceConditions: [...(group.referenceConditions || []), newCondition]
    }));
  };

  const duplicateGroupCondition = (groupId: string, condition: GroupCondition) => {
    const newCondition: GroupCondition = {
      ...condition,
      id: generateId()
    };

    updateGroup(groupId, (group) => ({
      ...group,
      groupConditions: [...(group.groupConditions || []), newCondition]
    }));
  };

  const handleClearAllRules = () => {
    if (showClearConfirm) {
      // Reset to empty rule group
      const emptyRules: RuleGroup = {
        id: 'root',
        conditions: [],
        referenceConditions: [],
        groupConditions: [],
        logic: 'AND',
        groups: []
      };
      onRulesChange(emptyRules);
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      // Auto-hide confirmation after 5 seconds
      setTimeout(() => setShowClearConfirm(false), 5000);
    }
  };

  const getOperatorLabel = (operator: string) => {
    const op = OPERATORS.find(o => o.value === operator);
    return op?.label || operator;
  };

  const getColumnType = (columnName: string) => {
    const name = columnName.toLowerCase();
    if (name.includes('age') || name.includes('bmi') || name.includes('number') || name.includes('count') || name.includes('gap')) return 'numeric';
    if (name.includes('date') || name.includes('time')) return 'date';
    return 'text';
  };

  const getSuggestedOperators = (columnType: string) => {
    switch (columnType) {
      case 'numeric':
        return OPERATORS.filter(op => ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between', 'not_between', 'is_empty', 'is_not_empty'].includes(op.value));
      case 'date':
        return OPERATORS.filter(op => ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between', 'not_between', 'is_empty', 'is_not_empty'].includes(op.value));
      default:
        return OPERATORS;
    }
  };

  const generateNaturalLanguage = (group: RuleGroup, level = 0): string => {
    const conditions = group.conditions.map(condition => {
      const operator = getOperatorLabel(condition.operator).toLowerCase();
      if (condition.operator === 'between' && condition.value2) {
        return `${condition.column} ${operator} "${condition.value}" and "${condition.value2}"`;
      }
      return `${condition.column} ${operator} "${condition.value}"`;
    });

    const referenceConditions = (group.referenceConditions || []).map(condition => {
      const refFile = referenceFiles.find(f => f.id === condition.referenceFileId);
      const refFileName = refFile?.name || 'Unknown File';
      const matchType = condition.type === 'reference_match' ? 'matches' : 'does not match';
      let description = `${condition.column} ${matchType} ${refFileName}.${condition.referenceColumn}`;
      
      if (condition.filterColumn && condition.filterValue) {
        description += ` (where ${condition.filterColumn} = "${condition.filterValue}")`;
      }
      
      return description;
    });

    const groupConditions = (group.groupConditions || []).map(condition => {
      const action = condition.action === 'keep_matching_groups' ? 'Keep' : 'Exclude';
      const aggregation = condition.aggregationType.replace('_', ' ');
      const operator = getOperatorLabel(condition.operator).toLowerCase();
      const withinText = condition.withinDistinct ? ` across different ${condition.withinDistinct}` : '';
      
      return `${action} ${condition.groupBy} groups where ${aggregation} of ${condition.targetColumn}${withinText} ${operator} ${condition.value}`;
    });

    const subGroups = group.groups.map(subGroup => {
      const subText = generateNaturalLanguage(subGroup, level + 1);
      return subGroup.name ? `${subGroup.name}: (${subText})` : `(${subText})`;
    });
    
    const allParts = [...conditions, ...referenceConditions, ...groupConditions, ...subGroups];
    
    if (allParts.length === 0) return '';
    if (allParts.length === 1) return allParts[0];
    
    const connector = group.logic === 'AND' ? ' AND ' : ' OR ';
    let result = allParts.join(connector);
    
    if (group.negated) {
      result = `NOT (${result})`;
    }
    
    return result;
  };

  const startEditingGroupName = (groupId: string, currentName: string) => {
    setEditingGroupName(groupId);
    setTempGroupName(currentName || '');
  };

  const saveGroupName = (groupId: string) => {
    updateGroup(groupId, (group) => ({
      ...group,
      name: tempGroupName.trim()
    }));
    setEditingGroupName(null);
    setTempGroupName('');
  };

  const cancelEditingGroupName = () => {
    setEditingGroupName(null);
    setTempGroupName('');
  };

  const handleAIRulesGenerated = (aiRules: RuleGroup) => {
    onRulesChange(aiRules);
  };

  const renderCondition = (condition: RuleCondition, groupId: string, index: number) => {
    const columnType = getColumnType(condition.column);
    const suggestedOperators = getSuggestedOperators(columnType);
    const needsSecondValue = condition.operator === 'between' || condition.operator === 'not_between';
    
    return (
      <div 
        key={condition.id} 
        className="group relative bg-blue-50 rounded-lg p-4 border border-blue-200 hover:border-blue-300 transition-colors"
        draggable
        onDragStart={(e) => handleDragStart(e, 'condition', condition.id, groupId)}
      >
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Move className="w-4 h-4 text-gray-400 cursor-move" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
            <select
              value={condition.column}
              onChange={(e) => updateCondition(groupId, condition.id, { column: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {columns.map(column => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Type: <span className="font-medium">{columnType}</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(groupId, condition.id, { operator: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {suggestedOperators.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
          
          <div className={needsSecondValue ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value{needsSecondValue ? 's' : ''}
            </label>
            <div className={needsSecondValue ? 'grid grid-cols-2 gap-2' : ''}>
              <input
                type={columnType === 'numeric' ? 'number' : columnType === 'date' ? 'date' : 'text'}
                value={condition.value}
                onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={needsSecondValue ? 'From...' : columnType === 'date' ? 'YYYY-MM-DD (ISO Format)' : 'Enter value...'}
              />
              {needsSecondValue && (
                <input
                  type={columnType === 'numeric' ? 'number' : columnType === 'date' ? 'date' : 'text'}
                  value={condition.value2 || ''}
                  onChange={(e) => updateCondition(groupId, condition.id, { value2: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={columnType === 'date' ? 'YYYY-MM-DD (ISO Format)' : 'To...'}
                />
              )}
            </div>
            {columnType === 'date' && (
              <div className="text-xs text-blue-600 mt-1 bg-blue-50 px-2 py-1 rounded">
                💡 Recommended: Use ISO format (YYYY-MM-DD) for best compatibility
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-blue-100">
          <button
            onClick={() => duplicateCondition(groupId, condition)}
            className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </button>
          
          <button
            onClick={() => removeCondition(groupId, condition.id)}
            className="flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remove
          </button>
        </div>
      </div>
    );
  };

  const renderLogicSelector = (group: RuleGroup) => {
    const totalConditions = group.conditions.length + (group.referenceConditions?.length || 0) + (group.groupConditions?.length || 0) + group.groups.length;
    if (totalConditions <= 1) return null;

    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`logic-${group.id}`}
                  value="AND"
                  checked={group.logic === 'AND'}
                  onChange={(e) => updateGroup(group.id, (g) => ({ ...g, logic: 'AND' }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium">AND (All must be true)</span>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`logic-${group.id}`}
                  value="OR"
                  checked={group.logic === 'OR'}
                  onChange={(e) => updateGroup(group.id, (g) => ({ ...g, logic: 'OR' }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium">OR (Any can be true)</span>
              </label>
            </div>
            
            <div className="border-l border-gray-300 pl-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={group.negated || false}
                  onChange={(e) => updateGroup(group.id, (g) => ({ ...g, negated: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-red-700">
                  <Ban className="w-4 h-4 inline mr-1" />
                  NOT (Reverse logic)
                </span>
              </label>
            </div>
          </div>
          
          {group.negated && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              This group will exclude records that match these conditions (AND NOT logic)
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleDragStart = (e: React.DragEvent, type: 'condition' | 'group', id: string, groupId: string) => {
    setDraggedItem({ type, id, groupId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverRef.current = targetGroupId;
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    setDraggedItem(null);
    dragOverRef.current = null;
  };

  const renderGroup = (group: RuleGroup, level = 0): React.ReactNode => (
    <div 
      key={group.id} 
      className={`space-y-4 ${level > 0 ? `ml-6 pl-4 border-l-2 rounded-r-lg py-4 ${
        group.negated 
          ? 'border-red-300 bg-red-50/30' 
          : 'border-purple-200 bg-purple-50/30'
      }` : ''}`}
      onDragOver={(e) => handleDragOver(e, group.id)}
      onDrop={(e) => handleDrop(e, group.id)}
    >
      {level > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-lg text-sm font-medium border ${
              group.negated 
                ? 'bg-red-100 text-red-800 border-red-200' 
                : 'bg-purple-100 text-purple-800 border-purple-200'
            }`}>
              {group.negated ? (
                <>
                  <Ban className="w-4 h-4 inline mr-1" />
                  AND NOT Group
                </>
              ) : (
                'Group'
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {editingGroupName === group.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempGroupName}
                    onChange={(e) => setTempGroupName(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="Group name..."
                    onKeyPress={(e) => e.key === 'Enter' && saveGroupName(group.id)}
                  />
                  <button
                    onClick={() => saveGroupName(group.id)}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditingGroupName}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditingGroupName(group.id, group.name || '')}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  <Edit3 className="w-3 h-3" />
                  {group.name || 'Add name'}
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={() => removeGroup('root', group.id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {group.conditions.map((condition, index) => renderCondition(condition, group.id, index))}
      
      {(group.referenceConditions || []).map((condition) => (
        <ReferenceConditionBuilder
          key={condition.id}
          condition={condition}
          referenceFiles={referenceFiles}
          columns={columns}
          onUpdate={(updates) => updateReferenceCondition(group.id, condition.id, updates)}
          onRemove={() => removeReferenceCondition(group.id, condition.id)}
          onDuplicate={() => duplicateReferenceCondition(group.id, condition)}
        />
      ))}

      {(group.groupConditions || []).map((condition) => (
        <GroupConditionBuilder
          key={condition.id}
          condition={condition}
          columns={columns}
          onUpdate={(updates) => updateGroupCondition(group.id, condition.id, updates)}
          onRemove={() => removeGroupCondition(group.id, condition.id)}
          onDuplicate={() => duplicateGroupCondition(group.id, condition)}
        />
      ))}
      
      {renderLogicSelector(group)}
      
      {group.groups.map(childGroup => renderGroup(childGroup, level + 1))}
      
      <div className="flex gap-3 pt-4 flex-wrap">
        <button
          onClick={() => addCondition(group.id)}
          disabled={columns.length === 0}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Condition
        </button>
        
        <button
          onClick={() => addReferenceCondition(group.id)}
          disabled={referenceFiles.length === 0}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Database className="w-4 h-4 mr-2" />
          Add Reference Condition
        </button>

        <button
          onClick={() => addGroupCondition(group.id)}
          disabled={columns.length === 0}
          className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Users className="w-4 h-4 mr-2" />
          Add Group Condition
        </button>
        
        <button
          onClick={() => addGroup(group.id, false)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Group
        </button>
        
        <button
          onClick={() => addGroup(group.id, true)}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Ban className="w-4 h-4 mr-2" />
          Add AND NOT Group
        </button>
      </div>
    </div>
  );

  const naturalLanguageText = generateNaturalLanguage(rules);
  const hasAnyConditions = rules.conditions.length > 0 || (rules.referenceConditions?.length || 0) > 0 || (rules.groupConditions?.length || 0) > 0 || rules.groups.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Rule Builder</h3>
          {referenceFiles.length > 0 && (
            <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full">
              {referenceFiles.length} reference files
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Clear All Rules Button */}
          {hasAnyConditions && (
            <button
              onClick={handleClearAllRules}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                showClearConfirm
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                  : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
              }`}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {showClearConfirm ? 'Click to Confirm Clear All' : 'Clear All Rules'}
            </button>
          )}

          <AIRuleBuilder 
            columns={columns}
            onRulesGenerated={handleAIRulesGenerated}
          />
          
          {naturalLanguageText && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          )}
        </div>
      </div>

      {/* Clear Confirmation Alert */}
      {showClearConfirm && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <div className="font-semibold text-red-800 mb-2">Clear All Rules?</div>
              <div className="text-red-700 text-sm mb-3">
                This will permanently delete all conditions, groups, and logic you've built. This action cannot be undone.
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClearAllRules}
                  className="flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Yes, Clear Everything
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Natural Language Preview */}
      {showPreview && naturalLanguageText && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <div className="font-semibold text-green-800 mb-2">Your Rules in Plain English:</div>
              <div className="text-green-700 font-medium leading-relaxed">
                {naturalLanguageText}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {columns.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Filter className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No data columns available</p>
          <p className="text-sm mt-1">Upload a CSV file to start building rules</p>
        </div>
      ) : (
        <div className="space-y-6">
          {!hasAnyConditions ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <Filter className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-600 mb-2">Ready to build rules?</p>
              <p className="text-sm text-gray-500 mb-6">Create conditions and groups manually or use AI to generate them</p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button
                  onClick={() => addCondition(rules.id)}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add First Condition
                </button>
                {referenceFiles.length > 0 && (
                  <button
                    onClick={() => addReferenceCondition(rules.id)}
                    className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Database className="w-5 h-5 mr-2" />
                    Add Reference Condition
                  </button>
                )}
                <button
                  onClick={() => addGroupCondition(rules.id)}
                  className="flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Add Group Condition
                </button>
                <span className="text-gray-400">or</span>
                <AIRuleBuilder 
                  columns={columns}
                  onRulesGenerated={handleAIRulesGenerated}
                />
              </div>
            </div>
          ) : (
            renderGroup(rules)
          )}
        </div>
      )}

      {/* Group Conditions Info */}
      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <div className="font-medium text-orange-800 mb-1">Group-Based Conditions</div>
            <div className="text-orange-700 text-sm">
              Create powerful multi-row analysis rules that evaluate patterns across groups of records. Perfect for patient-level filtering based on multiple diagnoses, medications, or visits.
            </div>
            <div className="mt-2 text-xs text-orange-600">
              <strong>Example:</strong> "Keep patients with at least 2 distinct diagnosis codes across different visit dates"
            </div>
          </div>
        </div>
      </div>

      {/* Reference Files Info */}
      {referenceFiles.length === 0 && (
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <div className="font-medium text-purple-800 mb-1">Enable Reference-Based Matching</div>
              <div className="text-purple-700 text-sm">
                Upload reference files to create powerful cross-referencing conditions. Perfect for validating medications against conditions, checking eligibility lists, and more.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};