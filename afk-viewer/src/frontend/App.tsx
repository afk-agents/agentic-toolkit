import React, { useState, useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";

// Hooks
import { useWebSocket } from "./hooks/useWebSocket";
import { useLocalStorage } from "./hooks/useLocalStorage";

// Components
import { ProjectList } from "./components/ProjectList";
import { SessionView } from "./components/SessionView";
import { AgentGraph } from "./components/AgentGraph";

// Types
import type { Project, Session } from "../types";

// =============================================================================
// Main App Component
// =============================================================================

function App() {
  // WebSocket connection for real-time data
  const { isConnected, projects, isLoading, error, subscribe, unsubscribe, requestMessages } =
    useWebSocket();

  // Persisted state
  const [pinnedProjects, setPinnedProjects] = useLocalStorage<string[]>(
    "afk-viewer-pinned-projects",
    []
  );
  const [archivedProjects, setArchivedProjects] = useLocalStorage<string[]>(
    "afk-viewer-archived-projects",
    []
  );

  // Local UI state
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(
    null
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [scrollPaused, setScrollPaused] = useState(false);

  // Convert Map to array for ProjectList
  const projectsArray = useMemo((): Project[] => {
    return Array.from(projects.values());
  }, [projects]);

  // Get the selected session
  const selectedSession = useMemo((): Session | null => {
    if (!selectedProjectPath || !selectedSessionId) return null;

    const project = projects.get(selectedProjectPath);
    if (!project) return null;

    return (
      project.sessions.find((session) => session.id === selectedSessionId) ||
      null
    );
  }, [projects, selectedProjectPath, selectedSessionId]);

  // Get all sessions for the selected project (for the agent graph)
  const currentProjectSessions = useMemo((): Session[] => {
    if (!selectedProjectPath) return [];

    const project = projects.get(selectedProjectPath);
    if (!project) return [];

    return project.sessions;
  }, [projects, selectedProjectPath]);

  // Handle session selection
  const handleSelectSession = useCallback(
    (projectPath: string, sessionId: string) => {
      // Unsubscribe from previous session if any
      if (selectedSessionId && selectedSessionId !== sessionId) {
        unsubscribe(selectedSessionId);
      }

      setSelectedProjectPath(projectPath);
      setSelectedSessionId(sessionId);

      // Subscribe to the new session for updates and request its messages
      subscribe(sessionId);
      requestMessages(sessionId, projectPath);
    },
    [selectedSessionId, subscribe, unsubscribe, requestMessages]
  );

  // Handle session selection from the agent graph
  const handleGraphSelectSession = useCallback(
    (sessionId: string) => {
      if (!selectedProjectPath) return;

      // Unsubscribe from previous session if any
      if (selectedSessionId && selectedSessionId !== sessionId) {
        unsubscribe(selectedSessionId);
      }

      setSelectedSessionId(sessionId);
      subscribe(sessionId);
      requestMessages(sessionId, selectedProjectPath);
    },
    [selectedProjectPath, selectedSessionId, subscribe, unsubscribe, requestMessages]
  );

  // Handle pin/unpin project
  const handlePinProject = useCallback(
    (path: string) => {
      setPinnedProjects((prev) => {
        if (prev.includes(path)) return prev;
        return [...prev, path];
      });
    },
    [setPinnedProjects]
  );

  const handleUnpinProject = useCallback(
    (path: string) => {
      setPinnedProjects((prev) => prev.filter((p) => p !== path));
    },
    [setPinnedProjects]
  );

  // Handle archive/unarchive project
  const handleArchiveProject = useCallback(
    (path: string) => {
      setArchivedProjects((prev) => {
        if (prev.includes(path)) return prev;
        return [...prev, path];
      });
      // Also unpin if pinned
      setPinnedProjects((prev) => prev.filter((p) => p !== path));
    },
    [setArchivedProjects, setPinnedProjects]
  );

  const handleUnarchiveProject = useCallback(
    (path: string) => {
      setArchivedProjects((prev) => prev.filter((p) => p !== path));
    },
    [setArchivedProjects]
  );

  // Handle scroll pause callback
  const handleScrollPaused = useCallback((paused: boolean) => {
    setScrollPaused(paused);
  }, []);

  // Render connection status
  const renderConnectionStatus = () => {
    if (isLoading) {
      return (
        <>
          <span className="status-dot status-dot--connecting"></span>
          <span className="status-text">Connecting...</span>
        </>
      );
    }

    if (error) {
      return (
        <>
          <span className="status-dot status-dot--error"></span>
          <span className="status-text" title={error}>
            Error
          </span>
        </>
      );
    }

    if (isConnected) {
      return (
        <>
          <span className="status-dot status-dot--connected"></span>
          <span className="status-text">Connected</span>
        </>
      );
    }

    return (
      <>
        <span className="status-dot status-dot--disconnected"></span>
        <span className="status-text">Disconnected</span>
      </>
    );
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">AFK Viewer</h1>
          <span className="app-subtitle">Claude Code Session Monitor</span>
          <div className="connection-status">{renderConnectionStatus()}</div>
        </header>
        <main className="app-main">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Connecting to server...</p>
          </div>
        </main>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">AFK Viewer</h1>
          <span className="app-subtitle">Claude Code Session Monitor</span>
          <div className="connection-status">{renderConnectionStatus()}</div>
        </header>
        <main className="app-main">
          <div className="error-state">
            <div className="error-icon">!</div>
            <h2>Connection Failed</h2>
            <p>{error}</p>
            <p className="error-hint">
              Make sure the AFK Viewer server is running on port 3333
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">AFK Viewer</h1>
        <span className="app-subtitle">Claude Code Session Monitor</span>
        <div className="connection-status">{renderConnectionStatus()}</div>
      </header>
      <main className="app-main">
        {/* Left Panel - Project List */}
        <div className="panel panel-left">
          <div className="panel-header">
            <h2>Projects</h2>
            <span className="panel-count">{projectsArray.length}</span>
          </div>
          <div className="panel-content">
            <ProjectList
              projects={projectsArray}
              pinnedProjects={pinnedProjects}
              archivedProjects={archivedProjects}
              onPinProject={handlePinProject}
              onUnpinProject={handleUnpinProject}
              onArchiveProject={handleArchiveProject}
              onUnarchiveProject={handleUnarchiveProject}
              onSelectSession={handleSelectSession}
              selectedSessionId={selectedSessionId}
            />
          </div>
        </div>

        {/* Center Panel - Session View */}
        <div className="panel panel-center">
          <div className="panel-header">
            <h2>Session Transcript</h2>
            {scrollPaused && (
              <span className="panel-badge panel-badge--paused">
                Scroll Paused
              </span>
            )}
          </div>
          <div className="panel-content">
            <SessionView
              session={selectedSession}
              onScrollPaused={handleScrollPaused}
            />
          </div>
        </div>

        {/* Right Panel - Agent Graph */}
        <div className="panel panel-right">
          <div className="panel-header">
            <h2>Agent Graph</h2>
            {currentProjectSessions.length > 0 && (
              <span className="panel-count">
                {currentProjectSessions.length}
              </span>
            )}
          </div>
          <div className="panel-content">
            <AgentGraph
              sessions={currentProjectSessions}
              activeSessionId={selectedSessionId}
              onSelectSession={handleGraphSelectSession}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// =============================================================================
// Mount Application
// =============================================================================

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}

export default App;
