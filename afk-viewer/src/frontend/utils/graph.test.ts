import { describe, test, expect } from "bun:test";
import {
  calculateLayout,
  buildEdges,
  type GraphNode,
  type PositionedNode,
  type Edge,
  type GraphLayoutResult,
} from "./graph";

describe("buildEdges", () => {
  test("returns empty array for single node (no parent)", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
    ];

    const edges = buildEdges(nodes);

    expect(edges).toEqual([]);
  });

  test("returns correct edge for parent-child relationship", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
      { id: "child1", parentId: "root", label: "Agent 1", isActive: true },
    ];

    const edges = buildEdges(nodes);

    expect(edges).toEqual([{ from: "root", to: "child1" }]);
  });

  test("returns multiple edges for multiple children", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
      { id: "child1", parentId: "root", label: "Agent 1", isActive: true },
      { id: "child2", parentId: "root", label: "Agent 2", isActive: false },
    ];

    const edges = buildEdges(nodes);

    expect(edges).toHaveLength(2);
    expect(edges).toContainEqual({ from: "root", to: "child1" });
    expect(edges).toContainEqual({ from: "root", to: "child2" });
  });

  test("returns edges for multi-level hierarchy", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
      { id: "child1", parentId: "root", label: "Agent 1", isActive: true },
      {
        id: "grandchild1",
        parentId: "child1",
        label: "Sub-Agent 1",
        isActive: true,
      },
    ];

    const edges = buildEdges(nodes);

    expect(edges).toHaveLength(2);
    expect(edges).toContainEqual({ from: "root", to: "child1" });
    expect(edges).toContainEqual({ from: "child1", to: "grandchild1" });
  });
});

describe("calculateLayout", () => {
  const containerWidth = 600;

  test("positions single root node at top center", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
    ];

    const layout = calculateLayout(nodes, containerWidth);

    expect(layout.nodes).toHaveLength(1);
    const rootNode = layout.nodes[0];
    expect(rootNode.id).toBe("root");
    expect(rootNode.y).toBe(40); // Default top padding
    expect(rootNode.x).toBeCloseTo(containerWidth / 2 - rootNode.width / 2, 0);
  });

  test("positions root with 2 children - children below and spread horizontally", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
      { id: "child1", parentId: "root", label: "Agent 1", isActive: true },
      { id: "child2", parentId: "root", label: "Agent 2", isActive: false },
    ];

    const layout = calculateLayout(nodes, containerWidth);

    expect(layout.nodes).toHaveLength(3);

    const rootNode = layout.nodes.find((n) => n.id === "root")!;
    const child1 = layout.nodes.find((n) => n.id === "child1")!;
    const child2 = layout.nodes.find((n) => n.id === "child2")!;

    // Root should be at level 0
    expect(rootNode.y).toBeLessThan(child1.y);
    expect(rootNode.y).toBeLessThan(child2.y);

    // Children should be at same level
    expect(child1.y).toBe(child2.y);

    // Children should be horizontally spread
    expect(child1.x).not.toBe(child2.x);
  });

  test("positions root with child and grandchildren correctly", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
      { id: "child1", parentId: "root", label: "Agent 1", isActive: true },
      {
        id: "grandchild1",
        parentId: "child1",
        label: "Sub-Agent 1",
        isActive: true,
      },
      {
        id: "grandchild2",
        parentId: "child1",
        label: "Sub-Agent 2",
        isActive: false,
      },
    ];

    const layout = calculateLayout(nodes, containerWidth);

    expect(layout.nodes).toHaveLength(4);

    const rootNode = layout.nodes.find((n) => n.id === "root")!;
    const child1 = layout.nodes.find((n) => n.id === "child1")!;
    const grandchild1 = layout.nodes.find((n) => n.id === "grandchild1")!;
    const grandchild2 = layout.nodes.find((n) => n.id === "grandchild2")!;

    // Verify vertical ordering: root < child < grandchildren
    expect(rootNode.y).toBeLessThan(child1.y);
    expect(child1.y).toBeLessThan(grandchild1.y);
    expect(grandchild1.y).toBe(grandchild2.y);

    // Grandchildren should be spread horizontally
    expect(grandchild1.x).not.toBe(grandchild2.x);
  });

  test("handles multiple root nodes (parallel sessions)", () => {
    const nodes: GraphNode[] = [
      { id: "root1", parentId: null, label: "Session 1", isActive: true },
      { id: "root2", parentId: null, label: "Session 2", isActive: false },
    ];

    const layout = calculateLayout(nodes, containerWidth);

    expect(layout.nodes).toHaveLength(2);

    const root1 = layout.nodes.find((n) => n.id === "root1")!;
    const root2 = layout.nodes.find((n) => n.id === "root2")!;

    // Both roots should be at the same level (top)
    expect(root1.y).toBe(root2.y);

    // Roots should be spread horizontally
    expect(root1.x).not.toBe(root2.x);
  });

  test("calculates correct layout width and height", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
      { id: "child1", parentId: "root", label: "Agent 1", isActive: true },
      { id: "child2", parentId: "root", label: "Agent 2", isActive: false },
    ];

    const layout = calculateLayout(nodes, containerWidth);

    // Width should be at least the container width
    expect(layout.width).toBeGreaterThanOrEqual(containerWidth);

    // Height should accommodate all levels plus padding
    expect(layout.height).toBeGreaterThan(0);

    // Height should be at least 2 levels worth (root + children)
    const child1 = layout.nodes.find((n) => n.id === "child1")!;
    expect(layout.height).toBeGreaterThanOrEqual(child1.y + child1.height);
  });

  test("positioned nodes have correct dimensions", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
    ];

    const layout = calculateLayout(nodes, containerWidth);

    const rootNode = layout.nodes[0];
    expect(rootNode.width).toBeGreaterThan(0);
    expect(rootNode.height).toBeGreaterThan(0);
  });

  test("preserves original node properties in positioned nodes", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
      { id: "child1", parentId: "root", label: "Agent 1", isActive: false },
    ];

    const layout = calculateLayout(nodes, containerWidth);

    const rootNode = layout.nodes.find((n) => n.id === "root")!;
    const childNode = layout.nodes.find((n) => n.id === "child1")!;

    expect(rootNode.label).toBe("Main Session");
    expect(rootNode.isActive).toBe(true);
    expect(rootNode.parentId).toBeNull();

    expect(childNode.label).toBe("Agent 1");
    expect(childNode.isActive).toBe(false);
    expect(childNode.parentId).toBe("root");
  });

  test("returns edges in layout result", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main Session", isActive: true },
      { id: "child1", parentId: "root", label: "Agent 1", isActive: true },
    ];

    const layout = calculateLayout(nodes, containerWidth);

    expect(layout.edges).toHaveLength(1);
    expect(layout.edges[0]).toEqual({ from: "root", to: "child1" });
  });

  test("handles empty nodes array", () => {
    const nodes: GraphNode[] = [];

    const layout = calculateLayout(nodes, containerWidth);

    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
    expect(layout.width).toBe(containerWidth);
    expect(layout.height).toBe(0);
  });

  test("handles complex tree with multiple branches at different depths", () => {
    const nodes: GraphNode[] = [
      { id: "root", parentId: null, label: "Main", isActive: true },
      { id: "a", parentId: "root", label: "A", isActive: true },
      { id: "b", parentId: "root", label: "B", isActive: true },
      { id: "a1", parentId: "a", label: "A1", isActive: true },
      { id: "a2", parentId: "a", label: "A2", isActive: false },
      { id: "b1", parentId: "b", label: "B1", isActive: true },
      { id: "a1x", parentId: "a1", label: "A1X", isActive: true },
    ];

    const layout = calculateLayout(nodes, containerWidth);

    expect(layout.nodes).toHaveLength(7);
    expect(layout.edges).toHaveLength(6);

    // Verify level ordering
    const root = layout.nodes.find((n) => n.id === "root")!;
    const a = layout.nodes.find((n) => n.id === "a")!;
    const b = layout.nodes.find((n) => n.id === "b")!;
    const a1 = layout.nodes.find((n) => n.id === "a1")!;
    const a2 = layout.nodes.find((n) => n.id === "a2")!;
    const b1 = layout.nodes.find((n) => n.id === "b1")!;
    const a1x = layout.nodes.find((n) => n.id === "a1x")!;

    // Level 0: root
    // Level 1: a, b
    // Level 2: a1, a2, b1
    // Level 3: a1x
    expect(root.y).toBeLessThan(a.y);
    expect(a.y).toBe(b.y);
    expect(a.y).toBeLessThan(a1.y);
    expect(a1.y).toBe(a2.y);
    expect(a1.y).toBe(b1.y);
    expect(a1.y).toBeLessThan(a1x.y);
  });
});
