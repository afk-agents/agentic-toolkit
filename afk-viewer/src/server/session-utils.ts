// Session Utils - Extract session statistics and metadata from parsed messages
import type {
  Message,
  Session,
  SessionStats,
  ToolCallSummary,
  AgentNode,
} from "../types";

// =============================================================================
// Activity Indicators Type
// =============================================================================

/**
 * Indicates what types of activities occurred in a session
 */
export interface ActivityIndicators {
  hasFileReads: boolean;
  hasFileEdits: boolean;
  hasBashCommands: boolean;
  hasWebFetches: boolean;
  hasSubagents: boolean;
}

// =============================================================================
// getSessionStats - Count messages and tool calls
// =============================================================================

/**
 * Calculate session statistics from an array of messages.
 * Counts total messages and tool calls by category.
 *
 * @param messages - Array of processed Message objects
 * @returns SessionStats with message count and tool call summary
 */
export function getSessionStats(messages: Message[]): SessionStats {
  const toolCalls: ToolCallSummary = {
    read: 0,
    edit: 0,
    bash: 0,
    web: 0,
    agent: 0,
    other: 0,
  };

  for (const message of messages) {
    for (const toolCall of message.toolCalls) {
      switch (toolCall.category) {
        case "read":
          toolCalls.read++;
          break;
        case "write":
          toolCalls.edit++;
          break;
        case "bash":
          toolCalls.bash++;
          break;
        case "web":
          toolCalls.web++;
          break;
        case "agent":
          toolCalls.agent++;
          break;
        default:
          toolCalls.other++;
          break;
      }
    }
  }

  return {
    messageCount: messages.length,
    toolCalls,
  };
}

// =============================================================================
// getFirstUserMessage - Extract first user message preview
// =============================================================================

/**
 * Get the text content of the first user message in the session.
 * Truncates to approximately 60 characters for preview purposes.
 *
 * @param messages - Array of processed Message objects
 * @returns The first user message text (truncated) or null if none exists
 */
export function getFirstUserMessage(messages: Message[]): string | null {
  const firstUserMsg = messages.find((m) => m.type === "user");

  if (!firstUserMsg) {
    return null;
  }

  const text = firstUserMsg.textContent;

  // Truncate if longer than 60 characters
  if (text.length > 60) {
    return text.substring(0, 60) + "...";
  }

  return text;
}

// =============================================================================
// getActivityIndicators - Determine what activities occurred
// =============================================================================

/**
 * Analyze messages to determine what types of activities occurred.
 * Returns boolean flags for common activity types.
 *
 * @param messages - Array of processed Message objects
 * @returns ActivityIndicators with boolean flags for each activity type
 */
export function getActivityIndicators(messages: Message[]): ActivityIndicators {
  const indicators: ActivityIndicators = {
    hasFileReads: false,
    hasFileEdits: false,
    hasBashCommands: false,
    hasWebFetches: false,
    hasSubagents: false,
  };

  for (const message of messages) {
    for (const toolCall of message.toolCalls) {
      switch (toolCall.category) {
        case "read":
          indicators.hasFileReads = true;
          break;
        case "write":
          indicators.hasFileEdits = true;
          break;
        case "bash":
          indicators.hasBashCommands = true;
          break;
        case "web":
          indicators.hasWebFetches = true;
          break;
        case "agent":
          indicators.hasSubagents = true;
          break;
      }
    }

    // Early exit if all indicators are true
    if (
      indicators.hasFileReads &&
      indicators.hasFileEdits &&
      indicators.hasBashCommands &&
      indicators.hasWebFetches &&
      indicators.hasSubagents
    ) {
      break;
    }
  }

  return indicators;
}

// =============================================================================
// isSessionActive - Check if session is recently active
// =============================================================================

/**
 * Determine if a session is active based on the last message timestamp.
 * A session is considered active if its last message is within the threshold.
 *
 * @param messages - Array of processed Message objects
 * @param thresholdMs - Time threshold in milliseconds
 * @returns true if the last message is within the threshold, false otherwise
 */
export function isSessionActive(
  messages: Message[],
  thresholdMs: number
): boolean {
  if (messages.length === 0) {
    return false;
  }

  // Get the last message's timestamp
  const lastMessage = messages.at(-1);
  if (!lastMessage) {
    return false;
  }
  const lastTimestamp = lastMessage.timestamp.getTime();
  const now = Date.now();
  const elapsed = now - lastTimestamp;

  // Active if elapsed time is strictly less than threshold
  return elapsed < thresholdMs;
}

// =============================================================================
// buildAgentHierarchy - Build tree structure from sessions
// =============================================================================

/**
 * Build a tree structure of agent nodes from flat session array.
 * Sessions with parentId form a parent-child relationship.
 * Orphaned sessions (with non-existent parent) become roots.
 *
 * @param sessions - Array of Session objects
 * @returns Array of root AgentNode objects with children
 */
export function buildAgentHierarchy(sessions: Session[]): AgentNode[] {
  if (sessions.length === 0) {
    return [];
  }

  // Create a map of session id to AgentNode
  const nodeMap = new Map<string, AgentNode>();

  // First pass: create all nodes
  for (const session of sessions) {
    const displayName = session.isAgent && session.agentId
      ? session.agentId
      : "Main Session";

    const node: AgentNode = {
      id: session.id,
      sessionId: session.id,
      agentId: session.agentId,
      displayName,
      parentId: session.parentId,
      isActive: session.isActive,
      children: [],
      depth: 0,
    };

    nodeMap.set(session.id, node);
  }

  // Second pass: build parent-child relationships
  const roots: AgentNode[] = [];

  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      // Has a valid parent - add as child
      const parent = nodeMap.get(node.parentId)!;
      parent.children.push(node);
    } else {
      // No parent or parent doesn't exist - this is a root
      roots.push(node);
    }
  }

  // Third pass: calculate depths recursively
  function setDepths(node: AgentNode, depth: number): void {
    node.depth = depth;
    for (const child of node.children) {
      setDepths(child, depth + 1);
    }
  }

  for (const root of roots) {
    setDepths(root, 0);
  }

  return roots;
}
