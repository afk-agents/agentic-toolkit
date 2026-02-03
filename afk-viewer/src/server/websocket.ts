// WebSocket handler for real-time updates
import type { ServerWebSocket } from "bun";
import type {
  Message,
  Project,
  ProjectSummary,
  Session,
  SessionSummary,
  WSMessage,
  WSSessionUpdate,
  WSNewSession,
  WSSessionComplete,
  WSInitialState,
  WSSessionMessages,
} from "../types";

// =============================================================================
// Types
// =============================================================================

/**
 * WebSocket client data attached to each connection
 */
export interface WSClientData {
  id: string;
  subscribedSessions: Set<string>;
  connectedAt: Date;
}

/**
 * WebSocket manager interface
 */
export interface WebSocketManager {
  addClient(ws: ServerWebSocket<WSClientData>): void;
  removeClient(ws: ServerWebSocket<WSClientData>): void;
  getClientCount(): number;
  broadcastInitialState(projects: Project[]): void;
  broadcastSessionUpdate(projectPath: string, sessionId: string, messages: Message[]): void;
  broadcastNewSession(projectPath: string, sessionId: string, session: Session, isAgent: boolean): void;
  broadcastSessionComplete(projectPath: string, sessionId: string): void;
}

// =============================================================================
// Client Tracking
// =============================================================================

// Connected clients
const clients = new Set<ServerWebSocket<WSClientData>>();

// Client ID counter
let clientIdCounter = 0;

/**
 * Generate a unique client ID
 */
function generateClientId(): string {
  return `client-${++clientIdCounter}-${Date.now()}`;
}

// =============================================================================
// Message Serialization
// =============================================================================

/**
 * Serialize a WebSocket message to JSON
 * Handles Date serialization for messages
 */
function serializeMessage(message: WSMessage): string {
  return JSON.stringify(message, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  });
}

/**
 * Convert a Session to a SessionSummary (without messages)
 */
function toSessionSummary(session: Session): SessionSummary {
  return {
    id: session.id,
    projectPath: session.projectPath,
    isAgent: session.isAgent,
    parentId: session.parentId,
    agentId: session.agentId,
    isActive: session.isActive,
    startTime: session.startTime,
    lastActivity: session.lastActivity,
    firstPrompt: session.firstPrompt,
    gitBranch: session.gitBranch,
    stats: session.stats,
  };
}

/**
 * Convert a Project to a ProjectSummary (with session summaries, no messages)
 */
function toProjectSummary(project: Project): ProjectSummary {
  return {
    path: project.path,
    displayName: project.displayName,
    sessions: project.sessions.map(toSessionSummary),
    lastActivity: project.lastActivity,
    isPinned: project.isPinned,
    isExpanded: project.isExpanded,
  };
}

// =============================================================================
// Broadcast Functions
// =============================================================================

/**
 * Broadcast a message to all connected clients
 */
function broadcast(message: WSMessage): void {
  const serialized = serializeMessage(message);

  for (const client of clients) {
    try {
      client.send(serialized);
    } catch (error) {
      console.error(`Error sending to client ${client.data.id}:`, error);
      // Client will be removed on close event
    }
  }
}

/**
 * Send a message to a specific client
 */
function sendToClient(ws: ServerWebSocket<WSClientData>, message: WSMessage): void {
  try {
    ws.send(serializeMessage(message));
  } catch (error) {
    console.error(`Error sending to client ${ws.data.id}:`, error);
  }
}

// =============================================================================
// WebSocket Manager
// =============================================================================

/**
 * Create a WebSocket manager for handling client connections and broadcasts
 */
export function createWebSocketManager(): WebSocketManager {
  return {
    /**
     * Add a new client connection
     */
    addClient(ws: ServerWebSocket<WSClientData>): void {
      clients.add(ws);
      console.log(`Client connected: ${ws.data.id} (${clients.size} total)`);
    },

    /**
     * Remove a client connection
     */
    removeClient(ws: ServerWebSocket<WSClientData>): void {
      clients.delete(ws);
      console.log(`Client disconnected: ${ws.data.id} (${clients.size} remaining)`);
    },

    /**
     * Get the number of connected clients
     */
    getClientCount(): number {
      return clients.size;
    },

    /**
     * Broadcast initial state to all clients
     */
    broadcastInitialState(projects: Project[]): void {
      const message: WSInitialState = {
        type: "initial_state",
        projects,
      };
      broadcast(message);
    },

    /**
     * Broadcast session update with new messages
     */
    broadcastSessionUpdate(projectPath: string, sessionId: string, messages: Message[]): void {
      const message: WSSessionUpdate = {
        type: "session_update",
        projectPath,
        sessionId,
        messages,
      };
      broadcast(message);
    },

    /**
     * Broadcast new session created
     */
    broadcastNewSession(projectPath: string, sessionId: string, session: Session, isAgent: boolean): void {
      const message: WSNewSession = {
        type: "new_session",
        projectPath,
        sessionId,
        session,
        isAgent,
      };
      broadcast(message);
    },

    /**
     * Broadcast session completion
     */
    broadcastSessionComplete(projectPath: string, sessionId: string): void {
      const message: WSSessionComplete = {
        type: "session_complete",
        projectPath,
        sessionId,
      };
      broadcast(message);
    },
  };
}

// =============================================================================
// WebSocket Handlers
// =============================================================================

/**
 * Handle WebSocket open event
 */
export function handleWebSocketOpen(
  ws: ServerWebSocket<WSClientData>,
  manager: WebSocketManager,
  initialProjects: Project[]
): void {
  manager.addClient(ws);

  // Send initial state to the new client (without message content to avoid OOM)
  const projectSummaries = initialProjects.map(toProjectSummary);
  const message: WSInitialState = {
    type: "initial_state",
    projects: projectSummaries,
  };
  sendToClient(ws, message);
}

/**
 * Callback to get session messages
 */
export type GetSessionMessages = (sessionId: string) => Message[] | null;

/**
 * Handle WebSocket message event
 */
export function handleWebSocketMessage(
  ws: ServerWebSocket<WSClientData>,
  message: string | Buffer,
  getSessionMessages?: GetSessionMessages
): void {
  try {
    const data = JSON.parse(message.toString());

    switch (data.type) {
      case "subscribe":
        // Client wants to subscribe to a specific session
        if (data.sessionId) {
          ws.data.subscribedSessions.add(data.sessionId);
          console.log(`Client ${ws.data.id} subscribed to session ${data.sessionId}`);
        }
        break;

      case "unsubscribe":
        // Client wants to unsubscribe from a session
        if (data.sessionId) {
          ws.data.subscribedSessions.delete(data.sessionId);
          console.log(`Client ${ws.data.id} unsubscribed from session ${data.sessionId}`);
        }
        break;

      case "get_messages":
        // Client wants to fetch messages for a session
        if (data.sessionId && data.projectPath && getSessionMessages) {
          const messages = getSessionMessages(data.sessionId);
          if (messages) {
            const response: WSSessionMessages = {
              type: "session_messages",
              projectPath: data.projectPath,
              sessionId: data.sessionId,
              messages,
            };
            sendToClient(ws, response);
            console.log(`Sent ${messages.length} messages for session ${data.sessionId}`);
          }
        }
        break;

      case "ping":
        // Respond to ping with pong
        ws.send(JSON.stringify({ type: "pong" }));
        break;

      default:
        console.log(`Unknown message type from client ${ws.data.id}:`, data.type);
    }
  } catch (error) {
    console.error(`Error parsing message from client ${ws.data.id}:`, error);
  }
}

/**
 * Handle WebSocket close event
 */
export function handleWebSocketClose(
  ws: ServerWebSocket<WSClientData>,
  manager: WebSocketManager
): void {
  manager.removeClient(ws);
}

/**
 * Create WebSocket data for a new connection
 */
export function createWSClientData(): WSClientData {
  return {
    id: generateClientId(),
    subscribedSessions: new Set(),
    connectedAt: new Date(),
  };
}
