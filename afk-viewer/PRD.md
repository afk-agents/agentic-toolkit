# AFK Viewer - Product Requirements Document

## Overview

AFK Viewer is a local Bun/React dashboard application that monitors Claude Code sessions in real-time. It watches the `~/.claude` directory for JSONL transcript files and provides a beautiful, terminal-aesthetic interface to view active and past sessions, their agent hierarchies, and tool interactions.

## Target User

Developers using Claude Code who want to:
- Monitor what Claude is doing across multiple sessions in real-time
- See agent/subagent activity and relationships visually
- Review past session transcripts
- Understand tool usage patterns at a glance

## Core Requirements

### Primary Use Case
**Live monitoring** of active Claude Code sessions with historical browsing as secondary.

### Technology Stack
- **Runtime:** Bun
- **Frontend:** React with TypeScript
- **Styling:** CSS (dark terminal aesthetic)
- **Server:** Bun.serve() with WebSocket for real-time updates
- **File Watching:** Bun's native file watcher on `~/.claude/projects/`
- **State Persistence:** Browser localStorage

### Server Configuration
- **Port:** 3333
- **URL:** `http://localhost:3333`

---

## Data Model

### Source Directory Structure
```
~/.claude/
├── projects/
│   ├── {url-encoded-project-path}/
│   │   ├── {session-uuid}.jsonl          # Main session transcript
│   │   ├── agent-{agent-id}.jsonl        # Subagent transcripts
│   │   └── {session-uuid}/
│   │       └── tool-results/             # Large tool outputs
│   └── ...
└── history.jsonl                          # Global command history
```

### JSONL Message Types
| Type | Description |
|------|-------------|
| `user` | User input and tool results |
| `assistant` | Claude's responses and tool calls |
| `progress` | Agent progress tracking |
| `file-history-snapshot` | File change snapshots |
| `queue-operation` | Session queue operations |

### Key Message Fields
- `uuid` - Unique message identifier
- `parentUuid` - For building conversation threads
- `sessionId` - Links to session UUID
- `agentId` - Identifies which agent/subagent created the message
- `isSidechain` - Distinguishes main sessions from subagents
- `timestamp` - ISO 8601 format
- `type` - Message type (user/assistant/progress/etc.)

### Tool Call Structure
Tool calls appear in `assistant` messages within `message.content` array:
```json
{
  "type": "tool_use",
  "id": "tool-use-id",
  "name": "Read",
  "input": { "file_path": "/path/to/file" }
}
```

---

## User Interface

### Visual Style
**Dark terminal aesthetic**
- Dark background (#0d1117 or similar)
- Monospace fonts (JetBrains Mono, Fira Code, or system monospace)
- Green/cyan accent colors for active elements
- Subtle borders and shadows
- High contrast text

### Layout: Three-Panel Dashboard

```
┌─────────────────┬────────────────────────────┬──────────────────┐
│                 │                            │                  │
│   LEFT PANEL    │       CENTER PANEL         │   RIGHT PANEL    │
│                 │                            │                  │
│  Projects &     │    Session Transcript      │   Agent Graph    │
│  Sessions       │                            │                  │
│                 │                            │                  │
│  - Pinned       │    [Auto-scrolling         │   [Visual node   │
│  - Active       │     message list]          │    graph of      │
│  - Recent       │                            │    agent         │
│                 │                            │    hierarchy]    │
│                 │                            │                  │
└─────────────────┴────────────────────────────┴──────────────────┘
```

### Left Panel: Projects & Sessions List

#### Project Organization
- **Pinned projects** at top (user can pin/unpin, saved to localStorage)
- **Active projects** (those with running sessions) below pinned
- **Recent projects** (sorted by last activity)
- Projects with no recent activity (>24h) shown but collapsed by default

#### Session Display
Each session shows:
1. **Timestamp** - When session started/last active
2. **Message count** - Number of messages in transcript
3. **First user message** - Truncated preview (first ~60 chars)
4. **Activity indicators** - Icons for:
   - 📄 Files read
   - ✏️ Files edited
   - 🖥️ Bash commands run
   - 🌐 Web fetches
   - 🤖 Subagents spawned

#### Session States
- **Active sessions:** Full opacity, subtle pulsing glow
- **Completed/inactive:** Dimmed (50-60% opacity)

#### Interactions
- Click session → Load into center panel
- Click pin icon → Pin/unpin project
- Visual pulse on new activity

### Center Panel: Session Transcript

#### Message Display
**Summary view by default** - Messages shown as collapsible summaries:

```
┌─────────────────────────────────────────────────────────────┐
│ 👤 USER  10:32:15 AM                                    [▼] │
├─────────────────────────────────────────────────────────────┤
│ "Add a new endpoint for user authentication..."             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🤖 ASSISTANT  10:32:18 AM                               [▼] │
├─────────────────────────────────────────────────────────────┤
│ I'll help you add the authentication endpoint...            │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📖 Read  src/routes/auth.ts                         [▼] │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✏️ Edit  src/routes/auth.ts                          [▼] │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Tool Call Cards
Displayed as **collapsible cards** within messages:
- Tool icon + name as header
- Key input parameters shown (collapsed)
- Expand to see full input/output
- Color-coded by tool type:
  - Blue: Read operations
  - Orange: Write/Edit operations
  - Green: Bash commands
  - Purple: Web operations
  - Yellow: Agent spawning

#### Code Blocks
- **Syntax highlighted** using a library like Prism.js or highlight.js
- Language auto-detection
- Monospace font matching terminal aesthetic

#### Behavior
- **Auto-scroll to latest** when new messages arrive
- User scroll up pauses auto-scroll
- "Jump to latest" button appears when paused
- Smooth scroll animations

### Right Panel: Agent Hierarchy Graph

#### Visualization
**Interactive node graph** showing agent relationships:

```
        ┌──────────┐
        │  Main    │
        │ Session  │
        └────┬─────┘
             │
      ┌──────┴──────┐
      │             │
 ┌────▼────┐  ┌────▼────┐
 │ Explore │  │  Plan   │
 │  Agent  │  │  Agent  │
 └─────────┘  └────┬────┘
                   │
              ┌────▼────┐
              │ Feature │
              │   Dev   │
              └─────────┘
```

#### Node Display
- Node shows agent type/name
- Active agents: Pulsing border
- Completed agents: Solid, dimmed
- Click node → Focus that agent's transcript in center panel

#### Layout
- **Auto-layout** algorithm positions nodes
- Updates dynamically as agents spawn
- Smooth transitions when graph changes

---

## Real-Time Updates

### File Watching
The server watches `~/.claude/projects/` for:
- New JSONL files (new sessions/agents)
- Changes to existing JSONL files (new messages)
- File deletions (session cleanup)

### WebSocket Protocol
Server pushes updates to connected clients:

```typescript
// Message types
type WSMessage =
  | { type: 'session_update'; projectPath: string; sessionId: string; messages: Message[] }
  | { type: 'new_session'; projectPath: string; sessionId: string; isAgent: boolean }
  | { type: 'session_complete'; projectPath: string; sessionId: string }
  | { type: 'initial_state'; projects: Project[] }
```

### Visual Feedback
- **Subtle pulse/glow** on elements when new activity arrives
- No audio notifications
- Active sessions have gentle breathing animation

---

## State Management

### localStorage Keys
```typescript
interface PersistedState {
  pinnedProjects: string[];           // Array of project paths
  expandedProjects: string[];         // Currently expanded in sidebar
  lastViewedSession: string | null;   // Session UUID
  panelWidths: {                      // User-adjusted panel sizes
    left: number;
    right: number;
  };
}
```

### Application State
```typescript
interface AppState {
  projects: Map<string, Project>;
  activeSession: string | null;
  agentGraph: AgentNode[];
  isConnected: boolean;
  scrollPaused: boolean;
}

interface Project {
  path: string;
  displayName: string;
  sessions: Session[];
  lastActivity: Date;
  isPinned: boolean;
}

interface Session {
  id: string;
  isAgent: boolean;
  parentId: string | null;
  agentType: string | null;
  messages: Message[];
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
  stats: {
    messageCount: number;
    toolCalls: ToolCallSummary;
  };
}
```

---

## Architecture

### Server Components

```
src/
├── server/
│   ├── index.ts              # Bun.serve() entry point
│   ├── watcher.ts            # File system watcher
│   ├── parser.ts             # JSONL parsing utilities
│   └── websocket.ts          # WebSocket handler
├── frontend/
│   ├── index.html            # HTML entry point
│   ├── App.tsx               # Main React component
│   ├── components/
│   │   ├── ProjectList.tsx   # Left panel
│   │   ├── SessionView.tsx   # Center panel
│   │   ├── AgentGraph.tsx    # Right panel
│   │   ├── MessageCard.tsx   # Message display
│   │   └── ToolCard.tsx      # Tool call display
│   ├── hooks/
│   │   ├── useWebSocket.ts   # WebSocket connection
│   │   └── useLocalStorage.ts
│   ├── styles/
│   │   └── index.css         # Global styles
│   └── utils/
│       ├── parser.ts         # Client-side parsing
│       └── graph.ts          # Agent graph layout
└── types/
    └── index.ts              # Shared TypeScript types
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ~/.claude/    │────▶│   Bun Server    │────▶│  React Client   │
│   JSONL files   │     │   (watcher)     │     │   (dashboard)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
    File changes           WebSocket              UI Updates
    detected               messages              rendered
```

---

## MVP Scope

### Included
- [x] Live file watching of `~/.claude/projects/`
- [x] Three-panel dashboard layout
- [x] Project/session list with pinning
- [x] Session transcript view with auto-scroll
- [x] Tool call collapsible cards
- [x] Agent hierarchy visual graph
- [x] Syntax-highlighted code blocks
- [x] Activity indicators on sessions
- [x] Visual pulse for new activity
- [x] localStorage persistence for pins/preferences
- [x] Dimmed inactive sessions

### Excluded from MVP
- [ ] Full-text search
- [ ] Message type filtering
- [ ] Date range filtering
- [ ] Copy message content
- [ ] Jump to file in editor
- [ ] Session export
- [ ] Sound notifications
- [ ] Multiple themes

---

## Running the App

```bash
# From the afk-viewer directory
bun install
bun run dev

# Opens at http://localhost:3333
```

---

## Success Criteria

1. **Live updates appear within 500ms** of JSONL file changes
2. **Dashboard loads in <2s** with 50+ projects
3. **Smooth scrolling** at 60fps during auto-scroll
4. **Agent graph updates smoothly** when new agents spawn
5. **UI remains responsive** with sessions containing 1000+ messages
