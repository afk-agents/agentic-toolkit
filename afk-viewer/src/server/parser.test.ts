// JSONL Parser Tests - TDD Approach
import { test, expect, describe } from "bun:test";
import {
  parseJsonlLine,
  parseJsonlFile,
  extractToolCalls,
  transformMessage,
} from "./parser";
import type {
  RawUserMessage,
  RawAssistantMessage,
  RawProgressMessage,
  ToolCall,
  Message,
} from "../types";

// =============================================================================
// Test Data Fixtures
// =============================================================================

const validUserMessage: RawUserMessage = {
  uuid: "user-uuid-123",
  timestamp: "2025-01-15T10:30:00.000Z",
  type: "user",
  sessionId: "session-123",
  parentUuid: null,
  isSidechain: false,
  message: {
    role: "user",
    content: [{ type: "text", text: "Hello, Claude!" }],
  },
};

const validAssistantMessage: RawAssistantMessage = {
  uuid: "assistant-uuid-456",
  timestamp: "2025-01-15T10:30:05.000Z",
  type: "assistant",
  sessionId: "session-123",
  parentUuid: "user-uuid-123",
  isSidechain: false,
  message: {
    model: "claude-3-opus-20240229",
    id: "msg_123",
    type: "message",
    role: "assistant",
    content: [
      { type: "text", text: "Hello! I'll help you with that." },
      {
        type: "tool_use",
        id: "tool-use-1",
        name: "Read",
        input: { file_path: "/path/to/file.ts" },
      },
      {
        type: "tool_use",
        id: "tool-use-2",
        name: "Bash",
        input: { command: "ls -la" },
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 20,
    },
  },
};

const assistantMessageWithThinking: RawAssistantMessage = {
  uuid: "assistant-uuid-789",
  timestamp: "2025-01-15T10:30:10.000Z",
  type: "assistant",
  sessionId: "session-123",
  parentUuid: "user-uuid-123",
  message: {
    model: "claude-3-opus-20240229",
    id: "msg_456",
    type: "message",
    role: "assistant",
    content: [
      { type: "thinking", thinking: "Let me think about this..." },
      { type: "text", text: "Here's my response." },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 50,
      output_tokens: 25,
    },
  },
};

const progressMessage: RawProgressMessage = {
  uuid: "progress-uuid-111",
  timestamp: "2025-01-15T10:30:15.000Z",
  type: "progress",
  sessionId: "session-123",
  toolUseID: "tool-use-1",
  data: {
    type: "bash_output",
    output: "Running command...",
  },
};

// =============================================================================
// parseJsonlLine Tests
// =============================================================================

describe("parseJsonlLine", () => {
  test("parses valid JSON line", () => {
    const line = JSON.stringify(validUserMessage);
    const result = parseJsonlLine(line);

    expect(result).not.toBeNull();
    expect(result?.uuid).toBe("user-uuid-123");
    expect(result?.type).toBe("user");
  });

  test("returns null for invalid JSON", () => {
    const invalidJson = "{ invalid json }";
    const result = parseJsonlLine(invalidJson);

    expect(result).toBeNull();
  });

  test("returns null for empty string", () => {
    const result = parseJsonlLine("");
    expect(result).toBeNull();
  });

  test("returns null for whitespace only", () => {
    const result = parseJsonlLine("   \t  ");
    expect(result).toBeNull();
  });

  test("parses assistant message correctly", () => {
    const line = JSON.stringify(validAssistantMessage);
    const result = parseJsonlLine(line);

    expect(result).not.toBeNull();
    expect(result?.type).toBe("assistant");
    expect((result as RawAssistantMessage).message.content).toHaveLength(3);
  });

  test("parses progress message correctly", () => {
    const line = JSON.stringify(progressMessage);
    const result = parseJsonlLine(line);

    expect(result).not.toBeNull();
    expect(result?.type).toBe("progress");
    expect((result as RawProgressMessage).toolUseID).toBe("tool-use-1");
  });
});

// =============================================================================
// parseJsonlFile Tests
// =============================================================================

describe("parseJsonlFile", () => {
  test("parses multi-line content", () => {
    const content = [
      JSON.stringify(validUserMessage),
      JSON.stringify(validAssistantMessage),
    ].join("\n");

    const result = parseJsonlFile(content);

    expect(result).toHaveLength(2);
    expect(result[0].raw.type).toBe("user");
    expect(result[1].raw.type).toBe("assistant");
  });

  test("filters out invalid lines", () => {
    const content = [
      JSON.stringify(validUserMessage),
      "{ invalid json }",
      "",
      JSON.stringify(validAssistantMessage),
    ].join("\n");

    const result = parseJsonlFile(content);

    expect(result).toHaveLength(2);
    expect(result[0].raw.type).toBe("user");
    expect(result[1].raw.type).toBe("assistant");
  });

  test("handles empty content", () => {
    const result = parseJsonlFile("");
    expect(result).toHaveLength(0);
  });

  test("handles content with only empty lines", () => {
    const content = "\n\n\n";
    const result = parseJsonlFile(content);
    expect(result).toHaveLength(0);
  });

  test("handles single line content", () => {
    const content = JSON.stringify(validUserMessage);
    const result = parseJsonlFile(content);

    expect(result).toHaveLength(1);
    expect(result[0].raw.type).toBe("user");
  });

  test("preserves order of messages", () => {
    const content = [
      JSON.stringify({ ...validUserMessage, uuid: "first" }),
      JSON.stringify({ ...validUserMessage, uuid: "second" }),
      JSON.stringify({ ...validUserMessage, uuid: "third" }),
    ].join("\n");

    const result = parseJsonlFile(content);

    expect(result).toHaveLength(3);
    expect(result[0].raw.uuid).toBe("first");
    expect(result[1].raw.uuid).toBe("second");
    expect(result[2].raw.uuid).toBe("third");
  });

  test("preserves raw JSONL lines", () => {
    const line1 = JSON.stringify(validUserMessage);
    const line2 = JSON.stringify(validAssistantMessage);
    const content = [line1, line2].join("\n");

    const result = parseJsonlFile(content);

    expect(result).toHaveLength(2);
    expect(result[0].rawLine).toBe(line1);
    expect(result[1].rawLine).toBe(line2);
  });
});

// =============================================================================
// extractToolCalls Tests
// =============================================================================

describe("extractToolCalls", () => {
  test("extracts tool calls from assistant message", () => {
    const result = extractToolCalls(validAssistantMessage);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Read");
    expect(result[0].id).toBe("tool-use-1");
    expect(result[0].input).toEqual({ file_path: "/path/to/file.ts" });
    expect(result[1].name).toBe("Bash");
    expect(result[1].id).toBe("tool-use-2");
  });

  test("returns empty array for message without tools", () => {
    const messageNoTools: RawAssistantMessage = {
      ...validAssistantMessage,
      message: {
        ...validAssistantMessage.message,
        content: [{ type: "text", text: "Just text, no tools" }],
      },
    };

    const result = extractToolCalls(messageNoTools);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for user message", () => {
    const result = extractToolCalls(validUserMessage);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for progress message", () => {
    const result = extractToolCalls(progressMessage);
    expect(result).toHaveLength(0);
  });

  test("assigns correct category to Read tool", () => {
    const result = extractToolCalls(validAssistantMessage);
    const readTool = result.find((t) => t.name === "Read");

    expect(readTool?.category).toBe("read");
  });

  test("assigns correct category to Bash tool", () => {
    const result = extractToolCalls(validAssistantMessage);
    const bashTool = result.find((t) => t.name === "Bash");

    expect(bashTool?.category).toBe("bash");
  });

  test("assigns display name to tools", () => {
    const result = extractToolCalls(validAssistantMessage);
    const readTool = result.find((t) => t.name === "Read");

    expect(readTool?.displayName).toBe("Read File");
  });
});

// =============================================================================
// transformMessage Tests
// =============================================================================

describe("transformMessage", () => {
  test("transforms user message correctly", () => {
    const result = transformMessage(validUserMessage);

    expect(result.uuid).toBe("user-uuid-123");
    expect(result.type).toBe("user");
    expect(result.role).toBe("user");
    expect(result.sessionId).toBe("session-123");
    expect(result.parentUuid).toBeNull();
    expect(result.isSidechain).toBe(false);
    expect(result.textContent).toBe("Hello, Claude!");
    expect(result.toolCalls).toHaveLength(0);
    expect(result.model).toBeNull();
  });

  test("transforms assistant message with tools correctly", () => {
    const result = transformMessage(validAssistantMessage);

    expect(result.uuid).toBe("assistant-uuid-456");
    expect(result.type).toBe("assistant");
    expect(result.role).toBe("assistant");
    expect(result.textContent).toBe("Hello! I'll help you with that.");
    expect(result.toolCalls).toHaveLength(2);
    expect(result.model).toBe("claude-3-opus-20240229");
    expect(result.usage).not.toBeNull();
    expect(result.usage?.inputTokens).toBe(100);
    expect(result.usage?.outputTokens).toBe(50);
    expect(result.usage?.cachedTokens).toBe(20);
  });

  test("extracts thinking content from assistant message", () => {
    const result = transformMessage(assistantMessageWithThinking);

    expect(result.thinking).toBe("Let me think about this...");
    expect(result.textContent).toBe("Here's my response.");
  });

  test("parses timestamp to Date object", () => {
    const result = transformMessage(validUserMessage);

    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.timestamp.toISOString()).toBe("2025-01-15T10:30:00.000Z");
  });

  test("handles user message with string content", () => {
    const userWithStringContent: RawUserMessage = {
      ...validUserMessage,
      message: {
        role: "user",
        content: "Plain text message",
      },
    };

    const result = transformMessage(userWithStringContent);
    expect(result.textContent).toBe("Plain text message");
  });

  test("transforms progress message correctly", () => {
    const result = transformMessage(progressMessage);

    expect(result.uuid).toBe("progress-uuid-111");
    expect(result.type).toBe("progress");
    expect(result.role).toBe("system");
    expect(result.toolCalls).toHaveLength(0);
  });

  test("handles missing optional fields", () => {
    const minimalUserMessage: RawUserMessage = {
      uuid: "min-uuid",
      timestamp: "2025-01-15T10:30:00.000Z",
      type: "user",
      sessionId: "session-123",
      message: {
        role: "user",
        content: "Hello",
      },
    };

    const result = transformMessage(minimalUserMessage);

    expect(result.parentUuid).toBeNull();
    expect(result.agentId).toBeNull();
    expect(result.isSidechain).toBe(false);
  });

  test("extracts agentId when present", () => {
    const messageWithAgent: RawUserMessage = {
      ...validUserMessage,
      agentId: "agent-123",
    };

    const result = transformMessage(messageWithAgent);
    expect(result.agentId).toBe("agent-123");
  });

  test("preserves raw JSONL line when provided", () => {
    const rawLine = JSON.stringify(validUserMessage);
    const result = transformMessage(validUserMessage, rawLine);

    expect(result.rawJsonl).toBe(rawLine);
  });

  test("rawJsonl is undefined when not provided", () => {
    const result = transformMessage(validUserMessage);

    expect(result.rawJsonl).toBeUndefined();
  });
});
