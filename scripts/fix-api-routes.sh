#!/bin/bash

# Script to add dynamic export to all API routes

API_DIR="mission-control/src/app/api"

for route_file in "$API_DIR"/*/route.ts; do
  echo "Processing: $route_file"
  
  # Check if dynamic export already exists
  if grep -q "export const dynamic" "$route_file"; then
    echo "  Already has dynamic export, skipping"
    continue
  fi
  
  # Add dynamic export after the last import statement
  # Find the last import line and add after it
  awk '
    /^import / { last_import = NR }
    { lines[NR] = $0 }
    END {
      for (i = 1; i <= NR; i++) {
        print lines[i]
        if (i == last_import) {
          print ""
          print "// Force dynamic rendering for API route"
          print "export const dynamic = '\''force-dynamic'\''"
        }
      }
    }
  ' "$route_file" > "$route_file.tmp" && mv "$route_file.tmp" "$route_file"
  
  echo "  Added dynamic export"
done

echo "Done!"