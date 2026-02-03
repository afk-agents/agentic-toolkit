/**
 * Graph Layout Utility for Agent Hierarchy Visualization
 *
 * Provides functions to calculate node positions for a tree-layout graph
 * and build edge relationships between nodes.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Input node for graph layout calculation
 */
export interface GraphNode {
  id: string;
  parentId: string | null;
  label: string;
  isActive: boolean;
}

/**
 * Node with calculated position and dimensions
 */
export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Edge connecting two nodes
 */
export interface Edge {
  from: string;
  to: string;
}

/**
 * Complete graph layout result
 */
export interface GraphLayoutResult {
  nodes: PositionedNode[];
  edges: Edge[];
  width: number;
  height: number;
}

// =============================================================================
// Layout Configuration
// =============================================================================

const DEFAULT_NODE_WIDTH = 120;
const DEFAULT_NODE_HEIGHT = 50;
const HORIZONTAL_SPACING = 30;
const VERTICAL_SPACING = 60;
const TOP_PADDING = 40;
const BOTTOM_PADDING = 40;

// =============================================================================
// Helper Types for Internal Use
// =============================================================================

interface TreeNode {
  node: GraphNode;
  children: TreeNode[];
  depth: number;
  subtreeWidth: number;
  x: number;
  y: number;
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Build edge list from parent-child relationships
 *
 * @param nodes - Array of graph nodes with parent references
 * @returns Array of edges representing parent-child connections
 */
export function buildEdges(nodes: GraphNode[]): Edge[] {
  const edges: Edge[] = [];

  for (const node of nodes) {
    if (node.parentId !== null) {
      edges.push({
        from: node.parentId,
        to: node.id,
      });
    }
  }

  return edges;
}

/**
 * Calculate layout positions for nodes in a tree structure
 *
 * Uses a top-down tree layout algorithm:
 * - Root nodes at the top
 * - Children positioned below their parents
 * - Siblings spread horizontally
 *
 * @param nodes - Array of graph nodes to position
 * @param containerWidth - Available width for the layout
 * @returns Complete graph layout with positioned nodes and edges
 */
export function calculateLayout(
  nodes: GraphNode[],
  containerWidth: number
): GraphLayoutResult {
  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      width: containerWidth,
      height: 0,
    };
  }

  // Build node map for quick lookups
  const nodeMap = new Map<string, GraphNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Find root nodes (nodes without parents or with missing parents)
  const rootNodes = nodes.filter(
    (n) => n.parentId === null || !nodeMap.has(n.parentId)
  );

  // Build tree structure
  const trees = rootNodes.map((root) => buildTree(root, nodes, 0));

  // Calculate subtree widths (bottom-up)
  for (const tree of trees) {
    calculateSubtreeWidths(tree);
  }

  // Calculate total width needed for all trees
  const totalTreesWidth = trees.reduce(
    (sum, tree) => sum + tree.subtreeWidth,
    0
  );
  const totalSpacing = (trees.length - 1) * HORIZONTAL_SPACING;
  const contentWidth = totalTreesWidth + totalSpacing;
  const layoutWidth = Math.max(containerWidth, contentWidth);

  // Calculate starting x position to center trees
  let currentX = (layoutWidth - contentWidth) / 2;

  // Position nodes (top-down)
  for (const tree of trees) {
    positionTree(tree, currentX, TOP_PADDING);
    currentX += tree.subtreeWidth + HORIZONTAL_SPACING;
  }

  // Flatten tree structure to positioned nodes
  const positionedNodes: PositionedNode[] = [];
  for (const tree of trees) {
    collectPositionedNodes(tree, positionedNodes);
  }

  // Calculate layout height
  const maxY = Math.max(...positionedNodes.map((n) => n.y + n.height));
  const layoutHeight = maxY + BOTTOM_PADDING;

  // Build edges
  const edges = buildEdges(nodes);

  return {
    nodes: positionedNodes,
    edges,
    width: layoutWidth,
    height: layoutHeight,
  };
}

/**
 * Build a tree structure from flat node list
 */
function buildTree(
  node: GraphNode,
  allNodes: GraphNode[],
  depth: number
): TreeNode {
  const children = allNodes.filter((n) => n.parentId === node.id);

  return {
    node,
    children: children.map((child) => buildTree(child, allNodes, depth + 1)),
    depth,
    subtreeWidth: 0,
    x: 0,
    y: 0,
  };
}

/**
 * Calculate subtree widths bottom-up
 * Each node's subtree width is the max of:
 * - The node's own width
 * - The sum of children's subtree widths plus spacing
 */
function calculateSubtreeWidths(tree: TreeNode): void {
  // First calculate children's subtree widths
  for (const child of tree.children) {
    calculateSubtreeWidths(child);
  }

  if (tree.children.length === 0) {
    // Leaf node - just its own width
    tree.subtreeWidth = DEFAULT_NODE_WIDTH;
  } else {
    // Sum children's subtree widths plus spacing between them
    const childrenWidth = tree.children.reduce(
      (sum, child) => sum + child.subtreeWidth,
      0
    );
    const spacingWidth = (tree.children.length - 1) * HORIZONTAL_SPACING;
    tree.subtreeWidth = Math.max(
      DEFAULT_NODE_WIDTH,
      childrenWidth + spacingWidth
    );
  }
}

/**
 * Position tree nodes with x,y coordinates
 * @param tree - Tree node to position
 * @param x - Left edge x coordinate of the available space
 * @param y - Top y coordinate for this node
 */
function positionTree(tree: TreeNode, x: number, y: number): void {
  // Center this node within its subtree width
  tree.x = x + (tree.subtreeWidth - DEFAULT_NODE_WIDTH) / 2;
  tree.y = y;

  // Position children
  const childY = y + DEFAULT_NODE_HEIGHT + VERTICAL_SPACING;
  let childX = x;

  for (const child of tree.children) {
    positionTree(child, childX, childY);
    childX += child.subtreeWidth + HORIZONTAL_SPACING;
  }
}

/**
 * Collect all positioned nodes from tree structure
 */
function collectPositionedNodes(
  tree: TreeNode,
  result: PositionedNode[]
): void {
  result.push({
    ...tree.node,
    x: tree.x,
    y: tree.y,
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
  });

  for (const child of tree.children) {
    collectPositionedNodes(child, result);
  }
}
