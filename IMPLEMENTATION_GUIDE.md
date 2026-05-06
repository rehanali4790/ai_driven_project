# Implementation Guide: Fix Data Extraction

## Summary of Changes Made

### ✅ Completed
1. **Replaced Minimax with OpenAI** - All API calls now use OpenAI
2. **Enhanced AI Prompts** - More specific instructions for structured data extraction
3. **Updated Type Definitions** - Added `activityId`, `duration`, `parentActivity` fields
4. **Created Enhanced Parser** - New `server/enhanced-parsers.ts` with structure detection
5. **Created Analysis Document** - Detailed problem analysis in `ANALYSIS_DATA_EXTRACTION_ISSUES.md`

### 🔄 Next Steps Required

## Phase 1: Integrate Enhanced Parser (High Priority)

### Step 1: Update server/index.ts to use enhanced parser

Replace the document processing logic:

```typescript
// At the top, add import
import { extractStructuredPdfPages, aggregateProjectMetadata, aggregateActivities } from "./enhanced-parsers";

// In processDocument function, replace:
const pages = await extractDocumentPages(document.localPath!, document.type);

// With:
const structuredPages = document.type === "pdf" 
  ? await extractStructuredPdfPages(document.localPath!)
  : await extractDocumentPages(document.localPath!, document.type);

// After extraction, use structured data:
if (document.type === "pdf" && "activities" in structuredPages[0]) {
  const projectMetadata = aggregateProjectMetadata(structuredPages);
  const allActivities = aggregateActivities(structuredPages);
  
  // Update project info if found
  if (projectMetadata.projectName) {
    updateDocument(document.id, (current) => ({
      ...current,
      lastMessage: `Found project: ${projectMetadata.projectName}`,
    }));
  }
}
```

### Step 2: Update OpenAI artifact generation prompt

In `server/openai.ts`, update `generateProjectArtifacts`:

```typescript
const response = await client.chat.completions.create({
  model: process.env.OPENAI_MODEL || "gpt-4o",
  temperature: 0.2,
  response_format: { type: "json_object" },
  messages: [
    {
      role: "system",
      content: `You are an expert PMO AI. Convert extracted construction project information into canonical project artifacts.

CRITICAL INSTRUCTIONS:
1. Build a proper WBS hierarchy based on parentActivity relationships
2. Use activityId as the unique identifier when available
3. Calculate task dependencies based on date sequences
4. Preserve all extracted metadata (duration, activityId, parentActivity)
5. Create realistic WBS levels: Project > Phase > Deliverable > Work Package > Task
6. Group related activities under common parents

Return JSON with:
{
  "summary": "Brief project summary",
  "projectUpdates": {
    "name": "Full project name",
    "client": "Client name",
    "location": "Location",
    "budget": "Budget if found",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "description": "Project description"
  },
  "tasks": [...], // All tasks with proper structure
  "resources": [...],
  "milestones": [...],
  "risks": [...],
  "wbs": {
    "id": "1",
    "code": "1.0",
    "name": "Project Name",
    "level": 0,
    "type": "project",
    "progress": 0-100,
    "status": "in_progress",
    "children": [
      {
        "id": "1.1",
        "code": "1.1",
        "name": "Phase Name",
        "level": 1,
        "type": "phase",
        "progress": 0-100,
        "status": "...",
        "children": [...]
      }
    ]
  }
}`,
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          currentProject: currentState.project,
          extracted: aggregate,
        },
        null,
        2,
      ),
    },
  ],
});
```

### Step 3: Add post-processing for dependencies

Create a new function in `server/openai.ts`:

```typescript
/**
 * Calculate task dependencies based on date sequences
 * If task B starts when task A ends, B depends on A
 */
function calculateDependencies(tasks: PartialTask[]): PartialTask[] {
  return tasks.map(task => {
    if (!task.start) return task;
    
    const dependencies = tasks
      .filter(t => t.end === task.start && t.name !== task.name)
      .map(t => t.activityId || t.name)
      .slice(0, 5); // Limit to 5 dependencies
    
    return {
      ...task,
      dependencies: dependencies.length > 0 ? dependencies : task.dependencies || [],
    };
  });
}

// Use it in generateProjectArtifacts after parsing:
const tasksWithDeps = calculateDependencies(parsed.tasks);
return {
  ...parsed,
  tasks: tasksWithDeps,
};
```

### Step 4: Build proper WBS hierarchy

Add this function to `server/openai.ts`:

```typescript
/**
 * Build WBS hierarchy from flat task list with parentActivity relationships
 */
function buildWBSFromTasks(tasks: PartialTask[], projectName: string, projectProgress: number): WBSNode {
  // Group tasks by parent
  const tasksByParent = new Map<string | undefined, PartialTask[]>();
  
  for (const task of tasks) {
    const parent = task.parentActivity || "root";
    if (!tasksByParent.has(parent)) {
      tasksByParent.set(parent, []);
    }
    tasksByParent.get(parent)!.push(task);
  }

  // Find all unique parents (these become WBS nodes)
  const parents = new Set<string>();
  for (const task of tasks) {
    if (task.parentActivity) {
      parents.add(task.parentActivity);
    }
  }

  // Build WBS nodes for parents
  const wbsNodes: WBSNode[] = [];
  let nodeIndex = 1;

  for (const parent of parents) {
    const childTasks = tasksByParent.get(parent) || [];
    const avgProgress = childTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / Math.max(childTasks.length, 1);
    
    const children: WBSNode[] = childTasks.map((task, idx) => ({
      id: `1.${nodeIndex}.${idx + 1}`,
      code: `1.${nodeIndex}.${idx + 1}`,
      name: task.activityId ? `${task.activityId}: ${task.name}` : task.name,
      level: 2,
      type: "task" as const,
      progress: task.progress || 0,
      status: task.status || "not_started",
    }));

    wbsNodes.push({
      id: `1.${nodeIndex}`,
      code: `1.${nodeIndex}`,
      name: parent,
      level: 1,
      type: "phase" as const,
      progress: Math.round(avgProgress),
      status: avgProgress >= 100 ? "completed" : avgProgress > 0 ? "in_progress" : "not_started",
      children,
    });

    nodeIndex++;
  }

  // Root tasks (no parent)
  const rootTasks = tasksByParent.get("root") || [];
  if (rootTasks.length > 0) {
    const children: WBSNode[] = rootTasks.map((task, idx) => ({
      id: `1.${nodeIndex}.${idx + 1}`,
      code: `1.${nodeIndex}.${idx + 1}`,
      name: task.activityId ? `${task.activityId}: ${task.name}` : task.name,
      level: 2,
      type: "task" as const,
      progress: task.progress || 0,
      status: task.status || "not_started",
    }));

    wbsNodes.push({
      id: `1.${nodeIndex}`,
      code: `1.${nodeIndex}`,
      name: "Other Activities",
      level: 1,
      type: "phase" as const,
      progress: Math.round(rootTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / rootTasks.length),
      status: "in_progress",
      children,
    });
  }

  return {
    id: "1",
    code: "1.0",
    name: projectName || "Project",
    level: 0,
    type: "project",
    progress: projectProgress,
    status: "in_progress",
    children: wbsNodes,
  };
}

// Use in generateProjectArtifacts:
const wbs = buildWBSFromTasks(
  tasksWithDeps,
  aggregate.projectUpdates?.name || currentState.project.name,
  aggregate.projectUpdates?.progress || currentState.project.progress
);

return {
  ...parsed,
  wbs,
};
```

## Phase 2: Update Frontend Components

### Step 1: Update GanttChart to show Activity IDs

In `src/components/GanttChart.tsx`:

```typescript
// Display format: "A1002: Cutting and removing trees"
const displayName = task.activityId 
  ? `${task.activityId}: ${task.name}`
  : task.name;
```

### Step 2: Update WBSView to show hierarchy

In `src/components/WBSView.tsx`:

```typescript
// Add indentation based on level
const indentStyle = {
  paddingLeft: `${node.level * 24}px`
};

// Show activity ID if available
const displayCode = node.code || node.id;
```

### Step 3: Update Dashboard to use real stats

In `src/components/Dashboard.tsx`:

```typescript
// Calculate real stats from tasks
const totalTasks = state.tasks.length;
const completedTasks = state.tasks.filter(t => t.status === "completed").length;
const inProgressTasks = state.tasks.filter(t => t.status === "in_progress").length;
const atRiskTasks = state.tasks.filter(t => t.status === "at_risk").length;
```

## Phase 3: Testing

### Test Case 1: Upload PDF
1. Upload "285 - Submission of Revised Work Program.pdf"
2. Verify extraction completes without errors
3. Check console logs for structured data

### Test Case 2: Verify Project Metadata
1. Go to Project Overview
2. Verify project name, client, location are populated
3. Verify start/end dates are correct

### Test Case 3: Verify WBS Structure
1. Go to WBS Structure view
2. Verify hierarchy shows:
   - Project level
   - Phase level (Pre Construction, Construction, etc.)
   - Activity level with IDs
3. Verify progress percentages are realistic

### Test Case 4: Verify Gantt Chart
1. Go to Gantt Chart
2. Verify tasks show activity IDs
3. Verify date ranges span from 2025 to 2027
4. Verify dependencies are shown
5. Verify critical path is highlighted

### Test Case 5: Verify Dashboard Stats
1. Go to Dashboard
2. Verify task counts match extracted data
3. Verify progress percentages are realistic
4. Verify resource utilization is calculated

## Phase 4: Optimization

### Performance Improvements
1. **Batch AI Requests**: Process multiple pages in parallel
2. **Cache Results**: Store parsed data to avoid re-processing
3. **Incremental Updates**: Only re-process changed pages

### Accuracy Improvements
1. **Add Validation**: Check extracted dates are valid
2. **Add Deduplication**: Remove duplicate activities
3. **Add Conflict Resolution**: Handle overlapping data

### User Experience
1. **Progress Indicators**: Show detailed progress during extraction
2. **Error Handling**: Show specific errors with suggestions
3. **Manual Corrections**: Allow users to fix extraction errors

## Troubleshooting

### Issue: Tasks still showing truncated names
**Solution**: Check that the enhanced parser is being used and AI prompt is updated

### Issue: No project metadata extracted
**Solution**: Verify PDF header contains project info, update regex patterns in enhanced-parsers.ts

### Issue: WBS is still flat
**Solution**: Ensure parentActivity relationships are being extracted and buildWBSFromTasks is called

### Issue: Gantt chart shows all tasks on same date
**Solution**: Verify date parsing is working, check that start/end dates are in ISO format

### Issue: OpenAI quota exceeded
**Solution**: The fallback logic will still work, but with less accuracy. Consider upgrading OpenAI plan.

## Monitoring

### Key Metrics to Track
1. **Extraction Success Rate**: % of PDFs successfully parsed
2. **Data Accuracy**: % of activities with valid dates
3. **Processing Time**: Average time per page
4. **AI Cost**: OpenAI API usage per document

### Logging
Add detailed logging in key functions:
```typescript
console.log(`[PDF Parser] Extracted ${activities.length} activities from page ${pageNumber}`);
console.log(`[AI] Parsed ${parsed.tasks.length} tasks with ${parsed.milestones.length} milestones`);
console.log(`[WBS] Built hierarchy with ${wbsNodes.length} phases`);
```

## Conclusion

These changes will transform the data extraction from raw text dumps to structured, hierarchical project data that can be properly visualized in the Gantt chart, WBS view, and dashboard.

The key improvements are:
1. ✅ Better PDF parsing with structure detection
2. ✅ Enhanced AI prompts with specific instructions
3. ✅ Post-processing to build relationships
4. ✅ Proper WBS hierarchy generation
5. ✅ Dependency calculation
6. ✅ Activity ID extraction and display

After implementing these changes, the platform will properly extract and utilize data from construction project schedules.
