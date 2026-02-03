import React, { useEffect, useRef, useCallback, useState } from "react";
import type { Session } from "../../types";
import { MessageCard } from "./MessageCard";

interface SessionViewProps {
  session: Session | null;
  onScrollPaused: (paused: boolean) => void;
}

export function SessionView({ session, onScrollPaused }: SessionViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const lastMessageCountRef = useRef(0);

  // Handle scroll events to detect when user scrolls up
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom) {
      setIsAutoScroll(true);
      setShowJumpButton(false);
      onScrollPaused(false);
    } else {
      setIsAutoScroll(false);
      setShowJumpButton(true);
      onScrollPaused(true);
    }
  }, [onScrollPaused]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!session) return;

    const messageCount = session.messages.length;
    const hasNewMessages = messageCount > lastMessageCountRef.current;
    lastMessageCountRef.current = messageCount;

    if (hasNewMessages && isAutoScroll && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [session?.messages.length, isAutoScroll]);

  // Scroll to bottom on initial load or session change
  useEffect(() => {
    if (session && containerRef.current) {
      // Reset state for new session
      setIsAutoScroll(true);
      setShowJumpButton(false);
      lastMessageCountRef.current = session.messages.length;

      // Scroll to bottom immediately
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [session?.id]);

  const jumpToLatest = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
      setIsAutoScroll(true);
      setShowJumpButton(false);
      onScrollPaused(false);
    }
  }, [onScrollPaused]);

  // Empty state when no session selected
  if (!session) {
    return (
      <div className="session-view session-view--empty">
        <div className="session-view__empty-state">
          <div className="session-view__empty-icon">📋</div>
          <h3 className="session-view__empty-title">No Session Selected</h3>
          <p className="session-view__empty-text">
            Select a session from the left panel to view its transcript
          </p>
        </div>
      </div>
    );
  }

  // Filter out non-displayable message types
  const displayMessages = session.messages.filter(
    (msg) => msg.type === "user" || msg.type === "assistant"
  );

  return (
    <div className="session-view">
      {/* Session info header */}
      <div className="session-view__info">
        <div className="session-view__info-row">
          <span className="session-view__session-id">
            {session.isAgent ? "🤖 Agent" : "📝 Session"}: {session.id.slice(0, 8)}...
          </span>
          {session.gitBranch && (
            <span className="session-view__branch">
              🌿 {session.gitBranch}
            </span>
          )}
          <span className={`session-view__status ${session.isActive ? "session-view__status--active" : ""}`}>
            {session.isActive ? "● Active" : "○ Completed"}
          </span>
        </div>
        <div className="session-view__stats">
          <span>{session.stats.messageCount} messages</span>
          <span>📖 {session.stats.toolCalls.read}</span>
          <span>✏️ {session.stats.toolCalls.edit}</span>
          <span>🖥️ {session.stats.toolCalls.bash}</span>
          <span>🌐 {session.stats.toolCalls.web}</span>
          <span>🤖 {session.stats.toolCalls.agent}</span>
        </div>
      </div>

      {/* Messages container */}
      <div
        ref={containerRef}
        className="session-view__messages"
        onScroll={handleScroll}
      >
        {displayMessages.length === 0 ? (
          <div className="session-view__no-messages">
            <p>No messages in this session yet</p>
          </div>
        ) : (
          displayMessages.map((message) => (
            <MessageCard key={message.uuid} message={message} />
          ))
        )}
      </div>

      {/* Jump to latest button */}
      {showJumpButton && (
        <button
          className="session-view__jump-button"
          onClick={jumpToLatest}
          aria-label="Jump to latest message"
        >
          ↓ Jump to latest
        </button>
      )}
    </div>
  );
}

export default SessionView;
