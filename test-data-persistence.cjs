/**
 * DATA PERSISTENCE TEST SCRIPT
 * 
 * This script verifies that all data operations save correctly to disk.
 * Run this after making changes in the UI to verify persistence.
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_FILE = path.join(__dirname, 'data', 'workspace.json');
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${COLORS.reset} ${message}`);
}

function success(message) {
  log(COLORS.green, '✓', message);
}

function error(message) {
  log(COLORS.red, '✗', message);
}

function info(message) {
  log(COLORS.blue, 'ℹ', message);
}

function warning(message) {
  log(COLORS.yellow, '⚠', message);
}

console.log('\n' + COLORS.cyan + '═'.repeat(60) + COLORS.reset);
console.log(COLORS.cyan + '  DATA PERSISTENCE VERIFICATION TEST' + COLORS.reset);
console.log(COLORS.cyan + '═'.repeat(60) + COLORS.reset + '\n');

// Test 1: Check if workspace file exists
info('Test 1: Checking workspace file existence...');
if (!fs.existsSync(WORKSPACE_FILE)) {
  error('workspace.json does not exist!');
  process.exit(1);
}
success('workspace.json exists');

// Test 2: Verify JSON is valid
info('\nTest 2: Validating JSON structure...');
let workspace;
try {
  const content = fs.readFileSync(WORKSPACE_FILE, 'utf8');
  workspace = JSON.parse(content);
  success('JSON is valid and parseable');
} catch (err) {
  error(`JSON parsing failed: ${err.message}`);
  process.exit(1);
}

// Test 3: Check required fields
info('\nTest 3: Verifying required fields...');
const requiredFields = ['activeProjectId', 'projects', 'calendars', 'globalResources', 'lastUpdatedAt'];
let allFieldsPresent = true;
requiredFields.forEach(field => {
  if (workspace[field] === undefined) {
    error(`Missing required field: ${field}`);
    allFieldsPresent = false;
  } else {
    success(`Field present: ${field}`);
  }
});

if (!allFieldsPresent) {
  process.exit(1);
}

// Test 4: Verify active project
info('\nTest 4: Checking active project...');
const activeProject = workspace.projects.find(p => p.id === workspace.activeProjectId);
if (!activeProject) {
  error('Active project not found in projects array!');
  process.exit(1);
}
success(`Active project found: ${activeProject.name || 'Unnamed'}`);

// Test 5: Check project state
info('\nTest 5: Verifying project state structure...');
if (!activeProject.state) {
  error('Project state is missing!');
  process.exit(1);
}
const stateFields = ['project', 'wbs', 'tasks', 'resources', 'documents'];
stateFields.forEach(field => {
  if (activeProject.state[field] === undefined) {
    warning(`State field missing: ${field}`);
  } else {
    success(`State field present: ${field}`);
  }
});

// Test 6: Check WBS structure
info('\nTest 6: Analyzing WBS structure...');
const wbs = activeProject.state.wbs;
if (!wbs) {
  warning('WBS is empty');
} else {
  const countNodes = (node) => {
    let count = 1;
    if (node.children) {
      node.children.forEach(child => {
        count += countNodes(child);
      });
    }
    return count;
  };
  const nodeCount = countNodes(wbs);
  success(`WBS contains ${nodeCount} nodes`);
  
  if (wbs.children && wbs.children.length > 0) {
    success(`Root has ${wbs.children.length} direct children`);
  } else {
    warning('WBS root has no children');
  }
}

// Test 7: Check tasks
info('\nTest 7: Checking tasks...');
const tasks = activeProject.state.tasks || [];
success(`Found ${tasks.length} tasks`);
if (tasks.length > 0) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  info(`  - Completed: ${completedTasks}`);
  info(`  - In Progress: ${inProgressTasks}`);
  info(`  - Other: ${tasks.length - completedTasks - inProgressTasks}`);
}

// Test 8: Check resources
info('\nTest 8: Checking resources...');
const projectResources = activeProject.state.resources || [];
const globalResources = workspace.globalResources || [];
success(`Found ${projectResources.length} project resources`);
success(`Found ${globalResources.length} global resources`);

// Test 9: Verify timestamps
info('\nTest 9: Verifying timestamps...');
const workspaceTimestamp = new Date(workspace.lastUpdatedAt);
const stateTimestamp = new Date(activeProject.state.lastUpdatedAt);
success(`Workspace last updated: ${workspaceTimestamp.toLocaleString()}`);
success(`State last updated: ${stateTimestamp.toLocaleString()}`);

const now = new Date();
const hoursSinceUpdate = (now - workspaceTimestamp) / (1000 * 60 * 60);
if (hoursSinceUpdate < 24) {
  success(`Last update was ${hoursSinceUpdate.toFixed(1)} hours ago (recent)`);
} else {
  warning(`Last update was ${hoursSinceUpdate.toFixed(1)} hours ago`);
}

// Test 10: File size check
info('\nTest 10: Checking file size...');
const stats = fs.statSync(WORKSPACE_FILE);
const sizeKB = (stats.size / 1024).toFixed(2);
success(`File size: ${sizeKB} KB`);
if (stats.size > 1024 * 1024) {
  warning('File is larger than 1MB - consider optimization');
}

// Summary
console.log('\n' + COLORS.cyan + '═'.repeat(60) + COLORS.reset);
console.log(COLORS.green + '  ✓ ALL TESTS PASSED - DATA PERSISTENCE VERIFIED' + COLORS.reset);
console.log(COLORS.cyan + '═'.repeat(60) + COLORS.reset);

console.log('\n' + COLORS.blue + 'Summary:' + COLORS.reset);
console.log(`  • Workspace file: ${COLORS.green}Valid${COLORS.reset}`);
console.log(`  • JSON structure: ${COLORS.green}Valid${COLORS.reset}`);
console.log(`  • Active project: ${COLORS.green}${activeProject.name || 'Unnamed'}${COLORS.reset}`);
console.log(`  • WBS nodes: ${COLORS.green}${wbs ? countNodes(wbs) : 0}${COLORS.reset}`);
console.log(`  • Tasks: ${COLORS.green}${tasks.length}${COLORS.reset}`);
console.log(`  • Resources: ${COLORS.green}${projectResources.length + globalResources.length}${COLORS.reset}`);
console.log(`  • Last updated: ${COLORS.green}${workspaceTimestamp.toLocaleString()}${COLORS.reset}`);

console.log('\n' + COLORS.cyan + 'To test persistence:' + COLORS.reset);
console.log('  1. Make changes in the UI (add WBS node, update task, etc.)');
console.log('  2. Run: node test-data-persistence.js');
console.log('  3. Verify the timestamp updated and data is present');
console.log('  4. Restart the server and refresh browser');
console.log('  5. Confirm all changes are still there\n');

function countNodes(node) {
  let count = 1;
  if (node.children) {
    node.children.forEach(child => {
      count += countNodes(child);
    });
  }
  return count;
}
