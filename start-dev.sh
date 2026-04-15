#!/bin/bash
export PATH="/opt/homebrew/Cellar/node/25.4.0/bin:$PATH"
cd /Users/pero/kosodate-map
exec node node_modules/next/dist/bin/next dev --port 3000
