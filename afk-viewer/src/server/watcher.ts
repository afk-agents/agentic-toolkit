// File Watcher - Monitors ~/.claude/projects/ for JSONL file changes
import { watch, type FSWatcher } from "fs";
import { homedir } from "os";
import { join, basename, dirname } from "path";
import type { Message, Project, Session, ToolCallSummary } from "../types";
import { parseJsonlFile, transformMessage } from "./parser";

// =============================================================================
// Types
// =============================================================================

/**
 * Callbacks for watcher events
 */
export interface WatcherEvents {
  onNewSession: (projectPath: string, sessionId: string, isAgent: boolean) => void;
  onSessionUpdate: (projectPath: string, sessionId: string, newMessages: Message[]) => void;
  onSessionRemoved: (projectPath: string, sessionId: string) => void;
}

/**
 * Watcher interface for controlling the file watcher
 */
export interface Watcher {
  start(): void;
  stop(): void;
  getInitialState(): Promise<Project[]>;
}

/**
 * Internal state for tracking file positions
 */
interface FileState {
  path: string;
  position: number;
  sessionId: string;
  projectPath: string;
  isAgent: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");

// UUID regex pattern for session files
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Agent file pattern
const AGENT_PREFIX = "agent-";

// Debounce time for file changes (ms)
const DEBOUNCE_MS = 100;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Decode URL-encoded project path to display name
 * e.g., "-Users-namick-code-myproject" -> "/Users/namick/code/myproject"
 */
export function decodeProjectPath(encodedPath: string): string {
  // Replace leading dash and all dashes with slashes
  // The encoding uses dashes instead of slashes
  return encodedPath.replace(/^-/, "/").replace(/-/g, "/");
}

/**
 * Encode a file system path to the Claude project directory name format
 * e.g., "/Users/namick/code/myproject" -> "-Users-namick-code-myproject"
 */
export function encodeProjectPath(path: string): string {
  return path.replace(/\//g, "-");
}

/**
 * Extract session ID from filename
 * e.g., "abc123.jsonl" -> "abc123"
 * e.g., "agent-xyz789.jsonl" -> "agent-xyz789"
 */
export function extractSessionId(filename: string): string {
  return filename.replace(/\.jsonl$/, "");
}

/**
 * Check if a filename is a session file (UUID format)
 */
export function isSessionFile(filename: string): boolean {
  if (!filename.endsWith(".jsonl")) return false;
  const id = extractSessionId(filename);
  return UUID_REGEX.test(id);
}

/**
 * Check if a filename is an agent file (starts with agent-)
 */
export function isAgentFile(filename: string): boolean {
  if (!filename.endsWith(".jsonl")) return false;
  return filename.startsWith(AGENT_PREFIX);
}

/**
 * Get the display name from a project path
 * Returns the last path component
 */
export function getProjectDisplayName(projectPath: string): string {
  const decoded = decodeProjectPath(projectPath);
  const parts = decoded.split("/").filter(Boolean);
  return parts[parts.length - 1] || projectPath;
}

/**
 * Create empty tool call summary
 */
function createEmptyToolCallSummary(): ToolCallSummary {
  return {
    read: 0,
    edit: 0,
    bash: 0,
    web: 0,
    agent: 0,
    other: 0,
  };
}

/**
 * Calculate tool call summary from messages
 */
function calculateToolCallSummary(messages: Message[]): ToolCallSummary {
  const summary = createEmptyToolCallSummary();

  for (const message of messages) {
    for (const toolCall of message.toolCalls) {
      switch (toolCall.category) {
        case "read":
          summary.read++;
          break;
        case "write":
          summary.edit++;
          break;
        case "bash":
          summary.bash++;
          break;
        case "web":
          summary.web++;
          break;
        case "agent":
          summary.agent++;
          break;
        default:
          summary.other++;
      }
    }
  }

  return summary;
}

/**
 * Extract first user prompt from messages
 */
function extractFirstPrompt(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.type === "user" && m.textContent);
  if (!firstUserMessage) return "";

  const text = firstUserMessage.textContent;
  // Truncate to ~100 chars for display
  if (text.length > 100) {
    return text.slice(0, 100) + "...";
  }
  return text;
}

/**
 * Extract git branch from messages
 */
function extractGitBranch(messages: Message[]): string | null {
  // Look through raw messages for gitBranch field
  // Since we transform messages, we'd need to keep this info
  // For now, return null - we can enhance this later
  return null;
}

// =============================================================================
// File Operations
// =============================================================================

/**
 * Read new content from a file starting at a position
 */
async function readFileFromPosition(
  filePath: string,
  position: number
): Promise<{ content: string; newPosition: number }> {
  try {
    const file = Bun.file(filePath);
    const size = file.size;

    if (position >= size) {
      return { content: "", newPosition: position };
    }

    // Read the new content
    const content = await file.text();
    const newContent = content.slice(position);

    return { content: newContent, newPosition: size };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return { content: "", newPosition: position };
  }
}

/**
 * Check if a message has a valid date
 */
function isValidMessage(message: Message): boolean {
  return (
    message.timestamp instanceof Date &&
    !isNaN(message.timestamp.getTime()) &&
    message.uuid !== undefined
  );
}

/**
 * Read entire file and parse messages
 */
async function readAndParseFile(filePath: string): Promise<Message[]> {
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) return [];

    const content = await file.text();
    const rawMessages = parseJsonlFile(content);
    const messages = rawMessages.map(transformMessage);
    // Filter out messages with invalid dates (e.g., summary messages without timestamps)
    return messages.filter(isValidMessage);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

/**
 * List all project directories
 */
async function listProjectDirectories(): Promise<string[]> {
  try {
    const entries = await Array.fromAsync(
      new Bun.Glob("*").scan({
        cwd: CLAUDE_PROJECTS_DIR,
        onlyFiles: false,
      })
    );

    // Filter to only directories (project paths start with -)
    return entries.filter((e) => e.startsWith("-"));
  } catch (error) {
    console.error("Error listing project directories:", error);
    return [];
  }
}

/**
 * List all JSONL files in a project directory
 */
async function listSessionFiles(projectDir: string): Promise<string[]> {
  try {
    const fullPath = join(CLAUDE_PROJECTS_DIR, projectDir);
    const entries = await Array.fromAsync(
      new Bun.Glob("*.jsonl").scan({
        cwd: fullPath,
        onlyFiles: true,
      })
    );
    return entries;
  } catch (error) {
    console.error(`Error listing session files in ${projectDir}:`, error);
    return [];
  }
}

// =============================================================================
// Watcher Implementation
// =============================================================================

/**
 * Create a file watcher for Claude Code sessions
 */
export function createWatcher(events: WatcherEvents): Watcher {
  // Track file states for incremental reading
  const fileStates = new Map<string, FileState>();

  // Track watchers for cleanup
  const watchers: FSWatcher[] = [];

  // Debounce timers for file changes
  const debounceTimers = new Map<string, Timer>();

  /**
   * Handle file change event
   */
  async function handleFileChange(
    projectPath: string,
    filename: string,
    eventType: "rename" | "change"
  ) {
    if (!filename) return;

    // Only process JSONL files
    if (!filename.endsWith(".jsonl")) return;

    // Check if it's a session or agent file
    const isSession = isSessionFile(filename);
    const isAgent = isAgentFile(filename);

    if (!isSession && !isAgent) return;

    const sessionId = extractSessionId(filename);
    const filePath = join(CLAUDE_PROJECTS_DIR, projectPath, filename);
    const stateKey = `${projectPath}:${sessionId}`;

    // Debounce rapid changes
    const existingTimer = debounceTimers.get(stateKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    debounceTimers.set(
      stateKey,
      setTimeout(async () => {
        debounceTimers.delete(stateKey);

        // Check if file exists
        const file = Bun.file(filePath);
        const exists = await file.exists();

        if (!exists) {
          // File was deleted
          if (fileStates.has(stateKey)) {
            fileStates.delete(stateKey);
            events.onSessionRemoved(projectPath, sessionId);
          }
          return;
        }

        const currentState = fileStates.get(stateKey);

        if (!currentState) {
          // New file detected
          fileStates.set(stateKey, {
            path: filePath,
            position: 0,
            sessionId,
            projectPath,
            isAgent,
          });

          events.onNewSession(projectPath, sessionId, isAgent);

          // Read initial content
          const messages = await readAndParseFile(filePath);
          if (messages.length > 0) {
            events.onSessionUpdate(projectPath, sessionId, messages);
          }

          // Update position
          const fileSize = file.size;
          const state = fileStates.get(stateKey);
          if (state) {
            state.position = fileSize;
          }
        } else {
          // Existing file changed - read new content
          const { content, newPosition } = await readFileFromPosition(
            filePath,
            currentState.position
          );

          if (content) {
            const rawMessages = parseJsonlFile(content);
            const messages = rawMessages.map(transformMessage).filter(isValidMessage);

            if (messages.length > 0) {
              events.onSessionUpdate(projectPath, sessionId, messages);
            }
          }

          currentState.position = newPosition;
        }
      }, DEBOUNCE_MS)
    );
  }

  /**
   * Start watching a project directory
   */
  function watchProjectDirectory(projectPath: string) {
    const fullPath = join(CLAUDE_PROJECTS_DIR, projectPath);

    try {
      const watcher = watch(fullPath, { persistent: true }, (eventType, filename) => {
        if (filename) {
          handleFileChange(projectPath, filename, eventType as "rename" | "change");
        }
      });

      watcher.on("error", (error) => {
        console.error(`Watcher error for ${projectPath}:`, error);
      });

      watchers.push(watcher);
    } catch (error) {
      console.error(`Failed to watch ${projectPath}:`, error);
    }
  }

  /**
   * Start watching the main projects directory for new projects
   */
  function watchProjectsRoot() {
    try {
      const watcher = watch(CLAUDE_PROJECTS_DIR, { persistent: true }, async (eventType, filename) => {
        if (!filename || !filename.startsWith("-")) return;

        // New project directory created
        const fullPath = join(CLAUDE_PROJECTS_DIR, filename);
        try {
          const stat = await Bun.file(fullPath).exists();
          // This actually checks if it's a file, not directory
          // We need a different approach for directories
        } catch {
          // Ignore errors
        }

        // Start watching the new project directory
        watchProjectDirectory(filename);
      });

      watcher.on("error", (error) => {
        console.error("Root watcher error:", error);
      });

      watchers.push(watcher);
    } catch (error) {
      console.error("Failed to watch projects root:", error);
    }
  }

  /**
   * Build session from messages
   */
  function buildSession(
    sessionId: string,
    projectPath: string,
    isAgent: boolean,
    messages: Message[]
  ): Session {
    const now = new Date();
    const startTime = messages.length > 0 ? messages[0].timestamp : now;
    const lastActivity = messages.length > 0 ? messages[messages.length - 1].timestamp : now;

    // Consider a session "active" if it had activity in the last 5 minutes
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const isActive = lastActivity > fiveMinutesAgo;

    return {
      id: sessionId,
      projectPath,
      isAgent,
      parentId: null, // Would need to parse from agent relationships
      agentId: isAgent ? sessionId : null,
      messages,
      isActive,
      startTime,
      lastActivity,
      firstPrompt: extractFirstPrompt(messages),
      gitBranch: extractGitBranch(messages),
      stats: {
        messageCount: messages.length,
        toolCalls: calculateToolCallSummary(messages),
      },
    };
  }

  /**
   * Build project from sessions
   */
  function buildProject(projectPath: string, sessions: Session[]): Project {
    const lastActivity =
      sessions.length > 0
        ? new Date(Math.max(...sessions.map((s) => s.lastActivity.getTime())))
        : new Date();

    return {
      path: projectPath,
      displayName: getProjectDisplayName(projectPath),
      sessions,
      lastActivity,
      isPinned: false,
      isExpanded: false,
    };
  }

  return {
    /**
     * Start watching for file changes
     */
    start() {
      console.log(`Starting watcher for ${CLAUDE_PROJECTS_DIR}`);

      // Watch the root projects directory
      watchProjectsRoot();

      // Watch each existing project directory
      listProjectDirectories().then((projectDirs) => {
        for (const projectDir of projectDirs) {
          watchProjectDirectory(projectDir);
        }
        console.log(`Watching ${projectDirs.length} project directories`);
      });
    },

    /**
     * Stop all watchers
     */
    stop() {
      console.log("Stopping watcher");

      // Clear all debounce timers
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();

      // Close all watchers
      for (const watcher of watchers) {
        watcher.close();
      }
      watchers.length = 0;

      // Clear file states
      fileStates.clear();
    },

    /**
     * Get initial state of all projects and sessions
     */
    async getInitialState(): Promise<Project[]> {
      const projects: Project[] = [];
      const projectDirs = await listProjectDirectories();

      for (const projectDir of projectDirs) {
        const sessionFiles = await listSessionFiles(projectDir);
        const sessions: Session[] = [];

        for (const filename of sessionFiles) {
          const isSession = isSessionFile(filename);
          const isAgent = isAgentFile(filename);

          if (!isSession && !isAgent) continue;

          const sessionId = extractSessionId(filename);
          const filePath = join(CLAUDE_PROJECTS_DIR, projectDir, filename);

          // Read and parse the file
          const messages = await readAndParseFile(filePath);

          // Build session object
          const session = buildSession(sessionId, projectDir, isAgent, messages);
          sessions.push(session);

          // Initialize file state for incremental updates
          const stateKey = `${projectDir}:${sessionId}`;
          const file = Bun.file(filePath);
          fileStates.set(stateKey, {
            path: filePath,
            position: file.size,
            sessionId,
            projectPath: projectDir,
            isAgent,
          });
        }

        // Sort sessions by last activity (most recent first)
        sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

        // Build project
        const project = buildProject(projectDir, sessions);
        projects.push(project);
      }

      // Sort projects by last activity (most recent first)
      projects.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

      return projects;
    },
  };
}

// =============================================================================
// Utility Exports
// =============================================================================

export { CLAUDE_PROJECTS_DIR };
