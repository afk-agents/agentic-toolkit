import React, { useState } from "react";
import type { ToolCall, ToolCategory } from "../../types";

interface ToolCardProps {
  toolCall: ToolCall;
  result?: string;
  isError?: boolean;
}

const TOOL_ICONS: Record<ToolCategory, string> = {
  read: "📖",
  write: "✏️",
  bash: "🖥️",
  web: "🌐",
  agent: "🤖",
  other: "🔧",
};

const CATEGORY_COLORS: Record<ToolCategory, string> = {
  read: "tool-card--read",
  write: "tool-card--write",
  bash: "tool-card--bash",
  web: "tool-card--web",
  agent: "tool-card--agent",
  other: "tool-card--other",
};

function formatInput(input: Record<string, unknown>): string {
  // Get a summary of the input parameters
  const entries = Object.entries(input);
  if (entries.length === 0) return "No parameters";

  // For common tools, show relevant info
  if ("file_path" in input) {
    return String(input.file_path);
  }
  if ("command" in input) {
    const cmd = String(input.command);
    return cmd.length > 100 ? cmd.slice(0, 100) + "..." : cmd;
  }
  if ("pattern" in input) {
    return `Pattern: ${input.pattern}`;
  }
  if ("url" in input) {
    return String(input.url);
  }
  if ("query" in input) {
    return `Query: ${input.query}`;
  }

  // Default: show first parameter
  const firstEntry = entries[0];
  if (!firstEntry) return "No parameters";
  const [key, value] = firstEntry;
  const strValue = typeof value === "string" ? value : JSON.stringify(value);
  const truncated = strValue.length > 80 ? strValue.slice(0, 80) + "..." : strValue;
  return `${key}: ${truncated}`;
}

function formatInputFull(input: Record<string, unknown>): React.ReactNode {
  return (
    <pre className="tool-card__input-full">
      {JSON.stringify(input, null, 2)}
    </pre>
  );
}

function formatOutput(output: string): React.ReactNode {
  if (!output) return <span className="text-muted">No output</span>;

  // Truncate very long outputs
  const maxLength = 2000;
  const truncated = output.length > maxLength;
  const displayOutput = truncated ? output.slice(0, maxLength) : output;

  return (
    <>
      <pre className="tool-card__output-content">{displayOutput}</pre>
      {truncated && (
        <div className="tool-card__truncated">
          ... output truncated ({output.length.toLocaleString()} chars total)
        </div>
      )}
    </>
  );
}

export function ToolCard({ toolCall, result, isError }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const icon = TOOL_ICONS[toolCall.category];
  const colorClass = CATEGORY_COLORS[toolCall.category];
  const inputSummary = formatInput(toolCall.input);

  return (
    <div className={`tool-card ${colorClass} ${isExpanded ? "tool-card--expanded" : ""}`}>
      <button
        className="tool-card__header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="tool-card__icon">{icon}</span>
        <span className="tool-card__name">{toolCall.displayName}</span>
        <span className="tool-card__summary">{inputSummary}</span>
        <span className="tool-card__toggle">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <div className="tool-card__body">
          <div className="tool-card__section">
            <div className="tool-card__section-label">Input</div>
            {formatInputFull(toolCall.input)}
          </div>

          {result !== undefined && (
            <div className={`tool-card__section ${isError ? "tool-card__section--error" : ""}`}>
              <div className="tool-card__section-label">
                {isError ? "Error" : "Output"}
              </div>
              {formatOutput(result)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolCard;
