// Next.js dev server launcher for Claude Code preview
process.chdir('/Users/pero/kosodate-map');
const port = process.env.PORT || '3002';
process.argv = ['node', 'next', 'dev', '--port', port];
require('/Users/pero/kosodate-map/node_modules/next/dist/bin/next');
