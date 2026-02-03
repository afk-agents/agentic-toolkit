// AFK Viewer - Shared TypeScript Types

// =============================================================================
// JSONL Raw Message Types (as they appear in the JSONL files)
// =============================================================================

/**
 * Raw JSONL message types that can appear in transcript files
 */
export type RawMessageType =
  | "user"
  | "assistant"
  | "progress"
  | "file-history-snapshot"
  | "queue-operation";

/**
 * Base fields common to most raw messages
 */
export interface RawMessageBase {
  uuid: string;
  timestamp: string;
  type: RawMessageType;
  sessionId: string;
  parentUuid?: string | null;
  isSidechain?: boolean;
  agentId?: string;
  cwd?: string;
  version?: string;
  gitBranch?: string;
  slug?: string;
  userType?: "external" | "internal";
  permissionMode?: string;
}

/**
 * Raw user message from JSONL
 */
export interface RawUserMessage extends RawMessageBase {
  type: "user";
  message: {
    role: "user";
    content: RawMessageContent[] | string;
  };
  toolUseResult?: unknown;
  sourceToolAssistantUUID?: string;
}

/**
 * Raw assistant message from JSONL
 */
export interface RawAssistantMessage extends RawMessageBase {
  type: "assistant";
  requestId?: string;
  message: {
    model: string;
    id: string;
    type: "message";
    role: "assistant";
    content: RawMessageContent[];
    stop_reason: string | null;
    stop_sequence: string | null;
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation?: {
        ephemeral_5m_input_tokens: number;
        ephemeral_1h_input_tokens: number;
      };
      service_tier?: string;
    };
  };
}

/**
 * Raw progress message from JSONL (for long-running operations like bash)
 */
export interface RawProgressMessage extends RawMessageBase {
  type: "progress";
  toolUseID: string;
  parentToolUseID?: string;
  data: {
    type: string;
    output?: string;
    fullOutput?: string;
    elapsedTimeSeconds?: number;
    totalLines?: number;
  };
}

/**
 * Raw file history snapshot message from JSONL
 */
export interface RawFileHistorySnapshot extends RawMessageBase {
  type: "file-history-snapshot";
  messageId: string;
  isSnapshotUpdate: boolean;
  snapshot: {
    messageId: string;
    trackedFileBackups: Record<string, unknown>;
    timestamp: string;
  };
}

/**
 * Raw queue operation message from JSONL
 */
export interface RawQueueOperation {
  type: "queue-operation";
  operation: "dequeue" | "enqueue";
  timestamp: string;
  sessionId: string;
}

/**
 * Union of all raw message types
 */
export type RawMessage =
  | RawUserMessage
  | RawAssistantMessage
  | RawProgressMessage
  | RawFileHistorySnapshot
  | RawQueueOperation;

/**
 * Raw message content types (within user/assistant messages)
 */
export type RawMessageContent =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string; signature?: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string | RawMessageContent[]; is_error?: boolean };

// =============================================================================
// Parsed/Processed Types (used by the application)
// =============================================================================

/**
 * Processed message for display in the UI
 */
export interface Message {
  uuid: string;
  parentUuid: string | null;
  sessionId: string;
  agentId: string | null;
  isSidechain: boolean;
  timestamp: Date;
  type: "user" | "assistant" | "progress" | "system";
  role: "user" | "assistant" | "system";
  textContent: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  thinking: string | null;
  model: string | null;
  usage: TokenUsage | null;
  /** Raw JSONL string for debugging/comparison views */
  rawJsonl?: string;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

/**
 * Processed tool call for display
 */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  displayName: string;
  category: ToolCategory;
}

/**
 * Tool result from a tool call
 */
export interface ToolResult {
  toolUseId: string;
  content: string;
  isError: boolean;
}

/**
 * Tool categories for visual grouping and color coding
 */
export type ToolCategory = "read" | "write" | "bash" | "web" | "agent" | "other";

/**
 * Tool call summary counts for session stats
 */
export interface ToolCallSummary {
  read: number;
  edit: number;
  bash: number;
  web: number;
  agent: number;
  other: number;
}

// =============================================================================
// Session and Project Types
// =============================================================================

/**
 * Session representation
 */
export interface Session {
  id: string;
  projectPath: string;
  isAgent: boolean;
  parentId: string | null;
  agentId: string | null;
  messages: Message[];
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
  firstPrompt: string;
  gitBranch: string | null;
  stats: SessionStats;
}

/**
 * Lightweight session summary (without messages) for initial state
 */
export interface SessionSummary {
  id: string;
  projectPath: string;
  isAgent: boolean;
  parentId: string | null;
  agentId: string | null;
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
  firstPrompt: string;
  gitBranch: string | null;
  stats: SessionStats;
}

/**
 * Project with session summaries (for initial state)
 */
export interface ProjectSummary {
  path: string;
  displayName: string;
  sessions: SessionSummary[];
  lastActivity: Date;
  isPinned: boolean;
  isExpanded: boolean;
}

/**
 * Session statistics
 */
export interface SessionStats {
  messageCount: number;
  toolCalls: ToolCallSummary;
}

/**
 * Project representation
 */
export interface Project {
  path: string;
  displayName: string;
  sessions: Session[];
  lastActivity: Date;
  isPinned: boolean;
  isExpanded: boolean;
}

// =============================================================================
// Agent Graph Types
// =============================================================================

/**
 * Agent node for hierarchy visualization
 */
export interface AgentNode {
  id: string;
  sessionId: string;
  agentId: string | null;
  displayName: string;
  parentId: string | null;
  isActive: boolean;
  children: AgentNode[];
  depth: number;
  position?: {
    x: number;
    y: number;
  };
}

/**
 * Graph layout configuration
 */
export interface GraphLayout {
  nodes: AgentNode[];
  width: number;
  height: number;
}

// =============================================================================
// WebSocket Message Types
// =============================================================================

/**
 * WebSocket message from server to client
 */
export type WSMessage =
  | WSSessionUpdate
  | WSNewSession
  | WSSessionComplete
  | WSInitialState
  | WSSessionMessages
  | WSConnectionStatus;

export interface WSSessionUpdate {
  type: "session_update";
  projectPath: string;
  sessionId: string;
  messages: Message[];
}

export interface WSNewSession {
  type: "new_session";
  projectPath: string;
  sessionId: string;
  session: Session;
  isAgent: boolean;
}

export interface WSSessionComplete {
  type: "session_complete";
  projectPath: string;
  sessionId: string;
}

export interface WSInitialState {
  type: "initial_state";
  projects: ProjectSummary[];
}

export interface WSSessionMessages {
  type: "session_messages";
  projectPath: string;
  sessionId: string;
  messages: Message[];
}

export interface WSConnectionStatus {
  type: "connection_status";
  connected: boolean;
}

/**
 * WebSocket message from client to server
 */
export type WSClientMessage =
  | { type: "subscribe"; sessionId: string }
  | { type: "unsubscribe"; sessionId: string }
  | { type: "get_messages"; sessionId: string; projectPath: string }
  | { type: "ping" };

// =============================================================================
// Persisted State (localStorage)
// =============================================================================

/**
 * State persisted in localStorage
 */
export interface PersistedState {
  pinnedProjects: string[];
  expandedProjects: string[];
  lastViewedSession: string | null;
  panelWidths: {
    left: number;
    right: number;
  };
  theme?: "dark" | "light";
}

/**
 * Default persisted state values
 */
export const DEFAULT_PERSISTED_STATE: PersistedState = {
  pinnedProjects: [],
  expandedProjects: [],
  lastViewedSession: null,
  panelWidths: {
    left: 280,
    right: 300,
  },
  theme: "dark",
};

// =============================================================================
// Application State
// =============================================================================

/**
 * Main application state
 */
export interface AppState {
  projects: Map<string, Project>;
  activeSessionId: string | null;
  activeProjectPath: string | null;
  agentGraph: AgentNode[];
  isConnected: boolean;
  scrollPaused: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial application state
 */
export const DEFAULT_APP_STATE: AppState = {
  projects: new Map(),
  activeSessionId: null,
  activeProjectPath: null,
  agentGraph: [],
  isConnected: false,
  scrollPaused: false,
  isLoading: true,
  error: null,
};

// =============================================================================
// Sessions Index Types (from sessions-index.json)
// =============================================================================

/**
 * Entry in the sessions-index.json file
 */
export interface SessionIndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch: string;
  projectPath: string;
  isSidechain: boolean;
}

/**
 * Sessions index file structure
 */
export interface SessionsIndex {
  version: number;
  entries: SessionIndexEntry[];
  originalPath: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Tool name to category mapping
 */
export const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  // Read operations
  Read: "read",
  Glob: "read",
  Grep: "read",
  LS: "read",

  // Write operations
  Write: "write",
  Edit: "write",
  MultiEdit: "write",
  NotebookEdit: "write",

  // Bash operations
  Bash: "bash",

  // Web operations
  WebFetch: "web",
  WebSearch: "web",

  // Agent operations
  Task: "agent",
  Agent: "agent",
  Dispatch: "agent",
  TodoRead: "agent",
  TodoWrite: "agent",
};

/**
 * Get tool category from tool name
 */
export function getToolCategory(toolName: string): ToolCategory {
  return TOOL_CATEGORIES[toolName] || "other";
}

/**
 * Get display name for a tool
 */
export function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    Read: "Read File",
    Write: "Write File",
    Edit: "Edit File",
    Glob: "Find Files",
    Grep: "Search Content",
    Bash: "Run Command",
    WebFetch: "Fetch URL",
    WebSearch: "Web Search",
    Task: "Spawn Agent",
    Agent: "Agent",
  };
  return displayNames[toolName] || toolName;
}
