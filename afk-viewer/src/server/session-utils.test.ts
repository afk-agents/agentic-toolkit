// Session Utils Tests - TDD approach
import { test, expect, describe } from "bun:test";
import type { Message, Session, SessionStats, AgentNode } from "../types";
import {
  getSessionStats,
  getFirstUserMessage,
  getActivityIndicators,
  isSessionActive,
  buildAgentHierarchy,
  type ActivityIndicators,
} from "./session-utils";

// =============================================================================
// Test Helpers - Create mock messages
// =============================================================================

function createMockMessage(
  overrides: Partial<Message> & { type: Message["type"]; role: Message["role"] }
): Message {
  return {
    uuid: crypto.randomUUID(),
    parentUuid: null,
    sessionId: "test-session",
    agentId: null,
    isSidechain: false,
    timestamp: new Date(),
    textContent: "",
    toolCalls: [],
    toolResults: [],
    thinking: null,
    model: null,
    usage: null,
    ...overrides,
  };
}

function createUserMessage(text: string, timestamp?: Date): Message {
  return createMockMessage({
    type: "user",
    role: "user",
    textContent: text,
    timestamp: timestamp ?? new Date(),
  });
}

function createAssistantMessage(
  text: string,
  toolCalls: Message["toolCalls"] = [],
  timestamp?: Date
): Message {
  return createMockMessage({
    type: "assistant",
    role: "assistant",
    textContent: text,
    toolCalls,
    timestamp: timestamp ?? new Date(),
  });
}

function createMockSession(overrides: Partial<Session>): Session {
  return {
    id: crypto.randomUUID(),
    projectPath: "/test/project",
    isAgent: false,
    parentId: null,
    agentId: null,
    messages: [],
    isActive: true,
    startTime: new Date(),
    lastActivity: new Date(),
    firstPrompt: "",
    gitBranch: null,
    stats: {
      messageCount: 0,
      toolCalls: { read: 0, edit: 0, bash: 0, web: 0, agent: 0, other: 0 },
    },
    ...overrides,
  };
}

// =============================================================================
// getSessionStats Tests
// =============================================================================

describe("getSessionStats", () => {
  test("returns zero counts for empty message array", () => {
    const stats = getSessionStats([]);

    expect(stats.messageCount).toBe(0);
    expect(stats.toolCalls.read).toBe(0);
    expect(stats.toolCalls.edit).toBe(0);
    expect(stats.toolCalls.bash).toBe(0);
    expect(stats.toolCalls.web).toBe(0);
    expect(stats.toolCalls.agent).toBe(0);
    expect(stats.toolCalls.other).toBe(0);
  });

  test("counts a single user message", () => {
    const messages = [createUserMessage("Hello")];
    const stats = getSessionStats(messages);

    expect(stats.messageCount).toBe(1);
  });

  test("counts multiple messages of different types", () => {
    const messages = [
      createUserMessage("Hello"),
      createAssistantMessage("Hi there!"),
      createUserMessage("Can you help?"),
      createAssistantMessage("Of course!"),
    ];
    const stats = getSessionStats(messages);

    expect(stats.messageCount).toBe(4);
  });

  test("counts tool calls by category", () => {
    const messages = [
      createAssistantMessage("Reading file...", [
        { id: "1", name: "Read", input: {}, displayName: "Read File", category: "read" },
        { id: "2", name: "Glob", input: {}, displayName: "Find Files", category: "read" },
      ]),
      createAssistantMessage("Editing file...", [
        { id: "3", name: "Edit", input: {}, displayName: "Edit File", category: "write" },
      ]),
      createAssistantMessage("Running command...", [
        { id: "4", name: "Bash", input: {}, displayName: "Run Command", category: "bash" },
      ]),
    ];
    const stats = getSessionStats(messages);

    expect(stats.toolCalls.read).toBe(2);
    expect(stats.toolCalls.edit).toBe(1);
    expect(stats.toolCalls.bash).toBe(1);
  });

  test("counts web and agent tool calls", () => {
    const messages = [
      createAssistantMessage("Searching...", [
        { id: "1", name: "WebFetch", input: {}, displayName: "Fetch URL", category: "web" },
        { id: "2", name: "WebSearch", input: {}, displayName: "Web Search", category: "web" },
      ]),
      createAssistantMessage("Spawning agent...", [
        { id: "3", name: "Task", input: {}, displayName: "Spawn Agent", category: "agent" },
      ]),
    ];
    const stats = getSessionStats(messages);

    expect(stats.toolCalls.web).toBe(2);
    expect(stats.toolCalls.agent).toBe(1);
  });

  test("counts other tool calls", () => {
    const messages = [
      createAssistantMessage("Using custom tool...", [
        { id: "1", name: "CustomTool", input: {}, displayName: "Custom Tool", category: "other" },
      ]),
    ];
    const stats = getSessionStats(messages);

    expect(stats.toolCalls.other).toBe(1);
  });
});

// =============================================================================
// getFirstUserMessage Tests
// =============================================================================

describe("getFirstUserMessage", () => {
  test("returns null for empty message array", () => {
    const result = getFirstUserMessage([]);
    expect(result).toBeNull();
  });

  test("returns null when no user messages exist", () => {
    const messages = [
      createAssistantMessage("Hello"),
      createAssistantMessage("How can I help?"),
    ];
    const result = getFirstUserMessage(messages);
    expect(result).toBeNull();
  });

  test("returns the first user message text", () => {
    const messages = [
      createUserMessage("First user message"),
      createUserMessage("Second user message"),
    ];
    const result = getFirstUserMessage(messages);
    expect(result).toBe("First user message");
  });

  test("finds first user message even when preceded by assistant messages", () => {
    const messages = [
      createAssistantMessage("System ready"),
      createUserMessage("Hello Claude"),
      createUserMessage("Another message"),
    ];
    const result = getFirstUserMessage(messages);
    expect(result).toBe("Hello Claude");
  });

  test("truncates long messages to approximately 60 characters", () => {
    const longText =
      "This is a very long message that should be truncated because it exceeds the maximum character limit for preview purposes";
    const messages = [createUserMessage(longText)];
    const result = getFirstUserMessage(messages);

    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(63); // 60 + "..."
    expect(result!.endsWith("...")).toBe(true);
  });

  test("does not truncate short messages", () => {
    const shortText = "Short message";
    const messages = [createUserMessage(shortText)];
    const result = getFirstUserMessage(messages);

    expect(result).toBe("Short message");
  });

  test("handles empty text content", () => {
    const messages = [createUserMessage("")];
    const result = getFirstUserMessage(messages);
    expect(result).toBe("");
  });
});

// =============================================================================
// getActivityIndicators Tests
// =============================================================================

describe("getActivityIndicators", () => {
  test("returns all false for empty message array", () => {
    const indicators = getActivityIndicators([]);

    expect(indicators.hasFileReads).toBe(false);
    expect(indicators.hasFileEdits).toBe(false);
    expect(indicators.hasBashCommands).toBe(false);
    expect(indicators.hasWebFetches).toBe(false);
    expect(indicators.hasSubagents).toBe(false);
  });

  test("detects file read operations", () => {
    const messages = [
      createAssistantMessage("Reading...", [
        { id: "1", name: "Read", input: {}, displayName: "Read File", category: "read" },
      ]),
    ];
    const indicators = getActivityIndicators(messages);

    expect(indicators.hasFileReads).toBe(true);
    expect(indicators.hasFileEdits).toBe(false);
  });

  test("detects file edit operations", () => {
    const messages = [
      createAssistantMessage("Editing...", [
        { id: "1", name: "Edit", input: {}, displayName: "Edit File", category: "write" },
      ]),
    ];
    const indicators = getActivityIndicators(messages);

    expect(indicators.hasFileEdits).toBe(true);
    expect(indicators.hasFileReads).toBe(false);
  });

  test("detects bash commands", () => {
    const messages = [
      createAssistantMessage("Running...", [
        { id: "1", name: "Bash", input: {}, displayName: "Run Command", category: "bash" },
      ]),
    ];
    const indicators = getActivityIndicators(messages);

    expect(indicators.hasBashCommands).toBe(true);
  });

  test("detects web fetches", () => {
    const messages = [
      createAssistantMessage("Fetching...", [
        { id: "1", name: "WebFetch", input: {}, displayName: "Fetch URL", category: "web" },
      ]),
    ];
    const indicators = getActivityIndicators(messages);

    expect(indicators.hasWebFetches).toBe(true);
  });

  test("detects subagent spawning", () => {
    const messages = [
      createAssistantMessage("Spawning agent...", [
        { id: "1", name: "Task", input: {}, displayName: "Spawn Agent", category: "agent" },
      ]),
    ];
    const indicators = getActivityIndicators(messages);

    expect(indicators.hasSubagents).toBe(true);
  });

  test("detects multiple activity types", () => {
    const messages = [
      createAssistantMessage("Reading...", [
        { id: "1", name: "Read", input: {}, displayName: "Read File", category: "read" },
      ]),
      createAssistantMessage("Editing...", [
        { id: "2", name: "Edit", input: {}, displayName: "Edit File", category: "write" },
      ]),
      createAssistantMessage("Running...", [
        { id: "3", name: "Bash", input: {}, displayName: "Run Command", category: "bash" },
      ]),
    ];
    const indicators = getActivityIndicators(messages);

    expect(indicators.hasFileReads).toBe(true);
    expect(indicators.hasFileEdits).toBe(true);
    expect(indicators.hasBashCommands).toBe(true);
    expect(indicators.hasWebFetches).toBe(false);
    expect(indicators.hasSubagents).toBe(false);
  });

  test("detects Glob as a read operation", () => {
    const messages = [
      createAssistantMessage("Finding files...", [
        { id: "1", name: "Glob", input: {}, displayName: "Find Files", category: "read" },
      ]),
    ];
    const indicators = getActivityIndicators(messages);

    expect(indicators.hasFileReads).toBe(true);
  });

  test("detects Grep as a read operation", () => {
    const messages = [
      createAssistantMessage("Searching...", [
        { id: "1", name: "Grep", input: {}, displayName: "Search Content", category: "read" },
      ]),
    ];
    const indicators = getActivityIndicators(messages);

    expect(indicators.hasFileReads).toBe(true);
  });

  test("detects Write as an edit operation", () => {
    const messages = [
      createAssistantMessage("Writing...", [
        { id: "1", name: "Write", input: {}, displayName: "Write File", category: "write" },
      ]),
    ];
    const indicators = getActivityIndicators(messages);

    expect(indicators.hasFileEdits).toBe(true);
  });

  test("detects WebSearch as a web operation", () => {
    const messages = [
      createAssistantMessage("Searching...", [
        { id: "1", name: "WebSearch", input: {}, displayName: "Web Search", category: "web" },
      ]),
    ];
    const indicators = getActivityIndicators(messages);

    expect(indicators.hasWebFetches).toBe(true);
  });
});

// =============================================================================
// isSessionActive Tests
// =============================================================================

describe("isSessionActive", () => {
  test("returns false for empty message array", () => {
    const result = isSessionActive([], 60000);
    expect(result).toBe(false);
  });

  test("returns true when last message is within threshold", () => {
    const recentTime = new Date(Date.now() - 30000); // 30 seconds ago
    const messages = [createUserMessage("Hello", recentTime)];

    const result = isSessionActive(messages, 60000); // 1 minute threshold
    expect(result).toBe(true);
  });

  test("returns false when last message is older than threshold", () => {
    const oldTime = new Date(Date.now() - 120000); // 2 minutes ago
    const messages = [createUserMessage("Hello", oldTime)];

    const result = isSessionActive(messages, 60000); // 1 minute threshold
    expect(result).toBe(false);
  });

  test("uses the last message timestamp, not the first", () => {
    const oldTime = new Date(Date.now() - 300000); // 5 minutes ago
    const recentTime = new Date(Date.now() - 30000); // 30 seconds ago

    const messages = [
      createUserMessage("First", oldTime),
      createUserMessage("Last", recentTime),
    ];

    const result = isSessionActive(messages, 60000); // 1 minute threshold
    expect(result).toBe(true);
  });

  test("handles edge case where message is exactly at threshold", () => {
    const exactTime = new Date(Date.now() - 60000); // exactly 1 minute ago
    const messages = [createUserMessage("Hello", exactTime)];

    // At exactly threshold, should be considered inactive (not strictly less than)
    const result = isSessionActive(messages, 60000);
    expect(result).toBe(false);
  });

  test("works with different threshold values", () => {
    const time = new Date(Date.now() - 5000); // 5 seconds ago
    const messages = [createUserMessage("Hello", time)];

    expect(isSessionActive(messages, 10000)).toBe(true); // 10 second threshold
    expect(isSessionActive(messages, 3000)).toBe(false); // 3 second threshold
  });
});

// =============================================================================
// buildAgentHierarchy Tests
// =============================================================================

describe("buildAgentHierarchy", () => {
  test("returns empty array for empty sessions array", () => {
    const result = buildAgentHierarchy([]);
    expect(result).toEqual([]);
  });

  test("creates single root node for one session without parent", () => {
    const sessions = [
      createMockSession({
        id: "session-1",
        parentId: null,
        isAgent: false,
      }),
    ];

    const result = buildAgentHierarchy(sessions);

    expect(result.length).toBe(1);
    const root = result[0]!;
    expect(root.id).toBe("session-1");
    expect(root.parentId).toBeNull();
    expect(root.children).toEqual([]);
    expect(root.depth).toBe(0);
  });

  test("creates hierarchy with parent and child", () => {
    const sessions = [
      createMockSession({
        id: "parent-session",
        parentId: null,
        isAgent: false,
      }),
      createMockSession({
        id: "child-session",
        parentId: "parent-session",
        isAgent: true,
        agentId: "agent-1",
      }),
    ];

    const result = buildAgentHierarchy(sessions);

    expect(result.length).toBe(1); // Only one root
    const root = result[0]!;
    const child = root.children[0]!;
    expect(root.id).toBe("parent-session");
    expect(root.children.length).toBe(1);
    expect(child.id).toBe("child-session");
    expect(child.parentId).toBe("parent-session");
    expect(child.depth).toBe(1);
  });

  test("creates nested hierarchy with multiple levels", () => {
    const sessions = [
      createMockSession({
        id: "root",
        parentId: null,
      }),
      createMockSession({
        id: "level-1",
        parentId: "root",
        isAgent: true,
      }),
      createMockSession({
        id: "level-2",
        parentId: "level-1",
        isAgent: true,
      }),
    ];

    const result = buildAgentHierarchy(sessions);

    expect(result.length).toBe(1);
    const root = result[0]!;
    const level1 = root.children[0]!;
    const level2 = level1.children[0]!;
    expect(root.id).toBe("root");
    expect(root.depth).toBe(0);
    expect(root.children.length).toBe(1);
    expect(level1.id).toBe("level-1");
    expect(level1.depth).toBe(1);
    expect(level1.children.length).toBe(1);
    expect(level2.id).toBe("level-2");
    expect(level2.depth).toBe(2);
  });

  test("handles multiple children under one parent", () => {
    const sessions = [
      createMockSession({
        id: "parent",
        parentId: null,
      }),
      createMockSession({
        id: "child-1",
        parentId: "parent",
        isAgent: true,
      }),
      createMockSession({
        id: "child-2",
        parentId: "parent",
        isAgent: true,
      }),
      createMockSession({
        id: "child-3",
        parentId: "parent",
        isAgent: true,
      }),
    ];

    const result = buildAgentHierarchy(sessions);

    expect(result.length).toBe(1);
    const root = result[0]!;
    expect(root.children.length).toBe(3);
    expect(root.children.map((c) => c.id).sort()).toEqual([
      "child-1",
      "child-2",
      "child-3",
    ]);
  });

  test("handles multiple root sessions", () => {
    const sessions = [
      createMockSession({
        id: "root-1",
        parentId: null,
      }),
      createMockSession({
        id: "root-2",
        parentId: null,
      }),
    ];

    const result = buildAgentHierarchy(sessions);

    expect(result.length).toBe(2);
    expect(result.map((r) => r.id).sort()).toEqual(["root-1", "root-2"]);
  });

  test("preserves isActive status in nodes", () => {
    const sessions = [
      createMockSession({
        id: "session-1",
        parentId: null,
        isActive: true,
      }),
      createMockSession({
        id: "session-2",
        parentId: "session-1",
        isActive: false,
      }),
    ];

    const result = buildAgentHierarchy(sessions);

    const root = result[0]!;
    const child = root.children[0]!;
    expect(root.isActive).toBe(true);
    expect(child.isActive).toBe(false);
  });

  test("sets displayName from session properties", () => {
    const sessions = [
      createMockSession({
        id: "session-1",
        parentId: null,
        isAgent: false,
        firstPrompt: "Main session task",
      }),
      createMockSession({
        id: "agent-session",
        parentId: "session-1",
        isAgent: true,
        agentId: "explore-agent",
        firstPrompt: "Exploring codebase",
      }),
    ];

    const result = buildAgentHierarchy(sessions);

    const root = result[0]!;
    const child = root.children[0]!;
    expect(root.displayName).toBe("Main Session");
    expect(child.displayName).toBe("explore-agent");
  });

  test("handles orphaned children gracefully", () => {
    // Child with non-existent parent should become a root
    const sessions = [
      createMockSession({
        id: "orphan",
        parentId: "non-existent-parent",
        isAgent: true,
      }),
    ];

    const result = buildAgentHierarchy(sessions);

    expect(result.length).toBe(1);
    const orphan = result[0]!;
    expect(orphan.id).toBe("orphan");
    expect(orphan.parentId).toBe("non-existent-parent");
    expect(orphan.depth).toBe(0); // Treated as root since parent doesn't exist
  });
});
