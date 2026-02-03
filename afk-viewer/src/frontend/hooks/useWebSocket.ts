import { useState, useEffect, useRef, useCallback } from "react";
import type {
  Project,
  ProjectSummary,
  Session,
  SessionSummary,
  Message,
  WSMessage,
  WSClientMessage,
} from "../../types";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of the useWebSocket hook
 */
export interface UseWebSocketResult {
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
  /** Map of project paths to project data */
  projects: Map<string, Project>;
  /** Whether initial data has been loaded */
  isLoading: boolean;
  /** Error message if connection fails */
  error: string | null;
  /** Send a subscribe message for a session */
  subscribe: (sessionId: string) => void;
  /** Send an unsubscribe message for a session */
  unsubscribe: (sessionId: string) => void;
  /** Request messages for a session */
  requestMessages: (sessionId: string, projectPath: string) => void;
}

/**
 * Options for the useWebSocket hook
 */
export interface UseWebSocketOptions {
  /** WebSocket URL (default: ws://localhost:3333) */
  url?: string;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base reconnection delay in ms (default: 1000) */
  baseReconnectDelay?: number;
  /** Maximum reconnection delay in ms (default: 30000) */
  maxReconnectDelay?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_WS_URL = "ws://localhost:3333";
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_BASE_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_DELAY = 30000;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse Date strings in received JSON objects
 */
function reviveDates<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Check if string is an ISO date
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (isoDatePattern.test(obj)) {
      return new Date(obj) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(reviveDates) as unknown as T;
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = reviveDates(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * Parse a WebSocket message with date revival
 */
function parseMessage(data: string): WSMessage {
  const parsed = JSON.parse(data);
  return reviveDates(parsed) as WSMessage;
}

/**
 * Convert SessionSummary to Session (with empty messages array)
 */
function sessionSummaryToSession(summary: SessionSummary): Session {
  return {
    ...summary,
    messages: [],
  };
}

/**
 * Convert ProjectSummary to Project (with sessions having empty messages)
 */
function projectSummaryToProject(summary: ProjectSummary): Project {
  return {
    ...summary,
    sessions: summary.sessions.map(sessionSummaryToSession),
  };
}

/**
 * Convert Project array to Map keyed by path
 */
function projectsArrayToMap(projects: Project[]): Map<string, Project> {
  const map = new Map<string, Project>();
  for (const project of projects) {
    map.set(project.path, project);
  }
  return map;
}

/**
 * Convert ProjectSummary array to Map keyed by path
 */
function projectSummariesToMap(summaries: ProjectSummary[]): Map<string, Project> {
  const map = new Map<string, Project>();
  for (const summary of summaries) {
    map.set(summary.path, projectSummaryToProject(summary));
  }
  return map;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * React hook for managing WebSocket connection to the AFK Viewer server.
 * Handles connection, reconnection with exponential backoff, and message routing.
 *
 * @param options - Configuration options for the WebSocket connection
 * @returns WebSocket state and control functions
 *
 * @example
 * ```tsx
 * const { isConnected, projects, isLoading, error, subscribe } = useWebSocket();
 *
 * useEffect(() => {
 *   if (activeSessionId) {
 *     subscribe(activeSessionId);
 *   }
 * }, [activeSessionId, subscribe]);
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketResult {
  const {
    url = DEFAULT_WS_URL,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
    baseReconnectDelay = DEFAULT_BASE_RECONNECT_DELAY,
    maxReconnectDelay = DEFAULT_MAX_RECONNECT_DELAY,
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [projects, setProjects] = useState<Map<string, Project>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for reconnection logic
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef = useRef(false);

  /**
   * Calculate reconnection delay with exponential backoff
   */
  const getReconnectDelay = useCallback((): number => {
    const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptRef.current);
    return Math.min(delay, maxReconnectDelay);
  }, [baseReconnectDelay, maxReconnectDelay]);

  /**
   * Send a message to the server
   */
  const sendMessage = useCallback((message: WSClientMessage): void => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  /**
   * Subscribe to a session for updates
   */
  const subscribe = useCallback((sessionId: string): void => {
    sendMessage({ type: "subscribe", sessionId });
  }, [sendMessage]);

  /**
   * Unsubscribe from a session
   */
  const unsubscribe = useCallback((sessionId: string): void => {
    sendMessage({ type: "unsubscribe", sessionId });
  }, [sendMessage]);

  /**
   * Request messages for a session
   */
  const requestMessages = useCallback((sessionId: string, projectPath: string): void => {
    sendMessage({ type: "get_messages", sessionId, projectPath });
  }, [sendMessage]);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((event: MessageEvent): void => {
    try {
      const message = parseMessage(event.data);

      switch (message.type) {
        case "initial_state": {
          // Set all projects from initial state (sessions have empty messages)
          setProjects(projectSummariesToMap(message.projects));
          setIsLoading(false);
          setError(null);
          break;
        }

        case "session_messages": {
          // Full messages received for a session
          setProjects((prev) => {
            const project = prev.get(message.projectPath);
            if (!project) {
              return prev;
            }

            const updatedSessions = project.sessions.map((session) => {
              if (session.id === message.sessionId) {
                return {
                  ...session,
                  messages: message.messages,
                };
              }
              return session;
            });

            const newMap = new Map(prev);
            newMap.set(message.projectPath, {
              ...project,
              sessions: updatedSessions,
            });
            return newMap;
          });
          break;
        }

        case "session_update": {
          // Update specific session's messages
          setProjects((prev) => {
            const project = prev.get(message.projectPath);
            if (!project) {
              return prev;
            }

            const updatedSessions = project.sessions.map((session) => {
              if (session.id === message.sessionId) {
                // Merge new messages with existing ones
                const existingIds = new Set(session.messages.map((m) => m.uuid));
                const newMessages = message.messages.filter((m) => !existingIds.has(m.uuid));

                return {
                  ...session,
                  messages: [...session.messages, ...newMessages],
                  lastActivity: new Date(),
                  stats: {
                    ...session.stats,
                    messageCount: session.messages.length + newMessages.length,
                  },
                };
              }
              return session;
            });

            const newMap = new Map(prev);
            newMap.set(message.projectPath, {
              ...project,
              sessions: updatedSessions,
              lastActivity: new Date(),
            });
            return newMap;
          });
          break;
        }

        case "new_session": {
          // Add new session to project
          setProjects((prev) => {
            const project = prev.get(message.projectPath);
            const newMap = new Map(prev);

            if (project) {
              // Add session to existing project
              newMap.set(message.projectPath, {
                ...project,
                sessions: [...project.sessions, message.session],
                lastActivity: new Date(),
              });
            } else {
              // Create new project with this session
              const displayName = message.projectPath.split("/").pop() || message.projectPath;
              newMap.set(message.projectPath, {
                path: message.projectPath,
                displayName,
                sessions: [message.session],
                lastActivity: new Date(),
                isPinned: false,
                isExpanded: true,
              });
            }

            return newMap;
          });
          break;
        }

        case "session_complete": {
          // Mark session as inactive
          setProjects((prev) => {
            const project = prev.get(message.projectPath);
            if (!project) {
              return prev;
            }

            const updatedSessions = project.sessions.map((session) => {
              if (session.id === message.sessionId) {
                return {
                  ...session,
                  isActive: false,
                };
              }
              return session;
            });

            const newMap = new Map(prev);
            newMap.set(message.projectPath, {
              ...project,
              sessions: updatedSessions,
            });
            return newMap;
          });
          break;
        }

        case "connection_status": {
          // Update connection status
          setIsConnected(message.connected);
          break;
        }

        default: {
          // Handle unknown message types gracefully
          console.warn("Unknown WebSocket message type:", (message as { type: string }).type);
        }
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  }, []);

  /**
   * Connect to the WebSocket server
   */
  const connect = useCallback((): void => {
    if (isUnmountedRef.current) {
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = (): void => {
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }

        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
        console.log("WebSocket connected to", url);
      };

      ws.onclose = (event): void => {
        if (isUnmountedRef.current) {
          return;
        }

        setIsConnected(false);
        wsRef.current = null;

        // Don't reconnect if the close was clean (code 1000) and intentional
        if (event.code === 1000 && event.wasClean) {
          return;
        }

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          const delay = getReconnectDelay();
          console.log(
            `WebSocket disconnected. Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current++;
            connect();
          }, delay);
        } else {
          setError(`Connection lost. Failed to reconnect after ${maxReconnectAttempts} attempts.`);
          setIsLoading(false);
        }
      };

      ws.onerror = (event): void => {
        console.error("WebSocket error:", event);
        // The onclose handler will handle reconnection
      };

      ws.onmessage = handleMessage;

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setError("Failed to connect to server");
      setIsLoading(false);
    }
  }, [url, maxReconnectAttempts, getReconnectDelay, handleMessage]);

  // Connect on mount and cleanup on unmount
  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    projects,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestMessages,
  };
}

export default useWebSocket;
