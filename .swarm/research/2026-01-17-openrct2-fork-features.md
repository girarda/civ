# Research: OpenRCT2 Fork Features for Claude Code Integration

**Date**: 2026-01-17
**Status**: Complete
**Repository**: https://github.com/jaysobel/OpenRCT2
**Branch**: `coding-agent`

## Executive Summary

This fork of OpenRCT2 implements a comprehensive AI agent integration system that allows Claude Code to play RollerCoaster Tycoon 2 through a CLI-based interface. Rather than using screenshots or vision, the system provides Claude with structured game data via a **JSON-RPC 2.0 protocol** and accepts commands through a custom CLI tool called **`rctctl`**. The integration embeds a fully functional terminal window inside the game, allowing Claude Code to manage the park using the same mechanical constraints as human players.

Key innovation: The fork creates a "fair play" AI experience where Claude operates under identical game rules to human players, rather than having privileged access to game internals.

## Key Findings

### 1. Core Architecture

The system comprises three primary components:

| Component | Purpose |
|-----------|---------|
| **In-Game Terminal** | PTY-based terminal with ANSI color support via libvterm |
| **rctctl CLI Tool** | Command-line interface translating agent requests to game actions |
| **JSON-RPC Server** | TCP server (port 9876) exposing game state and accepting commands |

### 2. Added Features

| Feature | Description |
|---------|-------------|
| **Embedded Terminal Window** | Full shell experience inside the game UI |
| **JSON-RPC 2.0 API** | Structured protocol for game state queries and action execution |
| **rctctl CLI** | Unix-style command tool (`rctctl <noun> <verb> [args] [flags]`) |
| **Session Logging** | Automatic logging to `agent-logs/` in markdown, HTML, and JSON formats |
| **Turn Detection** | Monitors Claude Code session files to detect response completion |
| **Autoplay Mode** | Enables autonomous continuous gameplay |
| **Custom Toolbar Icons** | Claude-specific UI elements (art by @jsobel) |
| **Unicode Font Support** | NotoSansSymbols fonts for full Unicode coverage in terminal |
| **Tree Sprite Extraction** | Utility scripts for asset extraction |

### 3. Command Interface

The `rctctl` CLI follows Unix conventions:

```
rctctl <resource> <action> [args] [flags]
```

**Available Resources (Nouns):**
- `park` - Overall park management
- `map` - Terrain and layout
- `rides` - Ride construction and management
- `guests` - Visitor monitoring
- `staff` - Employee management
- `research` - R&D progress
- `finance` - Money and loans
- `shops` - Food/drink/merchandise stalls
- `paths` - Footpath construction
- `construction` - Building operations
- `trees`, `scenery` - Decorative elements
- `weather`, `awards` - Park conditions and achievements

**Common Actions (Verbs):**
`status`, `list`, `get`, `set`, `open`, `close`, `test`, `price`, `place`, `remove`, `hire`, `fire`, `patrol`

**Output Formats:**
- Human-readable tables (default)
- Machine-readable JSON (`-o json` flag)

### 4. Spatial System

| Axis | Direction |
|------|-----------|
| X | Increases eastward |
| Y | Increases southward |
| Z | Height in tile units (ground level ~14) |
| Origin (0,0) | Northwest corner |

Path connectivity uses isometric terms (NE/SE/SW/NW), while elements use compass directions (West/North/East/South).

## Technical Analysis

### Integration Approach

The developers chose to create a **full fork** rather than use the plugin system, explaining this was necessary to achieve the required integration depth. This suggests modifications to core game code that couldn't be achieved through JavaScript plugins alone.

**Key Technical Decisions:**
1. **PTY-based terminal** - Spawns real shell processes, enabling any CLI tool (not just rctctl)
2. **TCP server on localhost** - Clean separation between game and CLI tool
3. **Leverages existing infrastructure** - Uses OpenRCT2's `getGameState()` scripting API
4. **Performance optimizations** - Fast IPv4 path, TCP_NODELAY for low latency

### Why Not Vision-Based?

The system deliberately avoids screenshot-based AI interaction:

| Approach | This Fork's Choice |
|----------|-------------------|
| Vision (screenshots) | Not used |
| State export (JSON) | Primary method via JSON-RPC |
| Natural language | CLI commands (structured but readable) |

This makes the integration more reliable and faster than vision-based alternatives while maintaining game integrity.

### Platform Support

| Platform | Status |
|----------|--------|
| macOS | Primary development platform, fully supported |
| Linux | Should work (same POSIX APIs) |
| Windows | Would require ConPTY implementation |

### Networking

- Localhost only - no remote play support
- Explicitly positioned as experimental development software

## File Structure

| Path | Purpose |
|------|---------|
| `ai-agent-workspace/` | Claude's working directory when terminal opens |
| `ai-agent-workspace/IN_GAME_AGENT.md` | Agent role and gameplay instructions |
| `ai-agent-workspace/auto_prompts.txt` | Automated prompting content |
| `ai-agent-workspace/.claude/` | Claude Code configuration |
| `agent-logs/` | Session recordings (markdown, HTML, JSON) |
| `CODING_AGENT.md` | Technical integration documentation |
| `AGENTS.md` | Agent system overview |
| `.claude/settings.local.json` | Project-level Claude Code settings |

## Agent Behavior Guidelines

From `IN_GAME_AGENT.md`, the AI agent is instructed to:

1. **Focus on park management** - Not system internals
2. **Monitor key metrics** - Scenario goals, guest count, park rating, date
3. **Track guest sentiment** - Complaints and satisfaction
4. **Manage resources** - Rides, shops, stalls, staff
5. **Work autonomously** - Extended periods with task list maintenance
6. **Use `--help` liberally** - Self-discovery of commands
7. **Single tool call per response** - Structured interaction pattern

### Strategic Constraints Enforced

- Shops/stalls require adjacent pathways
- Rides need practical guest access via paths
- Queue paths must connect to main network
- Paths only connect at shared borders (no diagonal connections)

## Development & Testing

The fork includes:

| Component | Description |
|-----------|-------------|
| CLI validation tests | No game required for basic testing |
| End-to-end scenarios | Headless game with rctctl commands |
| `agent_bundle` build target | Compiles GUI, CLI, and sprite assets together |
| Verbose logging | `--log-file` flag captures INFO/WARNING/ERROR |

## Timeline of Key Commits

| Date | Change |
|------|--------|
| Dec 22, 2025 | "Add AI agent terminal with Claude Code integration" - Main feature commit |
| Jan 10, 2026 | Enhanced rctctl CLI with improved help text, performance optimizations |

## Comparison to Base OpenRCT2

| Feature | Base OpenRCT2 | This Fork |
|---------|---------------|-----------|
| Plugin system | JavaScript-based | Enhanced with JSON-RPC server |
| Terminal | None | Full PTY-based terminal |
| CLI tool | None | `rctctl` for park management |
| AI integration | None | First-class Claude Code support |
| Session logging | None | Automatic markdown/HTML/JSON logs |
| Headless mode | Server only | Full AI agent support |

## Observations & Recommendations

### Strengths

1. **Fair play design** - AI operates under same rules as humans
2. **Clean architecture** - Separation between game and CLI via TCP
3. **Rich command set** - Comprehensive coverage of game mechanics
4. **Excellent documentation** - Clear agent guidelines and spatial system docs
5. **Session logging** - Enables replay and analysis of AI behavior

### Potential Improvements

1. **Windows support** - ConPTY implementation would expand platform reach
2. **Network play** - Could enable remote AI spectating/demonstration
3. **Plugin fallback** - Some features could potentially use plugin API

### Use Cases

1. **AI research** - Testing LLM game-playing capabilities
2. **Entertainment** - "Watch Claude play RCT2" streams/demos
3. **Benchmark** - Evaluating AI planning and resource management
4. **Education** - Demonstrating AI-game integration patterns

## Open Questions

1. What specific C++ modifications were required beyond terminal/JSON-RPC?
2. How does turn detection interact with game speed settings?
3. Are there plans to upstream any features to base OpenRCT2?
4. What performance characteristics does the JSON-RPC server have under load?

---

**Research completed**: 2026-01-17
**Sources**: GitHub repository web pages, CODING_AGENT.md, AGENTS.md, IN_GAME_AGENT.md
