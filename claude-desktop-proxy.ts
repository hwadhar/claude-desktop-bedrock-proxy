#!/usr/bin/env tsx

import express from 'express';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-providers';
import cors from 'cors';

const app = express();
const PORT = 7847;

// Configure AWS Bedrock client with your existing profile
const bedrock = new BedrockRuntimeClient({
  region: 'us-west-2',
  credentials: fromIni({ profile: 'ai-agent' }),
});

// Model mapping: Anthropic model names → Bedrock inference profile ARNs
const MODEL_MAP = {
  'claude-3-5-sonnet-20241022': 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
  'claude-3-5-haiku-20241022': 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  'claude-3-opus-20240229': 'us.anthropic.claude-3-opus-20240229-v1:0',
  'sonnet-4': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'claude-sonnet-4': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'claude-sonnet-4-5-20250929': 'us.anthropic.claude-sonnet-4-20250514-v1:0', // Map to Sonnet 4
  'sonnet-4.5': 'us.anthropic.claude-sonnet-4-20250514-v1:0', // Map to latest available
  'claude-3.7': 'us.anthropic.claude-3-5-sonnet-20241022-v2:0', // Map to 3.5 Sonnet
} as const;

// Default fallback model if requested model is not found
const DEFAULT_MODEL = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

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

// Start server
app.listen(PORT, 'localhost', () => {
  console.log(`🚀 Claude Desktop → Bedrock Proxy running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Using AWS profile: ai-agent`);
  console.log(`🌍 AWS region: us-west-2`);
  console.log('\n💡 To use with Claude Desktop, configure it to use:');
  console.log(`   Base URL: http://localhost:${PORT}`);
  console.log('   API Key: (any value, ignored by proxy)');
});

export {};