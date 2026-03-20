#!/bin/bash
# oh-my-hwclaude uninstaller
# Removes MCP server, hooks, and rules from Claude Code settings
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
RULES_DIR="$CLAUDE_DIR/rules"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  oh-my-hwclaude uninstaller"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Remove rules
echo "🗑️  Removing rules, commands, agents..."
rm -f "$RULES_DIR"/hwclaude-*.md
rm -f "$CLAUDE_DIR"/commands/hwclaude-*.md
rm -f "$CLAUDE_DIR"/agents/hwclaude-*.md
echo "  ✓ Rules, commands, agents removed"

# 2. Update Claude Code settings
echo "⚙️  Updating Claude Code settings..."

if [ -f "$SETTINGS_FILE" ]; then
  node -e "
const fs = require('fs');

const settingsPath = '$SETTINGS_FILE';
let settings;
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} catch {
  process.exit(0);
}

// Remove MCP server
if (settings.mcpServers) {
  delete settings.mcpServers['oh-my-hwclaude'];
}

// Remove hooks
if (settings.hooks) {
  for (const hookType of ['PreToolUse', 'PostToolUse', 'Stop']) {
    if (settings.hooks[hookType]) {
      settings.hooks[hookType] = settings.hooks[hookType].filter(
        h => !h.command || !h.command.includes('hwclaude')
      );
      if (settings.hooks[hookType].length === 0) {
        delete settings.hooks[hookType];
      }
    }
  }
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }
}

// Remove permissions
if (settings.permissions && settings.permissions.allow) {
  settings.permissions.allow = settings.permissions.allow.filter(
    p => !p.includes('oh-my-hwclaude')
  );
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
console.log('  ✓ Settings cleaned');
"
fi

echo ""
echo "✅ oh-my-hwclaude uninstalled. Restart Claude Code to apply."
