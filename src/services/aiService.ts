import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AIRuleRequest, RuleGroup, AWSCredentials } from '../types';

export class AIService {
  private client: BedrockRuntimeClient | null = null;

  private initializeClient(credentials: AWSCredentials) {
    this.client = new BedrockRuntimeClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
      }
    });
  }

  private generateSystemPrompt(columns: string[]): string {
    return `You are an expert in building complex rule-based filters for healthcare data analysis, particularly HEDIS measures. Your task is to convert natural language requirements into structured JSON rule definitions.

Available columns in the dataset: ${columns.join(', ')}

You must respond with ONLY a valid JSON object representing a RuleGroup with this exact structure:
{
  "id": "root",
  "conditions": [
    {
      "id": "unique-condition-id",
      "column": "column_name",
      "operator": "operator_type",
      "value": "value",
      "value2": "optional_second_value_for_between_operations"
    }
  ],
  "referenceConditions": [],
  "logic": "AND",
  "groups": [],
  "negated": false,
  "name": "root"
}

Available operators:
- equals, not_equals
- greater_than, less_than, greater_equal, less_equal
- between, not_between (requires both value and value2)
- contains, not_contains, starts_with, ends_with
- is_empty, is_not_empty

Rules for building:
1. Use descriptive IDs for conditions (e.g., "age-eligibility", "enrollment-active")
2. For date comparisons, use YYYY-MM-DD format
3. Use nested groups for complex logic (AND/OR combinations)
4. Use negated: true for NOT logic on groups
5. For exclusion criteria, create a separate group with negated: true
6. Always validate that column names exist in the available columns
7. Always include "referenceConditions": [] in the response
8. Always include "groups": [] in the response
9. Always include "negated": false unless specifically needed
10. Always include "name": "root" for the main group

Focus on creating accurate, efficient rules that match the healthcare/HEDIS requirements described.

CRITICAL: Respond with ONLY the JSON object, no explanatory text, no markdown formatting, no code blocks.`;
  }

  private formatPrompt(userPrompt: string, columns: string[]): string {
    return `${this.generateSystemPrompt(columns)}

User Request: ${userPrompt}

Respond with only the JSON rule structure, no additional text or explanation.`;
  }

  private formatLlamaPrompt(userPrompt: string, columns: string[]): string {
    const systemPrompt = this.generateSystemPrompt(columns);
    
    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>
${userPrompt}

Respond with only the JSON rule structure, no additional text or explanation.<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;
  }

  private async invokeClaudeModel(modelId: string, prompt: string, maxTokens: number): Promise<string> {
    if (!this.client) {
      throw new Error('AWS client not initialized');
    }

    const body = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      top_p: 0.9
    };

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body)
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  }

  private async invokeTitanModel(modelId: string, prompt: string, maxTokens: number): Promise<string> {
    if (!this.client) {
      throw new Error('AWS client not initialized');
    }

    const body = {
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: maxTokens,
        temperature: 0.1,
        topP: 0.9,
        stopSequences: []
      }
    };

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body)
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.results[0].outputText;
  }

  private async invokeLlamaModel(modelId: string, userPrompt: string, columns: string[], maxTokens: number): Promise<string> {
    if (!this.client) {
      throw new Error('AWS client not initialized');
    }

    // Format the prompt using Llama 3's instruction format
    const formattedPrompt = this.formatLlamaPrompt(userPrompt, columns);

    const body = {
      prompt: formattedPrompt,
      max_gen_len: maxTokens,
      temperature: 0.1,
      top_p: 0.9
    };

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body)
    });

    try {
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return responseBody.generation;
    } catch (error) {
      console.error('Llama model invocation error:', error);
      throw new Error(`Failed to invoke Llama model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractJSON(text: string): string | null {
    // Remove any leading/trailing whitespace
    const cleanText = text.trim();
    
    // Try to find JSON in various formats
    const patterns = [
      // Direct JSON object
      /^(\{[\s\S]*\})$/,
      // JSON in code blocks
      /```(?:json)?\s*(\{[\s\S]*?\})\s*```/,
      // JSON with surrounding text
      /(\{[\s\S]*?\})/,
      // Multiple JSON objects - take the first complete one
      /(\{(?:[^{}]|{[^{}]*})*\})/
    ];

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        try {
          // Validate that it's proper JSON
          JSON.parse(match[1]);
          return match[1];
        } catch (e) {
          continue;
        }
      }
    }

    // If no pattern matches, try to find the first { and last }
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = cleanText.substring(firstBrace, lastBrace + 1);
      try {
        JSON.parse(jsonCandidate);
        return jsonCandidate;
      } catch (e) {
        // Not valid JSON
      }
    }

    return null;
  }

  async generateRules(request: AIRuleRequest): Promise<RuleGroup> {
    try {
      this.initializeClient(request.credentials);
      
      let responseText: string;

      // Route to appropriate model handler
      if (request.model.modelId.includes('anthropic.claude')) {
        const prompt = this.formatPrompt(request.prompt, request.columns);
        responseText = await this.invokeClaudeModel(request.model.modelId, prompt, request.model.maxTokens);
      } else if (request.model.modelId.includes('amazon.titan')) {
        const prompt = this.formatPrompt(request.prompt, request.columns);
        responseText = await this.invokeTitanModel(request.model.modelId, prompt, request.model.maxTokens);
      } else if (request.model.modelId.includes('meta.llama')) {
        // For Llama, we pass the user prompt and columns separately
        responseText = await this.invokeLlamaModel(request.model.modelId, request.prompt, request.columns, request.model.maxTokens);
      } else {
        throw new Error(`Unsupported model: ${request.model.modelId}`);
      }

      console.log('Raw AI Response:', responseText);

      // Extract JSON from the response
      const jsonString = this.extractJSON(responseText);
      
      if (!jsonString) {
        throw new Error('No valid JSON found in AI response');
      }

      console.log('Extracted JSON:', jsonString);

      const ruleGroup = JSON.parse(jsonString);

      // Validate the structure
      if (!this.validateRuleGroup(ruleGroup)) {
        throw new Error('AI generated invalid rule structure');
      }

      // Ensure all required fields are present
      const completeRuleGroup = this.ensureCompleteStructure(ruleGroup);
      
      console.log('Final Rule Group:', completeRuleGroup);
      
      return completeRuleGroup;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error(`Failed to generate rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private ensureCompleteStructure(ruleGroup: any): RuleGroup {
    // Ensure all required fields exist with proper defaults
    const complete = {
      id: ruleGroup.id || 'root',
      conditions: Array.isArray(ruleGroup.conditions) ? ruleGroup.conditions : [],
      referenceConditions: Array.isArray(ruleGroup.referenceConditions) ? ruleGroup.referenceConditions : [],
      logic: (ruleGroup.logic === 'AND' || ruleGroup.logic === 'OR') ? ruleGroup.logic : 'AND',
      groups: Array.isArray(ruleGroup.groups) ? ruleGroup.groups.map(g => this.ensureCompleteStructure(g)) : [],
      negated: Boolean(ruleGroup.negated),
      name: ruleGroup.name || undefined
    };

    return complete;
  }

  private validateRuleGroup(ruleGroup: any): boolean {
    if (!ruleGroup || typeof ruleGroup !== 'object') {
      console.error('Rule group is not an object:', ruleGroup);
      return false;
    }
    
    if (!ruleGroup.id) {
      console.error('Rule group missing id:', ruleGroup);
      return false;
    }
    
    if (!Array.isArray(ruleGroup.conditions)) {
      console.error('Rule group conditions is not an array:', ruleGroup.conditions);
      return false;
    }
    
    if (!['AND', 'OR'].includes(ruleGroup.logic)) {
      console.error('Rule group has invalid logic:', ruleGroup.logic);
      return false;
    }

    // Validate conditions
    for (const condition of ruleGroup.conditions) {
      if (!condition.id || !condition.column || !condition.operator || condition.value === undefined) {
        console.error('Invalid condition:', condition);
        return false;
      }
    }

    // Validate reference conditions if they exist
    if (ruleGroup.referenceConditions && Array.isArray(ruleGroup.referenceConditions)) {
      for (const refCondition of ruleGroup.referenceConditions) {
        if (!refCondition.id || !refCondition.column || !refCondition.type) {
          console.error('Invalid reference condition:', refCondition);
          return false;
        }
      }
    }

    // Recursively validate nested groups
    if (ruleGroup.groups && Array.isArray(ruleGroup.groups)) {
      for (const group of ruleGroup.groups) {
        if (!this.validateRuleGroup(group)) {
          return false;
        }
      }
    }

    return true;
  }

  async testConnection(credentials: AWSCredentials): Promise<boolean> {
    try {
      this.initializeClient(credentials);
      
      // Test with a simple Claude model call first (most reliable)
      const testPrompt = 'Respond with just the word "success"';
      const body = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 10,
        messages: [{ role: "user", content: testPrompt }]
      };

      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body)
      });

      await this.client!.send(command);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      
      // If Claude fails, try Llama as fallback
      try {
        const llamaBody = {
          prompt: '<|begin_of_text|><|start_header_id|>user<|end_header_id|>\nRespond with just the word "success"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n',
          max_gen_len: 10,
          temperature: 0.1,
          top_p: 0.9
        };

        const llamaCommand = new InvokeModelCommand({
          modelId: 'meta.llama3-70b-instruct-v1:0',
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(llamaBody)
        });

        await this.client!.send(llamaCommand);
        return true;
      } catch (llamaError) {
        console.error('Llama connection test also failed:', llamaError);
        return false;
      }
    }
  }
}

export const aiService = new AIService();