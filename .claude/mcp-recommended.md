# MCP Server Recommendations

MCP (Model Context Protocol) servers extend Claude Code with direct access to databases, GitHub, file systems, and more. These are the servers that supercharge this project.

---

## Recommended servers

### 1. PostgreSQL — Direct database access

Lets Claude query the database directly without writing Prisma queries to explore data.

```bash
# Install
npm install -g @modelcontextprotocol/server-postgres

# Add to Claude Code settings (~/.claude/settings.json)
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://postgres:postgres@localhost:5432/boilerplate_dev"]
    }
  }
}
```

**Use cases:**
- "Show me all users in org X"
- "How many pending leave requests are there?"
- "What does the employees table look like?"

---

### 2. Filesystem — No permission prompts for reads

Removes the constant "allow read?" prompts for trusted project directories.

```bash
# Add to .claude/settings.json (project-level)
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:/Users/<you>/Desktop/Boiler Plate Code"
      ]
    }
  }
}
```

**Use cases:**
- Faster file reads across the whole project without approval prompts

---

### 3. GitHub — Issue and PR access

Lets Claude read GitHub issues, PRs, and comments without leaving the terminal.

```bash
# Requires GITHUB_PERSONAL_ACCESS_TOKEN in environment

# Add to Claude Code settings
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-pat>"
      }
    }
  }
}
```

**Use cases:**
- "Show me the open bugs assigned to me"
- "Summarize PR #45"
- "Create an issue for the bug we just found"

---

### 4. Memory (official Anthropic) — Cross-session knowledge graph

Persistent knowledge graph that supplements the file-based memory system.

```bash
npm install -g @modelcontextprotocol/server-memory

{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

---

## How to configure (Claude Code)

Claude Code reads MCP server config from two places:

```
Global (all projects):  ~/.claude/settings.json
Project (this project): .claude/settings.json
```

Add the `mcpServers` key to either file. Global servers are always available. Project servers are available only in this directory.

```json
{
  "mcpServers": {
    "postgres": { ... },
    "github":   { ... }
  }
}
```

After adding, restart Claude Code. Run `/mcp` to see which servers are connected.

---

## Security note

The PostgreSQL MCP server has read/write access to your database. Use a **read-only database user** for it in production environments, or keep it as a local-dev-only tool.

Never put production `DATABASE_URL` in MCP server config.
