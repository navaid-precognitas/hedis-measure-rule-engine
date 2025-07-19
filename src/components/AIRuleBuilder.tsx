import React, { useState } from 'react';
import { Bot, Settings, Zap, AlertCircle, CheckCircle, Loader, Eye, EyeOff, Key, Globe, User } from 'lucide-react';
import { AIModel, AWSCredentials, AI_MODELS, RuleGroup } from '../types';
import { aiService } from '../services/aiService';

interface AIRuleBuilderProps {
  columns: string[];
  onRulesGenerated: (rules: RuleGroup) => void;
}

export const AIRuleBuilder: React.FC<AIRuleBuilderProps> = ({ columns, onRulesGenerated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  const [credentials, setCredentials] = useState<AWSCredentials>({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    sessionToken: ''
  });
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState(false);

  const handleTestConnection = async () => {
    if (!credentials.accessKeyId || !credentials.secretAccessKey || !credentials.region) {
      setError('Please fill in all required AWS credentials');
      return;
    }

    setIsTestingConnection(true);
    setError('');
    
    try {
      const success = await aiService.testConnection(credentials);
      setConnectionStatus(success ? 'success' : 'error');
      if (success) {
        setSavedCredentials(true);
        localStorage.setItem('aws_credentials', JSON.stringify(credentials));
      } else {
        setError('Failed to connect to AWS Bedrock. Please check your credentials and permissions.');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleGenerateRules = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description of the rules you want to create');
      return;
    }

    if (!savedCredentials) {
      setError('Please test and save your AWS credentials first');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const rules = await aiService.generateRules({
        prompt: prompt.trim(),
        columns,
        model: selectedModel,
        credentials
      });

      onRulesGenerated(rules);
      setIsOpen(false);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate rules');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadSavedCredentials = () => {
    const saved = localStorage.getItem('aws_credentials');
    if (saved) {
      try {
        const parsedCredentials = JSON.parse(saved);
        setCredentials(parsedCredentials);
        setSavedCredentials(true);
        setConnectionStatus('success');
      } catch (error) {
        console.error('Failed to load saved credentials');
      }
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadSavedCredentials();
    }
  }, [isOpen]);

  const examplePrompts = [
    "Create HEDIS denominator rules for depression screening: members 12+ years old, active enrollment, no prior depression/bipolar diagnosis, not deceased or in hospice",
    "Build rules for diabetes patients: age 18-75, HbA1c test in last year, active enrollment, exclude pregnancy",
    "Generate eligibility criteria: continuous enrollment for 12 months, age 65+, Medicare Advantage plan",
    "Create exclusion rules: deceased members, hospice care, or disenrollment during measurement period"
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={columns.length === 0}
        className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
      >
        <Bot className="w-4 h-4 mr-2" />
        Build Rules with AI
        <Zap className="w-4 h-4 ml-2" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                <Bot className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">AI Rule Builder</h3>
                <p className="text-sm text-gray-600">Generate complex rules using natural language</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* AWS Credentials Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">AWS Credentials</h4>
                {connectionStatus === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                {showCredentials ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {showCredentials ? 'Hide' : 'Show'}
              </button>
            </div>

            {showCredentials && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Access Key ID *
                  </label>
                  <input
                    type="text"
                    value={credentials.accessKeyId}
                    onChange={(e) => setCredentials(prev => ({ ...prev, accessKeyId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="AKIA..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Key className="w-4 h-4 inline mr-1" />
                    Secret Access Key *
                  </label>
                  <input
                    type="password"
                    value={credentials.secretAccessKey}
                    onChange={(e) => setCredentials(prev => ({ ...prev, secretAccessKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter secret key..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Region *
                  </label>
                  <select
                    value={credentials.region}
                    onChange={(e) => setCredentials(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="eu-west-1">Europe (Ireland)</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                    <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={credentials.sessionToken}
                    onChange={(e) => setCredentials(prev => ({ ...prev, sessionToken: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="For temporary credentials..."
                  />
                </div>
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={handleTestConnection}
                disabled={isTestingConnection || !credentials.accessKeyId || !credentials.secretAccessKey}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isTestingConnection ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Bot className="w-4 h-4 inline mr-1" />
              Select AI Model
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AI_MODELS.map((model) => (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedModel.id === model.id
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">{model.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{model.description}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Max tokens: {model.maxTokens.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe the rules you want to create
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Example: Create HEDIS denominator rules for depression screening with age 12+, active enrollment, and exclusions for prior diagnosis..."
            />
          </div>

          {/* Example Prompts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Example Prompts (click to use)
            </label>
            <div className="space-y-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setPrompt(example)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Available Columns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Columns ({columns.length})
            </label>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {columns.map((column) => (
                  <span
                    key={column}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                  >
                    {column}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <div className="font-medium text-red-800">Error</div>
                  <div className="text-red-700 text-sm mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateRules}
              disabled={isGenerating || !prompt.trim() || !savedCredentials}
              className="flex items-center px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating Rules...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Rules
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};