import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { searchDocsTool } from "./tools/search_docs.js";
import { getDocTool } from "./tools/get_doc.js";
import { listApisTool } from "./tools/list_apis.js";
import { getApiTool } from "./tools/get_api.js";
import { getExampleTool } from "./tools/get_example.js";
import { readFileTool } from "./tools/read_file.js";
import { listFilesTool } from "./tools/list_files.js";

import { getDocResource, listDocResources } from "./resources/docs.js";
import { getImageResource, listImageResources } from "./resources/images.js";

const tools = [
  searchDocsTool,
  getDocTool,
  listApisTool,
  getApiTool,
  getExampleTool,
  readFileTool,
  listFilesTool,
];

const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

export function createServer(): Server {
  const server = new Server(
    { name: "daraja-docs", version: "0.1.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object",
        properties: tool.schema,
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const tool = toolMap.get(name);
    if (!tool) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
      };
    }
    const input = (request.params.arguments ?? {}) as Record<string, unknown>;
    try {
      const result = await tool.handler(input as never, undefined);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: (err as Error).message }),
          },
        ],
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      ...listDocResources().map((r) => ({
        uri: r.uri,
        name: r.name,
        mimeType: r.mimeType,
        description: r.description,
      })),
      ...listImageResources().map((r) => ({
        uri: r.uri,
        name: r.name,
        mimeType: r.mimeType,
        description: r.description,
      })),
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (uri.startsWith("daraja://docs/")) {
      const resource = getDocResource(uri);
      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          },
        ],
      };
    }
    if (uri.startsWith("daraja://assets/images/")) {
      const resource = getImageResource(uri);
      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            blob: resource.data,
          },
        ],
      };
    }
    throw new Error(`Unknown resource uri: ${uri}`);
  });

  return server;
}
