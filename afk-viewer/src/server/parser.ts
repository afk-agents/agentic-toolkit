// JSONL Parser - Parses Claude Code transcript files
import type {
  RawMessage,
  RawAssistantMessage,
  RawUserMessage,
  RawProgressMessage,
  RawMessageContent,
  Message,
  ToolCall,
  ToolResult,
  TokenUsage,
} from "../types";
import { getToolCategory, getToolDisplayName } from "../types";

// =============================================================================
// parseJsonlLine - Parse a single JSONL line
// =============================================================================

/**
 * Parse a single line of JSONL content.
 * Returns null for empty lines, whitespace-only lines, or parse errors.
 *
 * @param line - A single line from a JSONL file
 * @returns The parsed RawMessage or null if invalid
 */
export function parseJsonlLine(line: string): RawMessage | null {
  // Handle empty or whitespace-only lines
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed as RawMessage;
  } catch {
    // Invalid JSON - return null
    return null;
  }
}

// =============================================================================
// parseJsonlFile - Parse entire file content
// =============================================================================

/**
 * Parsed JSONL entry with both parsed object and raw line
 */
export interface ParsedJsonlEntry {
  raw: RawMessage;
  rawLine: string;
}

/**
 * Parse an entire JSONL file content.
 * Splits by newlines, parses each line, and filters out nulls.
 *
 * @param content - The entire JSONL file content as a string
 * @returns Array of successfully parsed entries with raw lines preserved
 */
export function parseJsonlFile(content: string): ParsedJsonlEntry[] {
  if (!content) {
    return [];
  }

  const lines = content.split("\n");
  const entries: ParsedJsonlEntry[] = [];

  for (const line of lines) {
    const parsed = parseJsonlLine(line);
    if (parsed !== null) {
      entries.push({ raw: parsed, rawLine: line.trim() });
    }
  }

  return entries;
}

// =============================================================================
// extractToolCalls - Extract tool_use blocks from assistant messages
// =============================================================================

/**
 * Extract tool calls from a raw message.
 * Only assistant messages contain tool_use blocks.
 * Returns empty array for non-assistant messages.
 *
 * @param message - A raw JSONL message
 * @returns Array of ToolCall objects
 */
export function extractToolCalls(message: RawMessage): ToolCall[] {
  // Only assistant messages have tool calls
  if (message.type !== "assistant") {
    return [];
  }

  const assistantMessage = message as RawAssistantMessage;
  const content = assistantMessage.message?.content;

  if (!Array.isArray(content)) {
    return [];
  }

  const toolCalls: ToolCall[] = [];

  for (const block of content) {
    if (block.type === "tool_use") {
      const toolUseBlock = block as {
        type: "tool_use";
        id: string;
        name: string;
        input: Record<string, unknown>;
      };

      toolCalls.push({
        id: toolUseBlock.id,
        name: toolUseBlock.name,
        input: toolUseBlock.input,
        displayName: getToolDisplayName(toolUseBlock.name),
        category: getToolCategory(toolUseBlock.name),
      });
    }
  }

  return toolCalls;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract text content from message content array or string.
 */
function extractTextContent(
  content: RawMessageContent[] | string | undefined
): string {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  const textBlocks = content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text);

  return textBlocks.join("\n");
}

/**
 * Extract thinking content from assistant message.
 */
function extractThinking(content: RawMessageContent[] | undefined): string | null {
  if (!content || !Array.isArray(content)) {
    return null;
  }

  const thinkingBlock = content.find(
    (block): block is { type: "thinking"; thinking: string } => block.type === "thinking"
  );

  return thinkingBlock?.thinking ?? null;
}

/**
 * Extract tool results from user message content.
 */
function extractToolResults(
  content: RawMessageContent[] | string | undefined
): ToolResult[] {
  if (!content || typeof content === "string" || !Array.isArray(content)) {
    return [];
  }

  const results: ToolResult[] = [];

  for (const block of content) {
    if (block.type === "tool_result") {
      const resultBlock = block as {
        type: "tool_result";
        tool_use_id: string;
        content: string | RawMessageContent[];
        is_error?: boolean;
      };

      let contentStr: string;
      if (typeof resultBlock.content === "string") {
        contentStr = resultBlock.content;
      } else if (Array.isArray(resultBlock.content)) {
        contentStr = extractTextContent(resultBlock.content);
      } else {
        contentStr = "";
      }

      results.push({
        toolUseId: resultBlock.tool_use_id,
        content: contentStr,
        isError: resultBlock.is_error ?? false,
      });
    }
  }

  return results;
}

/**
 * Extract token usage from assistant message.
 */
function extractUsage(message: RawAssistantMessage): TokenUsage | null {
  const usage = message.message?.usage;
  if (!usage) {
    return null;
  }

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cachedTokens: usage.cache_read_input_tokens ?? 0,
  };
}

// =============================================================================
// transformMessage - Convert raw JSONL message to our Message type
// =============================================================================

/**
 * Transform a raw JSONL message into our processed Message type.
 * Extracts relevant fields, parses tool calls, and normalizes the structure.
 *
 * @param raw - A raw JSONL message
 * @param rawLine - Optional raw JSONL string for debugging views
 * @returns A processed Message object for use in the UI
 */
export function transformMessage(raw: RawMessage, rawLine?: string): Message {
  // Base fields common to all message types
  const base: Partial<Message> = {
    uuid: raw.uuid,
    sessionId: raw.sessionId,
    timestamp: new Date(raw.timestamp),
    parentUuid: ("parentUuid" in raw && raw.parentUuid) || null,
    agentId: ("agentId" in raw && raw.agentId) || null,
    isSidechain: ("isSidechain" in raw && raw.isSidechain) || false,
    rawJsonl: rawLine,
  };

  // Handle different message types
  switch (raw.type) {
    case "user": {
      const userMsg = raw as RawUserMessage;
      return {
        ...base,
        type: "user",
        role: "user",
        textContent: extractTextContent(userMsg.message?.content),
        toolCalls: [],
        toolResults: extractToolResults(userMsg.message?.content),
        thinking: null,
        model: null,
        usage: null,
      } as Message;
    }

    case "assistant": {
      const assistantMsg = raw as RawAssistantMessage;
      return {
        ...base,
        type: "assistant",
        role: "assistant",
        textContent: extractTextContent(assistantMsg.message?.content),
        toolCalls: extractToolCalls(raw),
        toolResults: [],
        thinking: extractThinking(assistantMsg.message?.content),
        model: assistantMsg.message?.model ?? null,
        usage: extractUsage(assistantMsg),
      } as Message;
    }

    case "progress": {
      const progressMsg = raw as RawProgressMessage;
      return {
        ...base,
        type: "progress",
        role: "system",
        textContent: progressMsg.data?.output ?? progressMsg.data?.fullOutput ?? "",
        toolCalls: [],
        toolResults: [],
        thinking: null,
        model: null,
        usage: null,
      } as Message;
    }

    case "file-history-snapshot":
    case "queue-operation":
    default: {
      // Handle other message types as system messages
      return {
        ...base,
        type: "system",
        role: "system",
        textContent: "",
        toolCalls: [],
        toolResults: [],
        thinking: null,
        model: null,
        usage: null,
      } as Message;
    }
  }
}
