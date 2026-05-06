# Testing Data Extraction Improvements

## Pre-Test Checklist

- [ ] OpenAI API key configured in `.env`
- [ ] Server restarted after changes
- [ ] Browser cache cleared
- [ ] Sample PDF available: "285 - Submission of Revised Work Program.pdf"

## Test 1: Basic Extraction

### Steps
1. Start the application:
   ```bash
   npm run dev
   ```

2. Open browser: http://localhost:5173

3. Navigate to Documents tab

4. Upload the PDF: "285 - Submission of Revised Work Program.pdf"

5. Wait for processing to complete (watch progress indicator)

### Expected Results
- ✅ Processing completes without errors
- ✅ Progress bar reaches 100%
- ✅ Status shows "completed"
- ✅ Console shows: "Found project: [project name] with [X] activities"

### Actual Results
- [ ] Pass / [ ] Fail
- Notes: _______________

---

## Test 2: Project Metadata Extraction

### Steps
1. After upload completes, navigate to "Project Overview"

2. Check the project information section

### Expected Results
- ✅ Project Name: "Education City Infrastructure Development - Phase 1" (or similar)
- ✅ Client: Populated (if in PDF)
- ✅ Location: Populated (if in PDF)
- ✅ Start Date: Valid date (2025-01-20 or similar)
- ✅ End Date: Valid date (2027-10-30 or similar)
- ✅ Progress: Realistic percentage (not 0% or 100%)

### Actual Results
- Project Name: _______________
- Client: _______________
- Location: _______________
- Start Date: _______________
- End Date: _______________
- Progress: _______________
- [ ] Pass / [ ] Fail

---

## Test 3: Task Extraction with Activity IDs

### Steps
1. Navigate to "Gantt Chart"

2. Examine the task list on the left side

### Expected Results
- ✅ Tasks show activity IDs: "A1002: Cutting and removing trees"
- ✅ NOT truncated text: "Activity ID Activity Name Original Duration..."
- ✅ Multiple tasks visible (50+)
- ✅ Task names are readable and complete

### Actual Results
- Number of tasks: _______________
- Sample task names:
  1. _______________
  2. _______________
  3. _______________
- [ ] Pass / [ ] Fail

---

## Test 4: WBS Hierarchy

### Steps
1. Navigate to "WBS Structure"

2. Expand the root node

3. Examine the hierarchy

### Expected Results
- ✅ Multiple levels visible (Project > Phase > Work Package)
- ✅ Phase names are meaningful (not "Planning & Design", "Construction Delivery")
- ✅ Should show actual phases like "Pre Construction Phase", "Construction Phase"
- ✅ Work packages show activity IDs
- ✅ Progress percentages vary by phase

### Actual Results
- Number of phases: _______________
- Phase names:
  1. _______________
  2. _______________
  3. _______________
- [ ] Pass / [ ] Fail

---

## Test 5: Gantt Chart Timeline

### Steps
1. Navigate to "Gantt Chart"

2. Check the timeline header (months)

3. Examine task bars

### Expected Results
- ✅ Timeline spans multiple years (2025-2027)
- ✅ NOT all tasks on same date
- ✅ Task bars have different lengths
- ✅ Task bars show progress (colored sections)
- ✅ Critical tasks highlighted (red border)

### Actual Results
- Timeline start: _______________
- Timeline end: _______________
- Tasks spread across timeline: [ ] Yes / [ ] No
- [ ] Pass / [ ] Fail

---

## Test 6: Milestones

### Steps
1. Navigate to "Gantt Chart"

2. Look for diamond-shaped milestone markers

3. Check milestone list (if available)

### Expected Results
- ✅ Milestones visible as diamonds
- ✅ Milestone names include activity IDs
- ✅ Examples: "A50040: Project Commencement", "A50050: Project Completion"

### Actual Results
- Number of milestones: _______________
- Sample milestones:
  1. _______________
  2. _______________
- [ ] Pass / [ ] Fail

---

## Test 7: Dashboard Statistics

### Steps
1. Navigate to "Dashboard"

2. Check the statistics cards

### Expected Results
- ✅ Total Tasks: Realistic number (100+, not 25)
- ✅ Completed Tasks: Some number > 0
- ✅ In Progress: Some number > 0
- ✅ Resource Utilization: Percentage shown
- ✅ Progress matches project overview

### Actual Results
- Total Tasks: _______________
- Completed: _______________
- In Progress: _______________
- At Risk: _______________
- [ ] Pass / [ ] Fail

---

## Test 8: Dependencies

### Steps
1. Navigate to "Gantt Chart"

2. Hover over task bars (if tooltips available)

3. Check console logs for dependency data

### Expected Results
- ✅ Some tasks have dependencies array populated
- ✅ Dependencies reference activity IDs
- ✅ Logical dependencies (task B depends on task A if A ends when B starts)

### Actual Results
- Tasks with dependencies: _______________
- Sample dependency: _______________
- [ ] Pass / [ ] Fail

---

## Test 9: Risk Analysis

### Steps
1. Navigate to "Dashboard"

2. Check the "AI Insights" section

3. Look for risk items

### Expected Results
- ✅ At least one risk identified
- ✅ Risks have severity levels (high/medium/low)
- ✅ Risks have descriptions and mitigation strategies
- ✅ Examples: "X Overdue Tasks", "Y Critical Tasks At Risk"

### Actual Results
- Number of risks: _______________
- Sample risks:
  1. _______________
  2. _______________
- [ ] Pass / [ ] Fail

---

## Test 10: AI Regeneration

### Steps
1. Navigate to "Gantt Chart"

2. Click "AI Update" button

3. Wait for processing

### Expected Results
- ✅ Button shows "Updating..." with spinner
- ✅ Processing completes successfully
- ✅ Data refreshes
- ✅ No errors in console

### Actual Results
- [ ] Pass / [ ] Fail
- Notes: _______________

---

## Performance Tests

### Test 11: Processing Speed

### Steps
1. Note the time when upload starts

2. Note the time when processing completes

### Expected Results
- ✅ Processing completes in < 5 minutes for 33-page PDF
- ✅ Progress updates smoothly
- ✅ No timeouts or errors

### Actual Results
- Processing time: _______________
- [ ] Pass / [ ] Fail

---

## Error Handling Tests

### Test 12: Invalid PDF

### Steps
1. Try uploading a non-PDF file or corrupted PDF

### Expected Results
- ✅ Error message displayed
- ✅ Document marked as "failed"
- ✅ Error description provided
- ✅ Application remains stable

### Actual Results
- [ ] Pass / [ ] Fail
- Notes: _______________

---

## Test 13: OpenAI Quota Exceeded

### Steps
1. Temporarily set invalid OpenAI API key

2. Upload PDF

### Expected Results
- ✅ Fallback logic activates
- ✅ Basic extraction still works (using regex patterns)
- ✅ Message indicates OpenAI unavailable
- ✅ Some data still extracted

### Actual Results
- [ ] Pass / [ ] Fail
- Notes: _______________

---

## Regression Tests

### Test 14: Excel Upload

### Steps
1. Upload an Excel file with project data

### Expected Results
- ✅ Excel processing still works
- ✅ Data extracted from sheets
- ✅ No errors

### Actual Results
- [ ] Pass / [ ] Fail

---

### Test 15: Word Upload

### Steps
1. Upload a Word document

### Expected Results
- ✅ Word processing still works
- ✅ Text extracted
- ✅ No errors

### Actual Results
- [ ] Pass / [ ] Fail

---

## Summary

### Overall Results
- Tests Passed: ___ / 15
- Tests Failed: ___ / 15
- Critical Issues: _______________
- Minor Issues: _______________

### Key Improvements Verified
- [ ] Activity IDs extracted and displayed
- [ ] Project metadata populated
- [ ] Hierarchical WBS structure
- [ ] Proper timeline in Gantt chart
- [ ] Task dependencies calculated
- [ ] Milestones extracted
- [ ] Risks analyzed
- [ ] Real statistics in dashboard

### Issues Found
1. _______________
2. _______________
3. _______________

### Recommendations
1. _______________
2. _______________
3. _______________

---

## Console Log Checklist

Look for these messages in browser console:

- ✅ `[PDF Parser] Extracted X activities from page Y`
- ✅ `[AI] Parsed X tasks with Y milestones`
- ✅ `[WBS] Built hierarchy with X phases`
- ✅ `Found project: [name] with X activities`

---

## Data Validation

### Sample Data Check

Open browser DevTools > Application > Local Storage and check:

```json
{
  "project": {
    "name": "Should not be empty",
    "startDate": "Should be YYYY-MM-DD format",
    "endDate": "Should be YYYY-MM-DD format"
  },
  "tasks": [
    {
      "activityId": "Should be like A1002",
      "name": "Should be complete, not truncated",
      "start": "Should be YYYY-MM-DD",
      "end": "Should be YYYY-MM-DD",
      "duration": "Should be a number",
      "parentActivity": "Should reference parent if applicable"
    }
  ]
}
```

---

## Next Steps After Testing

### If All Tests Pass
1. Document the improvements
2. Update user documentation
3. Consider performance optimizations
4. Plan for additional features

### If Tests Fail
1. Review console errors
2. Check OpenAI API key
3. Verify PDF format compatibility
4. Review implementation guide
5. Check for TypeScript errors

---

## Support

If you encounter issues:
1. Check `ANALYSIS_DATA_EXTRACTION_ISSUES.md` for known problems
2. Review `IMPLEMENTATION_GUIDE.md` for solutions
3. Check console logs for specific errors
4. Verify OpenAI API key is valid and has quota
5. Ensure PDF is in Primavera P6 or MS Project format
