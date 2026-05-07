/**
 * Fix Ammaz Project WBS Root Node
 * This script initializes the WBS root node for the Ammaz project
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_FILE = path.join(__dirname, 'data', 'workspace.json');

console.log('🔧 Fixing Ammaz Project WBS Root Node...\n');

// Read workspace
const workspace = JSON.parse(fs.readFileSync(WORKSPACE_FILE, 'utf8'));

// Find Ammaz project
const ammazProject = workspace.projects.find(p => p.name === 'Ammaz');

if (!ammazProject) {
  console.error('❌ Ammaz project not found!');
  process.exit(1);
}

console.log('✓ Found Ammaz project:', ammazProject.id);
console.log('  Current WBS root:', JSON.stringify(ammazProject.state.wbs, null, 2));

// Fix WBS root node
ammazProject.state.wbs = {
  id: ammazProject.id,
  code: '1.0',
  name: 'Ammaz',
  level: 0,
  type: 'project',
  progress: 0,
  status: 'not_started',
  children: []
};

// Update timestamp
ammazProject.state.lastUpdatedAt = new Date().toISOString();
workspace.lastUpdatedAt = new Date().toISOString();

// Write back to file
fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(workspace, null, 2), 'utf8');

console.log('\n✅ WBS Root Node Fixed!');
console.log('  New WBS root:', JSON.stringify(ammazProject.state.wbs, null, 2));
console.log('\n📝 Now you can:');
console.log('  1. Refresh your browser');
console.log('  2. Go to WBS Editor');
console.log('  3. Select "Ammaz" as Parent Node');
console.log('  4. Add child nodes\n');
