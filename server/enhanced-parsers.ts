import fs from "fs/promises";
import { ExtractedPage } from "./parsers";

/**
 * Enhanced PDF parser that preserves structure and detects tables
 */

export interface StructuredActivity {
  activityId: string | null;
  name: string;
  duration: number | null;
  startDate: string | null;
  endDate: string | null;
  level: number;
  isGroup: boolean;
  isMilestone: boolean;
  parentName: string | null;
}

export interface StructuredPage extends ExtractedPage {
  activities: StructuredActivity[];
  projectMetadata: {
    projectName?: string;
    client?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Parse activity ID from text (e.g., A1002, A50010)
 */
function extractActivityId(text: string): string | null {
  const match = text.match(/\b([A-Z]\d{4,5})\b/);
  return match ? match[1] : null;
}

/**
 * Parse date in format DD-MMM-YY (e.g., 21-Feb-25)
 */
function parseDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{1,2})-([A-Z][a-z]{2})-(\d{2})/);
  if (!match) return null;

  const [, day, monthStr, year] = match;
  const monthMap: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
  };

  const month = monthMap[monthStr];
  if (!month) return null;

  // Convert 2-digit year to 4-digit (25 -> 2025, 26 -> 2026)
  const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;

  return `${fullYear}-${month}-${day.padStart(2, "0")}`;
}

/**
 * Detect indentation level from text positioning
 */
function detectIndentationLevel(text: string): number {
  const leadingSpaces = text.match(/^(\s*)/)?.[1].length || 0;
  return Math.floor(leadingSpaces / 2);
}

/**
 * Parse a single activity line from Primavera P6 format
 * Format: "Activity ID Activity Name Duration Start End"
 * Example: "A1002 Cutting and removing trees 14 21-Feb-25 08-Mar-25"
 */
function parseActivityLine(line: string): StructuredActivity | null {
  // Try to match activity pattern
  const activityPattern = /^([A-Z]\d{4,5})\s+(.+?)\s+(\d+)\s+(\d{1,2}-[A-Z][a-z]{2}-\d{2})\s+(\d{1,2}-[A-Z][a-z]{2}-\d{2})/;
  const match = line.match(activityPattern);

  if (match) {
    const [, activityId, name, duration, startDate, endDate] = match;
    return {
      activityId,
      name: name.trim(),
      duration: parseInt(duration),
      startDate: parseDate(startDate),
      endDate: parseDate(endDate),
      level: detectIndentationLevel(line),
      isGroup: false,
      isMilestone: parseInt(duration) === 0,
      parentName: null,
    };
  }

  // Try to match group/phase pattern (no activity ID)
  const groupPattern = /^([A-Za-z\s&]+)\s+\1\s+(\d+)\s+(\d{1,2}-[A-Z][a-z]{2}-\d{2})\s+(\d{1,2}-[A-Z][a-z]{2}-\d{2})/;
  const groupMatch = line.match(groupPattern);

  if (groupMatch) {
    const [, name, duration, startDate, endDate] = groupMatch;
    return {
      activityId: null,
      name: name.trim(),
      duration: parseInt(duration),
      startDate: parseDate(startDate),
      endDate: parseDate(endDate),
      level: detectIndentationLevel(line),
      isGroup: true,
      isMilestone: false,
      parentName: null,
    };
  }

  return null;
}

/**
 * Extract project metadata from PDF header
 */
function extractProjectMetadata(text: string): StructuredPage["projectMetadata"] {
  const metadata: StructuredPage["projectMetadata"] = {};

  // Try to find project name (usually in title or first lines)
  const projectNameMatch = text.match(/(?:REVISED SCHEDULE|PROJECT:?)\s+([A-Z][A-Za-z\s,]+?)(?:\s+PHASE|\s+\d|$)/i);
  if (projectNameMatch) {
    metadata.projectName = projectNameMatch[1].trim();
  }

  // Try to find location
  const locationMatch = text.match(/(?:Location|Site):?\s+([A-Za-z\s,]+?)(?:\s+\d|\s+Phase|$)/i);
  if (locationMatch) {
    metadata.location = locationMatch[1].trim();
  }

  // Try to find date range
  const dateRangeMatch = text.match(/(\d{1,2}-[A-Z][a-z]{2}-\d{2})\s+(\d{1,2}-[A-Z][a-z]{2}-\d{2})/);
  if (dateRangeMatch) {
    metadata.startDate = parseDate(dateRangeMatch[1]);
    metadata.endDate = parseDate(dateRangeMatch[2]);
  }

  return metadata;
}

/**
 * Build parent-child relationships based on indentation and grouping
 */
function buildHierarchy(activities: StructuredActivity[]): StructuredActivity[] {
  const result: StructuredActivity[] = [];
  const stack: StructuredActivity[] = [];

  for (const activity of activities) {
    // Pop stack until we find the parent level
    while (stack.length > 0 && stack[stack.length - 1].level >= activity.level) {
      stack.pop();
    }

    // Set parent if exists
    if (stack.length > 0) {
      activity.parentName = stack[stack.length - 1].name;
    }

    result.push(activity);
    stack.push(activity);
  }

  return result;
}

function parseActivitiesFromPageText(text: string): StructuredActivity[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const datePattern = "\\d{1,2}-[A-Za-z]{3}-\\d{2,4}";
  const groupRegex = new RegExp(
    `([A-Za-z][A-Za-z0-9 &/()+.,-]{2,90}?)\\s+\\1\\s+(\\d{1,4})\\s+(${datePattern})\\s+(${datePattern})`,
    "g",
  );
  const activityRegex = new RegExp(
    `\\b([A-Z]\\d{3,6})\\b\\s+(.+?)\\s+(\\d{1,4})\\s+(${datePattern})\\s+(${datePattern})`,
    "g",
  );

  const groups: { index: number; name: string }[] = [];
  for (const groupMatch of normalized.matchAll(groupRegex)) {
    if (!groupMatch.index || !groupMatch[1]) continue;
    groups.push({ index: groupMatch.index, name: groupMatch[1].trim() });
  }

  const activities: StructuredActivity[] = [];
  for (const match of normalized.matchAll(activityRegex)) {
    const [, activityId, name, durationRaw, startRaw, endRaw] = match;
    const idx = match.index ?? 0;
    const parentName = [...groups].reverse().find((group) => group.index < idx)?.name ?? null;
    const duration = Number.parseInt(durationRaw, 10);
    activities.push({
      activityId: activityId ?? null,
      name: (name || "").trim(),
      duration: Number.isFinite(duration) ? duration : null,
      startDate: parseDate(startRaw),
      endDate: parseDate(endRaw),
      level: parentName ? 2 : 1,
      isGroup: false,
      isMilestone: duration === 0,
      parentName,
    });
  }

  const deduped = new Map<string, StructuredActivity>();
  for (const activity of activities) {
    const key = activity.activityId || activity.name;
    if (!deduped.has(key)) deduped.set(key, activity);
  }
  return [...deduped.values()];
}

/**
 * Enhanced PDF page extraction with structure detection
 */
export async function extractStructuredPdfPages(filePath: string): Promise<StructuredPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = await fs.readFile(filePath);
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDocument = await loadingTask.promise;

  const pages: StructuredPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();

    // Preserve positioning information
    const items = content.items as any[];
    const lines: string[] = [];
    let currentLine = "";
    let lastY = 0;

    // Group items by Y position (same line)
    for (const item of items) {
      if ("str" in item) {
        const y = item.transform[5];
        
        // New line detected (Y position changed significantly)
        if (Math.abs(y - lastY) > 5 && currentLine) {
          lines.push(currentLine.trim());
          currentLine = "";
        }

        currentLine += item.str + " ";
        lastY = y;
      }
    }

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    // Extract activities from line-by-line parsing first
    const activities: StructuredActivity[] = [];
    for (const line of lines) {
      const activity = parseActivityLine(line);
      if (activity) {
        activities.push(activity);
      }
    }

    // Extract metadata (usually on first page)
    const fullText = lines.join("\n");
    const tokenizedActivities = parseActivitiesFromPageText(fullText);
    const mergedActivities = tokenizedActivities.length ? tokenizedActivities : activities;

    // Build hierarchy
    const hierarchicalActivities = buildHierarchy(mergedActivities);
    const metadata = pageNumber === 1 ? extractProjectMetadata(fullText) : {};

    pages.push({
      pageNumber,
      text: fullText || `Page ${pageNumber} had no extractable text.`,
      activities: hierarchicalActivities,
      projectMetadata: metadata,
    });
  }

  return pages;
}

/**
 * Aggregate metadata from all pages
 */
export function aggregateProjectMetadata(pages: StructuredPage[]): StructuredPage["projectMetadata"] {
  const metadata: StructuredPage["projectMetadata"] = {};

  for (const page of pages) {
    if (page.projectMetadata.projectName && !metadata.projectName) {
      metadata.projectName = page.projectMetadata.projectName;
    }
    if (page.projectMetadata.client && !metadata.client) {
      metadata.client = page.projectMetadata.client;
    }
    if (page.projectMetadata.location && !metadata.location) {
      metadata.location = page.projectMetadata.location;
    }
    if (page.projectMetadata.startDate && !metadata.startDate) {
      metadata.startDate = page.projectMetadata.startDate;
    }
    if (page.projectMetadata.endDate && !metadata.endDate) {
      metadata.endDate = page.projectMetadata.endDate;
    }
  }

  return metadata;
}

/**
 * Aggregate all activities from all pages
 */
export function aggregateActivities(pages: StructuredPage[]): StructuredActivity[] {
  const allActivities: StructuredActivity[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    for (const activity of page.activities) {
      // Deduplicate by activity ID or name
      const key = activity.activityId || activity.name;
      if (!seen.has(key)) {
        seen.add(key);
        allActivities.push(activity);
      }
    }
  }

  return allActivities;
}
