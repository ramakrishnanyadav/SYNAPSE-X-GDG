import esbuild from 'esbuild';
import fs from 'fs';

const manifest = {
  "manifest_version": 3,
  "name": "SYNAPSE",
  "version": "1.0",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://claude.ai/*"],
      "js": ["claude.js"]
    },
    {
      "matches": ["https://chatgpt.com/*"],
      "js": ["chatgpt.js"]
    }
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "https://claude.ai/*",
    "https://chatgpt.com/*",
    "https://gemini.google.com/*"
  ]
};

if (!fs.existsSync('build')) fs.mkdirSync('build');
fs.writeFileSync('build/manifest.json', JSON.stringify(manifest, null, 2));

fs.writeFileSync('build/popup.html', `<!DOCTYPE html><html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="styles.css"></head><body><div id="root"></div><script src="popup.js"></script></body></html>`);

const reactStr = "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport Dashboard from './Dashboard';\n\nconst root = createRoot(document.getElementById('root'));\nroot.render(<Dashboard />);";
fs.writeFileSync('src/popup/index.tsx', reactStr);

try {
  await esbuild.build({
    entryPoints: {
      'background': 'src/background/index.ts',
      'claude': 'src/contents/claude.ts',
      'chatgpt': 'src/contents/chatgpt.ts',
      'popup': 'src/popup/index.tsx'
    },
    outdir: 'build',
    bundle: true,
    format: 'esm',
    target: ['chrome100'],
    define: { 'process.env.NODE_ENV': '"production"' }
  });
  console.log('BUILD SUCCESS: Emergency escape hatch triggered. The "build" folder is fully compiled and ready.');
} catch (e) {
  console.error(e);
}
