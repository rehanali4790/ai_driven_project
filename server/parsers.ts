import fs from "fs/promises";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { DocumentType } from "./types";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

async function extractPdfPages(filePath: string): Promise<ExtractedPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = await fs.readFile(filePath);
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDocument = await loadingTask.promise;

  const pages: ExtractedPage[] = [];
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({
      pageNumber,
      text: text || `Page ${pageNumber} had no extractable text.`,
    });
  }

  return pages;
}

async function extractExcelPages(filePath: string): Promise<ExtractedPage[]> {
  const workbook = XLSX.readFile(filePath);
  return workbook.SheetNames.map((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
    const preview = rows
      .slice(0, 30)
      .map((row) => JSON.stringify(row))
      .join("\n");

    return {
      pageNumber: index + 1,
      text: `Sheet: ${sheetName}\n${preview}`,
    };
  });
}

async function extractWordPages(filePath: string): Promise<ExtractedPage[]> {
  const result = await mammoth.extractRawText({ path: filePath });
  return [
    {
      pageNumber: 1,
      text: result.value || "The Word document had no extractable text.",
    },
  ];
}

async function extractGenericText(filePath: string): Promise<ExtractedPage[]> {
  const content = await fs.readFile(filePath, "utf8").catch(() => "");
  return [
    {
      pageNumber: 1,
      text: content || "This file type could not be parsed directly. Use metadata and filename context only.",
    },
  ];
}

export async function extractDocumentPages(filePath: string, type: DocumentType) {
  switch (type) {
    case "pdf":
      return extractPdfPages(filePath);
    case "excel":
      return extractExcelPages(filePath);
    case "word":
      return extractWordPages(filePath);
    default:
      return extractGenericText(filePath);
  }
}

export function inferDocumentType(mimeType: string, fileName: string): DocumentType {
  const lowerName = fileName.toLowerCase();
  if (mimeType.includes("pdf") || lowerName.endsWith(".pdf")) return "pdf";
  if (
    mimeType.includes("sheet") ||
    mimeType.includes("excel") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls")
  ) {
    return "excel";
  }
  if (
    mimeType.includes("word") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc")
  ) {
    return "word";
  }
  if (mimeType.includes("image") || /\.(png|jpg|jpeg|webp)$/i.test(lowerName)) {
    return "image";
  }
  return "other";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
