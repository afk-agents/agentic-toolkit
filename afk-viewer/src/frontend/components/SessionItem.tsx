import type { Session, ToolCallSummary } from "../../types";

interface SessionItemProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Format a timestamp to relative time (e.g., "2m ago", "1h ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Activity indicator icons based on tool usage
 */
function ActivityIndicators({ stats }: { stats: ToolCallSummary }) {
  const indicators: { key: keyof ToolCallSummary; icon: string; title: string }[] = [
    { key: "read", icon: "R", title: "Files read" },
    { key: "edit", icon: "E", title: "Files edited" },
    { key: "bash", icon: "$", title: "Bash commands" },
    { key: "web", icon: "W", title: "Web fetches" },
    { key: "agent", icon: "A", title: "Subagents" },
  ];

  const activeIndicators = indicators.filter((ind) => stats[ind.key] > 0);

  if (activeIndicators.length === 0) return null;

  return (
    <div className="session-indicators">
      {activeIndicators.map(({ key, icon, title }) => (
        <span
          key={key}
          className={`indicator indicator-${key}`}
          title={`${title}: ${stats[key]}`}
        >
          {icon}
        </span>
      ))}
    </div>
  );
}

export function SessionItem({ session, isSelected, onClick }: SessionItemProps) {
  const classNames = [
    "session-item",
    isSelected && "selected",
    session.isActive && "active",
    !session.isActive && "inactive",
    session.isAgent && "is-agent",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} onClick={onClick}>
      <div className="session-header">
        <span className="session-time">{formatRelativeTime(session.lastActivity)}</span>
        <span className="session-message-count">{session.stats.messageCount} msgs</span>
      </div>
      <div className="session-preview">
        {truncateText(session.firstPrompt || "No prompt", 60)}
      </div>
      <ActivityIndicators stats={session.stats.toolCalls} />
    </div>
  );
}

export default SessionItem;
