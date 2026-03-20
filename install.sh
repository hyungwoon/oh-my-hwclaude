#!/bin/bash
# oh-my-hwclaude installer
# Installs hashline edit MCP server + hooks + rules globally for Claude Code
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
RULES_DIR="$CLAUDE_DIR/rules"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  oh-my-hwclaude installer"
echo "  Hashline Edit + Self-Recovery Hooks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Install dependencies
echo "📦 Installing dependencies..."
cd "$SCRIPT_DIR"
npm install

# 2. Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# 3. Create rules directory
echo "📝 Installing rules..."
mkdir -p "$RULES_DIR"

# Copy rules (with hwclaude- prefix to avoid conflicts)
for rule_file in "$SCRIPT_DIR/rules/"*.md; do
  filename=$(basename "$rule_file")
  cp "$rule_file" "$RULES_DIR/hwclaude-${filename}"
  echo "  ✓ $RULES_DIR/hwclaude-${filename}"
done

# 4. Install commands (slash commands)
echo "📋 Installing commands..."
COMMANDS_DIR="$CLAUDE_DIR/commands"
mkdir -p "$COMMANDS_DIR"

for cmd_file in "$SCRIPT_DIR/commands/"*.md; do
  filename=$(basename "$cmd_file")
  cp "$cmd_file" "$COMMANDS_DIR/hwclaude-${filename}"
  echo "  ✓ $COMMANDS_DIR/hwclaude-${filename}"
done

# 5. Install agents
echo "🤖 Installing agents..."
AGENTS_DIR="$CLAUDE_DIR/agents"
mkdir -p "$AGENTS_DIR"

for agent_file in "$SCRIPT_DIR/agents/"*.md; do
  filename=$(basename "$agent_file")
  cp "$agent_file" "$AGENTS_DIR/hwclaude-${filename}"
  echo "  ✓ $AGENTS_DIR/hwclaude-${filename}"
done

# 6. Update Claude Code settings
echo ""
echo "⚙️  Configuring Claude Code settings..."

# Ensure settings file exists
mkdir -p "$CLAUDE_DIR"
if [ ! -f "$SETTINGS_FILE" ]; then
  echo '{}' > "$SETTINGS_FILE"
fi

# Use node to safely merge settings
node -e "
const fs = require('fs');
const path = require('path');

const settingsPath = '$SETTINGS_FILE';
const scriptDir = '$SCRIPT_DIR';

let settings;
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} catch {
  settings = {};
}

// Add MCP server
if (!settings.mcpServers) settings.mcpServers = {};
settings.mcpServers['oh-my-hwclaude'] = {
  command: 'node',
  args: [path.join(scriptDir, 'dist', 'server.js')],
};

// Add hooks (merge, don't overwrite)
if (!settings.hooks) settings.hooks = {};

// PreToolUse hooks
if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];
const preHookCmd = 'node ' + path.join(scriptDir, 'dist', 'hooks', 'index.js') + ' pre-tool-use';
const hasPreHook = settings.hooks.PreToolUse.some(h => JSON.stringify(h).includes('hwclaude'));
if (!hasPreHook) {
  settings.hooks.PreToolUse.push({
    matcher: 'Edit|Write',
    hooks: [{ type: 'command', command: preHookCmd }],
  });
}

// PostToolUse hooks
if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];
const postHookCmd = 'node ' + path.join(scriptDir, 'dist', 'hooks', 'index.js') + ' post-tool-use';
const hasPostHook = settings.hooks.PostToolUse.some(h => JSON.stringify(h).includes('hwclaude'));
if (!hasPostHook) {
  settings.hooks.PostToolUse.push({
    matcher: '',
    hooks: [{ type: 'command', command: postHookCmd }],
  });
}

// Stop hooks
if (!settings.hooks.Stop) settings.hooks.Stop = [];
const stopHookCmd = 'node ' + path.join(scriptDir, 'dist', 'hooks', 'index.js') + ' stop';
const hasStopHook = settings.hooks.Stop.some(h => JSON.stringify(h).includes('hwclaude'));
if (!hasStopHook) {
  settings.hooks.Stop.push({
    matcher: '',
    hooks: [{ type: 'command', command: stopHookCmd }],
  });
}

// Add permissions for MCP tools
if (!settings.permissions) settings.permissions = {};
if (!settings.permissions.allow) settings.permissions.allow = [];
const mcpTools = [
  'mcp__oh-my-hwclaude__hashline_read',
  'mcp__oh-my-hwclaude__hashline_edit',
  'mcp__oh-my-hwclaude__hashline_write',
];
for (const tool of mcpTools) {
  if (!settings.permissions.allow.includes(tool)) {
    settings.permissions.allow.push(tool);
  }
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
console.log('  ✓ MCP server: oh-my-hwclaude');
console.log('  ✓ PreToolUse hook: Edit/Write guard');
console.log('  ✓ PostToolUse hook: error recovery');
console.log('  ✓ Stop hook: completion check');
console.log('  ✓ Permissions: hashline tools auto-approved');
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Installation complete!"
echo ""
echo "  MCP Server: oh-my-hwclaude"
echo "  Rules: ~/.claude/rules/hwclaude-* (4 files)"
echo "  Commands: ~/.claude/commands/hwclaude-* (3 files)"
echo "  Agents: ~/.claude/agents/hwclaude-* (6 files)"
echo "  Hooks: PreToolUse + PostToolUse + Stop"
echo ""
echo "  Restart Claude Code to activate."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
