import React, { useState, useMemo } from "react";
import type { Message, ToolResult } from "../../types";
import { ToolCard } from "./ToolCard";

interface MessageCardProps {
  message: Message;
}

const ROLE_ICONS: Record<string, string> = {
  user: "👤",
  assistant: "🤖",
  system: "⚙️",
};

const ROLE_LABELS: Record<string, string> = {
  user: "USER",
  assistant: "ASSISTANT",
  system: "SYSTEM",
};

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function MessageCard({ message }: MessageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Create a map of tool results by tool use id
  const toolResultsMap = useMemo(() => {
    const map = new Map<string, ToolResult>();
    for (const result of message.toolResults) {
      map.set(result.toolUseId, result);
    }
    return map;
  }, [message.toolResults]);

  const icon = ROLE_ICONS[message.role] || "💬";
  const label = ROLE_LABELS[message.role] || message.role.toUpperCase();
  const hasContent = message.textContent.length > 0;
  const hasToolCalls = message.toolCalls.length > 0;
  const hasThinking = message.thinking !== null && message.thinking.length > 0;
  const isLongContent = message.textContent.length > 200;

  const displayContent = isExpanded
    ? message.textContent
    : truncateText(message.textContent);

  return (
    <div className={`message-card message-card--${message.role}`}>
      <button
        className="message-card__header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="message-card__icon">{icon}</span>
        <span className="message-card__role">{label}</span>
        <span className="message-card__timestamp">
          {formatTimestamp(message.timestamp)}
        </span>
        <span className="message-card__toggle">
          {isExpanded ? "▼" : "▶"}
        </span>
      </button>

      <div className="message-card__body">
        {/* Thinking section (for assistant messages) */}
        {hasThinking && isExpanded && (
          <div className="message-card__thinking">
            <div className="message-card__thinking-label">Thinking</div>
            <div className="message-card__thinking-content">
              {message.thinking}
            </div>
          </div>
        )}

        {/* Text content */}
        {hasContent && (
          <div className="message-card__content">
            <p className="message-card__text">{displayContent}</p>
            {isLongContent && !isExpanded && (
              <button
                className="message-card__expand-text"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
              >
                Show more
              </button>
            )}
          </div>
        )}

        {/* Tool calls (for assistant messages) */}
        {hasToolCalls && (
          <div className="message-card__tools">
            {message.toolCalls.map((toolCall) => {
              const result = toolResultsMap.get(toolCall.id);
              return (
                <ToolCard
                  key={toolCall.id}
                  toolCall={toolCall}
                  result={result?.content}
                  isError={result?.isError}
                />
              );
            })}
          </div>
        )}

        {/* Token usage (for assistant messages when expanded) */}
        {message.usage && isExpanded && (
          <div className="message-card__usage">
            <span className="message-card__usage-item">
              In: {message.usage.inputTokens.toLocaleString()}
            </span>
            <span className="message-card__usage-item">
              Out: {message.usage.outputTokens.toLocaleString()}
            </span>
            {message.usage.cachedTokens > 0 && (
              <span className="message-card__usage-item">
                Cached: {message.usage.cachedTokens.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageCard;
