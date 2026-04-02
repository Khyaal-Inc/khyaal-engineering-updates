#!/bin/bash
# This hook runs after tool executions
# Use it to add context or warnings based on tool results

TOOL_NAME="$1"

# If reading large files, remind about token usage
if [ "$TOOL_NAME" = "Read" ]; then
    if [ -n "$FILE_PATH" ]; then
        FILE_SIZE=$(wc -l < "$FILE_PATH" 2>/dev/null || echo 0)
        if [ "$FILE_SIZE" -gt 500 ]; then
            echo "📊 Note: Large file read ($FILE_SIZE lines). Consider using specific line ranges for efficiency."
        fi
    fi
fi

# Exit successfully
exit 0
