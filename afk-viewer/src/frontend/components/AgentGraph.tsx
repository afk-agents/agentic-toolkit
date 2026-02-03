import { useMemo, useRef, useEffect, useState } from "react";
import type { Session } from "../../types";
import { calculateLayout, type GraphNode, type PositionedNode, type Edge } from "../utils/graph";

interface AgentGraphProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

/**
 * Extract the agent type from the agentId or session context
 * Format is typically like "agent-{id}" or the session might have an agent type
 */
function getAgentLabel(session: Session): string {
  if (!session.isAgent) {
    return "Main Session";
  }

  // Try to extract a meaningful label from agentId
  if (session.agentId) {
    // Convert agent-xxx-yyy to something readable
    const parts = session.agentId.split("-");
    if (parts.length > 1) {
      // Capitalize first letter of each word after "agent"
      const label = parts
        .slice(1, 3)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
      return label || "Agent";
    }
  }

  // Fallback based on first prompt analysis
  const prompt = session.firstPrompt?.toLowerCase() || "";
  if (prompt.includes("explore") || prompt.includes("search") || prompt.includes("find")) {
    return "Explore Agent";
  }
  if (prompt.includes("plan") || prompt.includes("design") || prompt.includes("architect")) {
    return "Plan Agent";
  }
  if (prompt.includes("implement") || prompt.includes("build") || prompt.includes("create")) {
    return "Build Agent";
  }
  if (prompt.includes("test") || prompt.includes("verify")) {
    return "Test Agent";
  }
  if (prompt.includes("review") || prompt.includes("check")) {
    return "Review Agent";
  }

  return "Sub Agent";
}

/**
 * Convert sessions to graph nodes
 */
function sessionsToGraphNodes(sessions: Session[]): GraphNode[] {
  return sessions.map((session) => ({
    id: session.id,
    parentId: session.parentId,
    label: getAgentLabel(session),
    isActive: session.isActive,
  }));
}

/**
 * AgentGraph Component
 * Displays the agent hierarchy as an interactive SVG graph
 */
export function AgentGraph({ sessions, activeSessionId, onSelectSession }: AgentGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);

  // Observe container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate layout when sessions or container width changes
  const layout = useMemo(() => {
    const nodes = sessionsToGraphNodes(sessions);
    return calculateLayout(nodes, containerWidth);
  }, [sessions, containerWidth]);

  // Handle empty state
  if (sessions.length === 0) {
    return (
      <div className="agent-graph agent-graph--empty" ref={containerRef}>
        <div className="agent-graph__empty-state">
          <span className="agent-graph__empty-icon">&#9673;</span>
          <p className="agent-graph__empty-title">No Agent Hierarchy</p>
          <p className="agent-graph__empty-text">
            Select a session to view its agent relationships
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-graph" ref={containerRef}>
      <svg
        className="agent-graph__svg"
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
      >
        {/* Render edges first (behind nodes) */}
        <g className="agent-graph__edges">
          {layout.edges.map((edge) => (
            <EdgeLine key={`${edge.from}-${edge.to}`} edge={edge} nodes={layout.nodes} />
          ))}
        </g>

        {/* Render nodes */}
        <g className="agent-graph__nodes">
          {layout.nodes.map((node) => (
            <GraphNodeComponent
              key={node.id}
              node={node}
              isSelected={node.id === activeSessionId}
              onClick={() => onSelectSession(node.id)}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/**
 * Edge line connecting two nodes
 */
function EdgeLine({ edge, nodes }: { edge: Edge; nodes: PositionedNode[] }) {
  const fromNode = nodes.find((n) => n.id === edge.from);
  const toNode = nodes.find((n) => n.id === edge.to);

  if (!fromNode || !toNode) return null;

  // Connect from bottom center of parent to top center of child
  const x1 = fromNode.x + fromNode.width / 2;
  const y1 = fromNode.y + fromNode.height;
  const x2 = toNode.x + toNode.width / 2;
  const y2 = toNode.y;

  // Create a smooth path with a vertical drop then curve
  const midY = y1 + (y2 - y1) / 2;
  const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

  return <path className="agent-graph__edge" d={path} />;
}

/**
 * Graph node component (rounded rectangle with label)
 */
function GraphNodeComponent({
  node,
  isSelected,
  onClick,
}: {
  node: PositionedNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const classNames = [
    "agent-graph__node",
    node.isActive && "agent-graph__node--active",
    !node.isActive && "agent-graph__node--completed",
    isSelected && "agent-graph__node--selected",
  ]
    .filter(Boolean)
    .join(" ");

  // Split label into two lines if it contains a space
  const labelParts = node.label.split(" ");
  const hasMultiLine = labelParts.length >= 2;

  return (
    <g className={classNames} onClick={onClick} style={{ cursor: "pointer" }}>
      {/* Node background rectangle */}
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={6}
        ry={6}
        className="agent-graph__node-bg"
      />

      {/* Node border rectangle (for glow effect on active) */}
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={6}
        ry={6}
        className="agent-graph__node-border"
      />

      {/* Node label */}
      {hasMultiLine ? (
        <>
          <text
            x={node.x + node.width / 2}
            y={node.y + node.height / 2 - 6}
            className="agent-graph__node-label"
          >
            {labelParts[0]}
          </text>
          <text
            x={node.x + node.width / 2}
            y={node.y + node.height / 2 + 10}
            className="agent-graph__node-label"
          >
            {labelParts.slice(1).join(" ")}
          </text>
        </>
      ) : (
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height / 2 + 4}
          className="agent-graph__node-label"
        >
          {node.label}
        </text>
      )}
    </g>
  );
}

export default AgentGraph;
