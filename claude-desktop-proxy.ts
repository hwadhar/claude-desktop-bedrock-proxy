#!/usr/bin/env tsx

import express from 'express';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import { fromIni } from '@aws-sdk/credential-providers';
import cors from 'cors';

const app = express();
const PORT = 7847;

// Configure AWS Bedrock clients with your existing profile
const credentials = fromIni({ profile: 'ai-agent' });
const region = 'us-west-2';

const bedrock = new BedrockRuntimeClient({
  region,
  credentials,
});

const bedrockClient = new BedrockClient({
  region,
  credentials,
});

// Fallback model mapping (used if API fails)
const FALLBACK_MODEL_MAP = {
  'claude-3-5-sonnet-20241022': 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
  'claude-3-5-haiku-20241022': 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  'claude-3-opus-20240229': 'us.anthropic.claude-3-opus-20240229-v1:0',
  'claude-opus-4-5-20251101': 'us.anthropic.claude-3-opus-20240229-v1:0', // Map to available Opus
  'sonnet-4': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'claude-sonnet-4': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'claude-sonnet-4-5-20250929': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'sonnet-4.5': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'claude-3.7': 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
} as const;

// Default fallback model if requested model is not found
const DEFAULT_MODEL = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

// Dynamic model mapping (populated at startup)
let MODEL_MAP: Record<string, string> = {};

/**
 * Fetch available Anthropic models from Bedrock API
 */
async function fetchAvailableModels(): Promise<Record<string, string>> {
  try {
    console.log('🔍 Fetching available models from Bedrock API...');

    const command = new ListFoundationModelsCommand({
      byProvider: 'Anthropic',
      byOutputModality: 'TEXT'
    });

    const response = await bedrockClient.send(command);
    const models = response.modelSummaries || [];

    console.log(`📋 Found ${models.length} Anthropic models in Bedrock`);

    // Build dynamic mapping
    const dynamicMap: Record<string, string> = {};

    models.forEach(model => {
      if (!model.modelId || !model.modelName) return;

      // Skip deprecated models
      if (model.modelLifecycle === 'LEGACY' || model.modelLifecycle === 'DEPRECATED') {
        console.log(`⚠️  Skipping deprecated model: ${model.modelName} (${model.modelLifecycle})`);
        return;
      }

      const modelId = model.modelId;
      const modelName = model.modelName.toLowerCase();

      // Create various name mappings for the same model
      dynamicMap[modelId] = modelId; // Direct ID mapping
      dynamicMap[modelName] = modelId; // Name mapping

      // Create common aliases
      if (modelName.includes('claude-3-5-sonnet')) {
        dynamicMap['claude-3-5-sonnet-20241022'] = modelId;
        dynamicMap['sonnet-3.5'] = modelId;
      } else if (modelName.includes('claude-3-5-haiku')) {
        dynamicMap['claude-3-5-haiku-20241022'] = modelId;
        dynamicMap['haiku-3.5'] = modelId;
      } else if (modelName.includes('claude-3-opus')) {
        dynamicMap['claude-3-opus-20240229'] = modelId;
        dynamicMap['opus-3'] = modelId;
      } else if (modelName.includes('sonnet-4')) {
        dynamicMap['sonnet-4'] = modelId;
        dynamicMap['claude-sonnet-4'] = modelId;
        dynamicMap['claude-sonnet-4-5-20250929'] = modelId; // Common Desktop request
        dynamicMap['sonnet-4.5'] = modelId;
      }

      // Generic aliases
      if (modelName.includes('claude-3.7')) {
        dynamicMap['claude-3.7'] = modelId;
      }
    });

    console.log(`✅ Built dynamic model mapping with ${Object.keys(dynamicMap).length} aliases`);
    console.log('📝 Available model aliases:', Object.keys(dynamicMap).slice(0, 10).join(', '), '...');

    return dynamicMap;

  } catch (error) {
    console.error('❌ Failed to fetch models from Bedrock API:', error);
    console.log('🔄 Falling back to hardcoded model mapping');
    return { ...FALLBACK_MODEL_MAP };
  }
}

/**
 * Initialize model mapping at startup
 */
async function initializeModels() {
  console.log('🚀 Initializing model mapping...');
  MODEL_MAP = await fetchAvailableModels();
  console.log('✅ Model mapping initialized');
}

// Middleware
app.use(cors({
  origin: ['https://claude.ai', 'http://localhost:*'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Anthropic API format → Bedrock format translation
function translateRequestToBedrock(anthropicRequest: any): any {
  const { model, messages, system, max_tokens = 4096, temperature = 0.7, tools, tool_choice, stream } = anthropicRequest;

  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens,
    temperature,
    messages,
    system,
    tools,
    tool_choice,
  };
}

// Bedrock format → Anthropic API format translation
function translateResponseFromBedrock(bedrockResponse: any): any {
  // Bedrock's Anthropic format is quite similar, just need to adjust structure
  return {
    id: `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content: bedrockResponse.content || [],
    model: bedrockResponse.model || 'claude-3-5-sonnet-20241022',
    stop_reason: bedrockResponse.stop_reason || null,
    stop_sequence: bedrockResponse.stop_sequence || null,
    usage: bedrockResponse.usage || {
      input_tokens: 0,
      output_tokens: 0,
    },
  };
}

// POST /v1/messages - Main Claude API endpoint
app.post('/v1/messages', async (req, res) => {
  try {
    const { model, stream = false } = req.body;

    // Resolve model to Bedrock ARN
    const bedrockModel = MODEL_MAP[model as keyof typeof MODEL_MAP] || DEFAULT_MODEL;

    // Log model resolution for debugging
    if (!MODEL_MAP[model as keyof typeof MODEL_MAP]) {
      console.log(`⚠️  Unknown model requested: "${model}", using fallback: ${DEFAULT_MODEL}`);
    } else {
      console.log(`✅ Model resolved: "${model}" → ${bedrockModel}`);
    }

    // Translate request format
    const bedrockRequest = translateRequestToBedrock(req.body);

    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const command = new InvokeModelWithResponseStreamCommand({
        modelId: bedrockModel,
        body: JSON.stringify(bedrockRequest),
        contentType: 'application/json',
      });

      const response = await bedrock.send(command);

      if (response.body) {
        for await (const chunk of response.body) {
          if (chunk.chunk?.bytes) {
            const chunkData = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));

            // Convert Bedrock streaming format to Anthropic streaming format
            if (chunkData.type === 'message_start') {
              res.write(`event: message_start\n`);
              res.write(`data: ${JSON.stringify({
                type: 'message_start',
                message: translateResponseFromBedrock(chunkData.message || {})
              })}\n\n`);
            } else if (chunkData.type === 'content_block_delta') {
              res.write(`event: content_block_delta\n`);
              res.write(`data: ${JSON.stringify(chunkData)}\n\n`);
            } else if (chunkData.type === 'message_stop') {
              res.write(`event: message_stop\n`);
              res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
            }
          }
        }
      }

      res.end();

    } else {
      // Non-streaming response
      const command = new InvokeModelCommand({
        modelId: bedrockModel,
        body: JSON.stringify(bedrockRequest),
        contentType: 'application/json',
      });

      const response = await bedrock.send(command);
      const bedrockResponse = JSON.parse(new TextDecoder().decode(response.body));

      // Translate response format
      const anthropicResponse = translateResponseFromBedrock(bedrockResponse);

      res.json(anthropicResponse);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: {
        type: 'api_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server with model initialization
async function startServer() {
  try {
    // Initialize dynamic model mapping
    await initializeModels();

    // Start the server
    app.listen(PORT, 'localhost', () => {
      console.log(`🚀 Claude Desktop → Bedrock Proxy running on http://localhost:${PORT}`);
      console.log(`📝 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Using AWS profile: ai-agent`);
      console.log(`🌍 AWS region: ${region}`);
      console.log(`📋 Using ${Object.keys(MODEL_MAP).length} model aliases`);
      console.log('\n💡 To use with Claude Desktop, configure it to use:');
      console.log(`   Base URL: http://localhost:${PORT}`);
      console.log('   API Key: (any value, ignored by proxy)');
    });

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  console.error('💥 Startup error:', error);
  process.exit(1);
});

export {};