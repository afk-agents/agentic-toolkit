// AFK Viewer Server - Bun.serve() with WebSocket support
import index from "../frontend/index.html";
import { createWatcher } from "./watcher";
import {
  createWebSocketManager,
  createWSClientData,
  handleWebSocketOpen,
  handleWebSocketMessage,
  handleWebSocketClose,
  type WSClientData,
  type GetSessionMessages,
} from "./websocket";
import type { Project, Session, Message, ToolCallSummary } from "../types";

// =============================================================================
// Configuration
// =============================================================================

const PORT = 3333;

// =============================================================================
// State Management
// =============================================================================

// Track all projects and their sessions
const projectsMap = new Map<string, Project>();

// Track sessions by ID for quick lookup
const sessionsMap = new Map<string, Session>();

// WebSocket manager for broadcasting updates
const wsManager = createWebSocketManager();

// Function to get messages for a session (used by WebSocket handler)
const getSessionMessages: GetSessionMessages = (sessionId: string) => {
  const session = sessionsMap.get(sessionId);
  return session?.messages ?? null;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create an empty tool call summary
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
 * Get the display name from a project path
 */
function getProjectDisplayName(projectPath: string): string {
  const decoded = projectPath.replace(/^-/, "/").replace(/-/g, "/");
  const parts = decoded.split("/").filter(Boolean);
  return parts[parts.length - 1] || projectPath;
}

/**
 * Get all projects as an array
 */
function getProjectsArray(): Project[] {
  return Array.from(projectsMap.values()).sort(
    (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
  );
}

// =============================================================================
// File Watcher Setup
// =============================================================================

const watcher = createWatcher({
  onNewSession(projectPath: string, sessionId: string, isAgent: boolean): void {
    console.log(`New session: ${sessionId} in ${projectPath} (agent: ${isAgent})`);

    // Get or create project
    let project = projectsMap.get(projectPath);
    if (!project) {
      project = {
        path: projectPath,
        displayName: getProjectDisplayName(projectPath),
        sessions: [],
        lastActivity: new Date(),
        isPinned: false,
        isExpanded: false,
      };
      projectsMap.set(projectPath, project);
    }

    // Create new session
    const session: Session = {
      id: sessionId,
      projectPath,
      isAgent,
      parentId: null,
      agentId: isAgent ? sessionId : null,
      messages: [],
      isActive: true,
      startTime: new Date(),
      lastActivity: new Date(),
      firstPrompt: "",
      gitBranch: null,
      stats: {
        messageCount: 0,
        toolCalls: createEmptyToolCallSummary(),
      },
    };

    // Add session to project
    project.sessions.push(session);
    project.lastActivity = new Date();

    // Track session
    sessionsMap.set(sessionId, session);

    // Broadcast new session event
    wsManager.broadcastNewSession(projectPath, sessionId, session, isAgent);
  },

  onSessionUpdate(projectPath: string, sessionId: string, newMessages: Message[]): void {
    console.log(`Session update: ${sessionId} - ${newMessages.length} new messages`);

    // Get session
    const session = sessionsMap.get(sessionId);
    if (!session) {
      console.warn(`Session not found: ${sessionId}`);
      return;
    }

    // Add new messages
    session.messages.push(...newMessages);
    session.lastActivity = new Date();
    session.stats.messageCount = session.messages.length;

    // Update first prompt if not set
    if (!session.firstPrompt && newMessages.length > 0) {
      const firstUserMessage = newMessages.find((m) => m.type === "user" && m.textContent);
      if (firstUserMessage) {
        const text = firstUserMessage.textContent;
        session.firstPrompt = text.length > 100 ? text.slice(0, 100) + "..." : text;
      }
    }

    // Update tool call stats
    for (const message of newMessages) {
      for (const toolCall of message.toolCalls) {
        switch (toolCall.category) {
          case "read":
            session.stats.toolCalls.read++;
            break;
          case "write":
            session.stats.toolCalls.edit++;
            break;
          case "bash":
            session.stats.toolCalls.bash++;
            break;
          case "web":
            session.stats.toolCalls.web++;
            break;
          case "agent":
            session.stats.toolCalls.agent++;
            break;
          default:
            session.stats.toolCalls.other++;
        }
      }
    }

    // Update project last activity
    const project = projectsMap.get(projectPath);
    if (project) {
      project.lastActivity = new Date();
    }

    // Broadcast update
    wsManager.broadcastSessionUpdate(projectPath, sessionId, newMessages);
  },

  onSessionRemoved(projectPath: string, sessionId: string): void {
    console.log(`Session removed: ${sessionId}`);

    // Remove from sessions map
    sessionsMap.delete(sessionId);

    // Remove from project
    const project = projectsMap.get(projectPath);
    if (project) {
      project.sessions = project.sessions.filter((s) => s.id !== sessionId);
    }

    // Broadcast completion (session file removed means it's complete)
    wsManager.broadcastSessionComplete(projectPath, sessionId);
  },
});

// =============================================================================
// Server Setup
// =============================================================================

const server = Bun.serve<WSClientData>({
  port: PORT,
  routes: {
    "/": index,
  },
  websocket: {
    open(ws) {
      handleWebSocketOpen(ws, wsManager, getProjectsArray());
    },
    message(ws, message) {
      handleWebSocketMessage(ws, message, getSessionMessages);
    },
    close(ws) {
      handleWebSocketClose(ws, wsManager);
    },
  },
  fetch(req, server) {
    // Handle WebSocket upgrade requests
    const url = new URL(req.url);

    if (url.pathname === "/ws" || req.headers.get("upgrade") === "websocket") {
      const upgraded = server.upgrade(req, {
        data: createWSClientData(),
      });

      if (upgraded) {
        return undefined;
      }

      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Let routes handle the request
    return undefined;
  },
  development: {
    hmr: true,
    console: true,
  },
});

// =============================================================================
// Initialization
// =============================================================================

async function initialize() {
  console.log(`AFK Viewer running at http://localhost:${server.port}`);
  console.log(`WebSocket endpoint: ws://localhost:${server.port}`);

  // Load initial state
  console.log("Loading initial state...");
  const projects = await watcher.getInitialState();

  // Populate maps
  for (const project of projects) {
    projectsMap.set(project.path, project);
    for (const session of project.sessions) {
      sessionsMap.set(session.id, session);
    }
  }

  console.log(`Loaded ${projects.length} projects, ${sessionsMap.size} sessions`);

  // Start watching for changes
  watcher.start();
}

// Start the server
initialize().catch(console.error);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  watcher.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down...");
  watcher.stop();
  process.exit(0);
});
