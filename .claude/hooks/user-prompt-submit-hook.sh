#!/bin/bash
# This hook runs before processing user prompts
# Use it to provide context-aware reminders

# Check if user is asking about files that might be in archive
if echo "$PROMPT" | grep -iq "archive"; then
    echo "⚠️  Note: Archive folder is excluded by default. Specify if you need archive data explicitly."
fi

# Remind about token efficiency for broad searches
if echo "$PROMPT" | grep -Eiq "search (the )?entire|search (the )?whole|find (all|everything)"; then
    echo "💡 Tip: Broad searches use many tokens. Consider being more specific with file names or paths."
fi

# Exit successfully to allow the prompt to proceed
exit 0
