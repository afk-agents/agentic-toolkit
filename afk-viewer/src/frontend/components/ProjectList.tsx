import { useState, useMemo } from "react";
import type { Project, Session } from "../../types";
import { SessionItem } from "./SessionItem";
import { useLocalStorage } from "../hooks/useLocalStorage";

interface ProjectListProps {
  projects: Project[];
  pinnedProjects: string[];
  archivedProjects: string[];
  onPinProject: (path: string) => void;
  onUnpinProject: (path: string) => void;
  onArchiveProject: (path: string) => void;
  onUnarchiveProject: (path: string) => void;
  onSelectSession: (projectPath: string, sessionId: string) => void;
  selectedSessionId: string | null;
}

interface ProjectItemProps {
  project: Project;
  isPinned: boolean;
  isArchived: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onSelectSession: (sessionId: string) => void;
  selectedSessionId: string | null;
}

/**
 * Check if a project has any active sessions
 */
function hasActiveSessions(project: Project): boolean {
  return project.sessions.some((session) => session.isActive);
}

/**
 * Check if a project has recent activity (within last 24 hours)
 */
function hasRecentActivity(project: Project): boolean {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return project.lastActivity > oneDayAgo;
}

/**
 * Sort sessions within a project by last activity (most recent first)
 */
function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    // Active sessions first
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    // Then by last activity
    return b.lastActivity.getTime() - a.lastActivity.getTime();
  });
}

function ProjectItem({
  project,
  isPinned,
  isArchived,
  isExpanded,
  onToggleExpand,
  onPin,
  onUnpin,
  onArchive,
  onUnarchive,
  onSelectSession,
  selectedSessionId,
}: ProjectItemProps) {
  const hasActive = hasActiveSessions(project);
  const sortedSessions = sortSessions(project.sessions);

  const classNames = [
    "project-item",
    isPinned && "pinned",
    isArchived && "archived",
    hasActive && "has-active",
    isExpanded && "expanded",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames}>
      <div className="project-header" onClick={onToggleExpand}>
        <span className={`project-expand-icon ${isExpanded ? "expanded" : ""}`}>&#9656;</span>
        <span className="project-name" title={project.path}>
          {project.displayName}
        </span>
        <span className="project-session-count">({project.sessions.length})</span>
        {hasActive && <span className="project-active-dot" title="Active sessions" />}
        {!isArchived && (
          <button
            className={`project-pin-btn ${isPinned ? "pinned" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              isPinned ? onUnpin() : onPin();
            }}
            title={isPinned ? "Unpin project" : "Pin project"}
          >
            {isPinned ? "*" : "o"}
          </button>
        )}
        <button
          className="project-archive-btn"
          onClick={(e) => {
            e.stopPropagation();
            isArchived ? onUnarchive() : onArchive();
          }}
          title={isArchived ? "Unarchive project" : "Archive project"}
        >
          {isArchived ? "+" : "x"}
        </button>
      </div>
      {isExpanded && (
        <div className="project-sessions">
          {sortedSessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isSelected={session.id === selectedSessionId}
              onClick={() => onSelectSession(session.id)}
            />
          ))}
          {sortedSessions.length === 0 && (
            <div className="no-sessions">No sessions</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectList({
  projects,
  pinnedProjects,
  archivedProjects,
  onPinProject,
  onUnpinProject,
  onArchiveProject,
  onUnarchiveProject,
  onSelectSession,
  selectedSessionId,
}: ProjectListProps) {
  // Track user's explicit collapse/expand choices (persisted to localStorage)
  // Value: true = explicitly expanded, false = explicitly collapsed
  const [expandStateOverrides, setExpandStateOverrides] = useLocalStorage<Record<string, boolean>>(
    "afk-viewer-expand-state",
    {}
  );

  // Track whether to show archived projects
  const [showArchived, setShowArchived] = useState(false);

  const archivedSet = useMemo(() => new Set(archivedProjects), [archivedProjects]);

  // Filter out archived projects for main display
  const visibleProjects = useMemo(() => {
    return projects.filter((p) => !archivedSet.has(p.path));
  }, [projects, archivedSet]);

  // Get archived projects list
  const archivedProjectsList = useMemo(() => {
    return projects.filter((p) => archivedSet.has(p.path));
  }, [projects, archivedSet]);

  // Create set of expanded projects for efficient lookup
  // Logic: if user has explicit override, use that; otherwise expand if has active sessions
  const expandedProjects = useMemo(() => {
    const expanded = new Set<string>();
    for (const project of visibleProjects) {
      if (project.path in expandStateOverrides) {
        // User has explicit preference
        if (expandStateOverrides[project.path]) {
          expanded.add(project.path);
        }
      } else {
        // Default: expand projects with active sessions
        if (hasActiveSessions(project)) {
          expanded.add(project.path);
        }
      }
    }
    return expanded;
  }, [visibleProjects, expandStateOverrides]);

  // Organize projects into categories
  const { pinned, active, recent, older } = useMemo(() => {
    const pinnedSet = new Set(pinnedProjects);

    const pinned: Project[] = [];
    const active: Project[] = [];
    const recent: Project[] = [];
    const older: Project[] = [];

    for (const project of visibleProjects) {
      if (pinnedSet.has(project.path)) {
        pinned.push(project);
      } else if (hasActiveSessions(project)) {
        active.push(project);
      } else if (hasRecentActivity(project)) {
        recent.push(project);
      } else {
        older.push(project);
      }
    }

    // Sort each category by last activity
    const sortByActivity = (a: Project, b: Project) =>
      b.lastActivity.getTime() - a.lastActivity.getTime();

    pinned.sort(sortByActivity);
    active.sort(sortByActivity);
    recent.sort(sortByActivity);
    older.sort(sortByActivity);

    return { pinned, active, recent, older };
  }, [visibleProjects, pinnedProjects]);

  const toggleExpand = (path: string) => {
    const isCurrentlyExpanded = expandedProjects.has(path);
    setExpandStateOverrides((prev) => ({
      ...prev,
      [path]: !isCurrentlyExpanded,
    }));
  };

  const renderProjectGroup = (
    title: string,
    projectList: Project[],
    isArchivedGroup: boolean = false
  ) => {
    if (projectList.length === 0) return null;

    return (
      <div className={`project-group ${isArchivedGroup ? "archived-group" : ""}`}>
        <div className="project-group-header">
          <span className="project-group-title">{title}</span>
          <span className="project-group-count">{projectList.length}</span>
        </div>
        <div className="project-group-list">
          {projectList.map((project) => (
            <ProjectItem
              key={project.path}
              project={project}
              isPinned={pinnedProjects.includes(project.path)}
              isArchived={archivedSet.has(project.path)}
              isExpanded={expandedProjects.has(project.path)}
              onToggleExpand={() => toggleExpand(project.path)}
              onPin={() => onPinProject(project.path)}
              onUnpin={() => onUnpinProject(project.path)}
              onArchive={() => onArchiveProject(project.path)}
              onUnarchive={() => onUnarchiveProject(project.path)}
              onSelectSession={(sessionId) => onSelectSession(project.path, sessionId)}
              selectedSessionId={selectedSessionId}
            />
          ))}
        </div>
      </div>
    );
  };

  const totalProjects = projects.length;

  if (totalProjects === 0) {
    return (
      <div className="project-list empty">
        <div className="empty-message">
          <span className="empty-icon">~</span>
          <p>No projects found</p>
          <p className="empty-hint">Waiting for Claude Code sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-list">
      {renderProjectGroup("Pinned", pinned)}
      {renderProjectGroup("Active", active)}
      {renderProjectGroup("Recent", recent)}
      {renderProjectGroup("Older", older)}

      {archivedProjectsList.length > 0 && (
        <div className="archived-toggle">
          <button
            className="archived-toggle-btn"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Hide" : "Show"} archived ({archivedProjectsList.length})
          </button>
        </div>
      )}

      {showArchived && renderProjectGroup("Archived", archivedProjectsList, true)}
    </div>
  );
}

export default ProjectList;
