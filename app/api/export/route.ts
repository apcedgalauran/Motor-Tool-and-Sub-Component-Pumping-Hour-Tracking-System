export const runtime = 'nodejs';

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import {
  buildCsv,
  buildMotorTable,
  buildPartTable,
  describeMotorFilters,
  describePartFilters,
  filterMotorRecords,
  filterPartRecords,
  MOTOR_FIELD_OPTIONS,
  PART_FIELD_OPTIONS,
  PART_INSTALL_STATUS_OPTIONS,
  toDateOnly,
  type ExportFormat,
  type MotorExportFilters,
  type PartExportFilters,
  type PartExportRecord,
} from '@/lib/export-data';
import { MOTOR_STATUS_LABELS, STANDARD_MOTOR_STATUSES, SUB_COMPONENT_LABELS } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const PDF_MARGIN = 40;
const PDF_ROW_HEIGHT = 24;

const PDF_COLOR_TEXT_PRIMARY = rgb(17 / 255, 24 / 255, 39 / 255);
const PDF_COLOR_TEXT_SECONDARY = rgb(75 / 255, 85 / 255, 99 / 255);
const PDF_COLOR_TEXT_BODY = rgb(55 / 255, 65 / 255, 81 / 255);
const PDF_COLOR_BORDER = rgb(209 / 255, 213 / 255, 219 / 255);
const PDF_COLOR_HEADER_BG = rgb(243 / 255, 244 / 255, 246 / 255);
const PDF_COLOR_WHITE = rgb(1, 1, 1);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    // Legacy compatibility for old direct links.
    if (type === 'motors') {
      const motors = await getMotorRecords();
      const table = buildMotorTable(motors);
      const csv = buildCsv(table.headers, table.rows);

      return buildCsvResponse(csv, `motors-export-${todayStamp()}.csv`);
    }

    if (type === 'sub-components') {
      const parts = await getPartRecords();
      const table = buildPartTable(parts);
      const csv = buildCsv(table.headers, table.rows);

      return buildCsvResponse(csv, `sub-components-export-${todayStamp()}.csv`);
    }

    const options = await getExportOptions();
    return NextResponse.json(options);
  } catch (error) {
    console.error('GET /api/export failed', error);

    const detail = toErrorMessage(error);
    const message =
      process.env.NODE_ENV !== 'production' ? `Failed to load export options. ${detail}` : 'Failed to load export options.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type ExportBody = {
  type?: 'motors' | 'parts' | 'sub-components';
  format?: ExportFormat;
  fields?: string[];
  filters?: MotorExportFilters | PartExportFilters;
};

export async function POST(request: NextRequest) {
  const body = await safeJson<ExportBody>(request);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const type = normalizeExportType(body.type);
  const format = body.format;

  if (!type) {
    return NextResponse.json({ error: 'type must be "motors" or "parts".' }, { status: 400 });
  }

  if (format !== 'CSV' && format !== 'PDF') {
    return NextResponse.json({ error: 'format must be "CSV" or "PDF".' }, { status: 400 });
  }

  try {
    if (type === 'motors') {
      const filters = (body.filters || {}) as MotorExportFilters;
      const rows = filterMotorRecords(await getMotorRecords(), filters);
      const table = buildMotorTable(rows, body.fields);
      const dateStamp = todayStamp();

      if (format === 'CSV') {
        const csv = buildCsv(table.headers, table.rows);
        return buildCsvResponse(csv, `motors-export-${dateStamp}.csv`);
      }

      const pdf = await buildPdfBuffer({
        title: 'Motors Export',
        generatedAt: new Date(),
        appliedFilters: describeMotorFilters(filters),
        headers: table.headers,
        rows: table.rows,
      });
      return buildPdfResponse(pdf, `motors-export-${dateStamp}.pdf`);
    }

    const filters = (body.filters || {}) as PartExportFilters;
    const records = await getPartRecords();
    const filtered = filterPartRecords(records, filters);
    const table = buildPartTable(filtered, body.fields);
    const dateStamp = todayStamp();
    const motorNameById = buildMotorNameById(records);

    if (format === 'CSV') {
      const csv = buildCsv(table.headers, table.rows);
      return buildCsvResponse(csv, `parts-export-${dateStamp}.csv`);
    }

    const pdf = await buildPdfBuffer({
      title: 'Parts Export',
      generatedAt: new Date(),
      appliedFilters: describePartFilters(filters, motorNameById),
      headers: table.headers,
      rows: table.rows,
    });
    return buildPdfResponse(pdf, `parts-export-${dateStamp}.pdf`);
  } catch (error) {
    console.error('POST /api/export failed', { type, format, error });
    return buildExportFailureResponse(type, error);
  }
}

async function getExportOptions() {
  const [motors, customStatuses, subComponents] = await Promise.all([
    prisma.motor.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    }),
    prisma.customStatus.findMany({
      where: { isPermanent: true },
      select: { label: true },
      orderBy: { label: 'asc' },
    }),
    prisma.subComponent.findMany({
      select: { type: true },
      orderBy: { type: 'asc' },
    }),
  ]);

  const statusSet = new Set<string>(STANDARD_MOTOR_STATUSES);
  for (const customStatus of customStatuses) {
    statusSet.add(customStatus.label);
  }
  for (const motor of motors) {
    statusSet.add(motor.status);
  }

  const standardStatuses = STANDARD_MOTOR_STATUSES.filter((status) => statusSet.has(status));
  const nonStandardStatuses = [...statusSet]
    .filter((status) => !STANDARD_MOTOR_STATUSES.includes(status as (typeof STANDARD_MOTOR_STATUSES)[number]))
    .sort((a, b) => a.localeCompare(b));
  const motorStatusValues = [...standardStatuses, ...nonStandardStatuses];

  const typeSet = new Set<string>(Object.keys(SUB_COMPONENT_LABELS));
  for (const subComponent of subComponents) {
    typeSet.add(subComponent.type);
  }
  const componentTypes = [...typeSet]
    .sort((a, b) => {
      const aLabel = SUB_COMPONENT_LABELS[a] || a;
      const bLabel = SUB_COMPONENT_LABELS[b] || b;
      return aLabel.localeCompare(bLabel);
    })
    .map((value) => ({ value, label: SUB_COMPONENT_LABELS[value] || value }));

  return {
    motorStatuses: motorStatusValues.map((value) => ({ value, label: MOTOR_STATUS_LABELS[value] || value })),
    partStatuses: PART_INSTALL_STATUS_OPTIONS.map((value) => ({ value, label: value })),
    componentTypes,
    motors: motors.map((motor) => ({ id: motor.id, name: motor.name })),
    motorFields: MOTOR_FIELD_OPTIONS,
    partFields: PART_FIELD_OPTIONS,
  };
}

async function getMotorRecords() {
  const motors = await prisma.motor.findMany({
    select: {
      id: true,
      name: true,
      serialNumber: true,
      location: true,
      status: true,
      pumpingHours: true,
      dateOut: true,
      dateIn: true,
      _count: {
        select: {
          assemblies: {
            where: { dateRemoved: null },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return motors.map((motor) => ({
    id: motor.id,
    name: motor.name,
    serialNumber: motor.serialNumber,
    location: motor.location,
    status: motor.status,
    pumpingHours: motor.pumpingHours,
    dateOut: toDateOnly(motor.dateOut),
    dateIn: toDateOnly(motor.dateIn),
    assembledParts: motor._count.assemblies,
  }));
}

async function getPartRecords(): Promise<PartExportRecord[]> {
  const [parts, motors] = await Promise.all([
    prisma.subComponent.findMany({
      select: {
        id: true,
        type: true,
        serialNumber: true,
        cumulativeHours: true,
        status: true,
        assemblies: {
          select: {
            motorId: true,
            dateRemoved: true,
            dateAssembled: true,
          },
          orderBy: { dateAssembled: 'desc' },
        },
      },
      orderBy: [{ type: 'asc' }, { serialNumber: 'asc' }],
    }),
    prisma.motor.findMany({
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const motorNameById = new Map(motors.map((motor) => [motor.id, motor.name]));

  return parts.map((part) => {
    const activeAssembly = part.assemblies.find((assembly) => !assembly.dateRemoved);
    const currentMotorId = activeAssembly?.motorId || null;

    return {
      id: part.id,
      type: part.type,
      serialNumber: part.serialNumber,
      cumulativeHours: part.cumulativeHours,
      availabilityStatus: activeAssembly ? 'INSTALLED' : 'AVAILABLE',
      componentStatus: part.status,
      currentMotorId,
      currentMotorName: currentMotorId ? motorNameById.get(currentMotorId) || null : null,
      totalAssignments: part.assemblies.length,
    };
  });
}

function buildMotorNameById(records: PartExportRecord[]): Record<string, string> {
  const names: Record<string, string> = {};

  for (const record of records) {
    if (record.currentMotorId && record.currentMotorName) {
      names[record.currentMotorId] = record.currentMotorName;
    }
  }

  return names;
}

function normalizeExportType(type: ExportBody['type']): 'motors' | 'parts' | null {
  if (type === 'motors') return 'motors';
  if (type === 'parts' || type === 'sub-components') return 'parts';
  return null;
}

function buildCsvResponse(csv: string, fileName: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function buildPdfResponse(pdfBytes: Uint8Array, fileName: string): Response {
  const payload = Uint8Array.from(pdfBytes).buffer;

  return new Response(payload, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

async function safeJson<T>(request: NextRequest): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

async function buildPdfBuffer(input: {
  title: string;
  generatedAt: Date;
  appliedFilters: string[];
  headers: string[];
  rows: string[][];
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const contentWidth = PDF_PAGE_WIDTH - PDF_MARGIN * 2;
  let page = pdfDoc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
  let y = PDF_PAGE_HEIGHT - PDF_MARGIN;

  y = drawWrappedText(page, {
    text: input.title,
    x: PDF_MARGIN,
    y,
    maxWidth: contentWidth,
    font: boldFont,
    fontSize: 18,
    color: PDF_COLOR_TEXT_PRIMARY,
    lineHeight: 22,
  });

  y -= 4;
  y = drawWrappedText(page, {
    text: `Generated: ${input.generatedAt.toLocaleString()}`,
    x: PDF_MARGIN,
    y,
    maxWidth: contentWidth,
    font: regularFont,
    fontSize: 10,
    color: PDF_COLOR_TEXT_SECONDARY,
    lineHeight: 14,
  });

  y -= 8;
  y = drawWrappedText(page, {
    text: 'Applied Filters',
    x: PDF_MARGIN,
    y,
    maxWidth: contentWidth,
    font: boldFont,
    fontSize: 12,
    color: PDF_COLOR_TEXT_PRIMARY,
    lineHeight: 16,
  });

  y -= 2;
  if (input.appliedFilters.length === 0) {
    y = drawWrappedText(page, {
      text: '- None',
      x: PDF_MARGIN,
      y,
      maxWidth: contentWidth,
      font: regularFont,
      fontSize: 10,
      color: PDF_COLOR_TEXT_BODY,
      lineHeight: 14,
    });
  } else {
    for (const line of input.appliedFilters) {
      y = drawWrappedText(page, {
        text: `- ${line}`,
        x: PDF_MARGIN,
        y,
        maxWidth: contentWidth,
        font: regularFont,
        fontSize: 10,
        color: PDF_COLOR_TEXT_BODY,
        lineHeight: 14,
      });
    }
  }

  y -= 8;
  y = drawWrappedText(page, {
    text: 'Data',
    x: PDF_MARGIN,
    y,
    maxWidth: contentWidth,
    font: boldFont,
    fontSize: 12,
    color: PDF_COLOR_TEXT_PRIMARY,
    lineHeight: 16,
  });

  y -= 6;

  if (input.rows.length === 0) {
    drawWrappedText(page, {
      text: 'No records match the selected filters.',
      x: PDF_MARGIN,
      y,
      maxWidth: contentWidth,
      font: regularFont,
      fontSize: 10,
      color: PDF_COLOR_TEXT_BODY,
      lineHeight: 14,
    });

    return await pdfDoc.save();
  }

  const headers = input.headers.length > 0 ? input.headers : [''];
  const rows = input.rows.map((row) => headers.map((_, index) => row[index] || ''));
  const columnWidth = contentWidth / headers.length;

  const drawHeaderRow = () => {
    y = drawPdfRow(page, {
      topY: y,
      values: headers,
      rowHeight: PDF_ROW_HEIGHT,
      columnWidth,
      regularFont,
      boldFont,
      isHeader: true,
    });
  };

  drawHeaderRow();

  for (const row of rows) {
    if (y - PDF_ROW_HEIGHT < PDF_MARGIN) {
      page = pdfDoc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
      y = PDF_PAGE_HEIGHT - PDF_MARGIN;
      drawHeaderRow();
    }

    y = drawPdfRow(page, {
      topY: y,
      values: row,
      rowHeight: PDF_ROW_HEIGHT,
      columnWidth,
      regularFont,
      boldFont,
      isHeader: false,
    });
  }

  return await pdfDoc.save();
}

function drawPdfRow(
  page: PDFPage,
  input: {
    topY: number;
    values: string[];
    rowHeight: number;
    columnWidth: number;
    regularFont: PDFFont;
    boldFont: PDFFont;
    isHeader: boolean;
  }
): number {
  const font = input.isHeader ? input.boldFont : input.regularFont;
  const fontSize = 8;

  for (let index = 0; index < input.values.length; index += 1) {
    const x = PDF_MARGIN + input.columnWidth * index;

    page.drawRectangle({
      x,
      y: input.topY - input.rowHeight,
      width: input.columnWidth,
      height: input.rowHeight,
      color: input.isHeader ? PDF_COLOR_HEADER_BG : PDF_COLOR_WHITE,
      borderColor: PDF_COLOR_BORDER,
      borderWidth: 0.5,
    });

    const value = truncateTextToWidth(
      sanitizePdfCell(input.values[index] || ''),
      font,
      fontSize,
      input.columnWidth - 6
    );

    page.drawText(value, {
      x: x + 3,
      y: input.topY - input.rowHeight + 8,
      size: fontSize,
      font,
      color: PDF_COLOR_TEXT_PRIMARY,
    });
  }

  return input.topY - input.rowHeight;
}

function sanitizePdfCell(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function drawWrappedText(
  page: PDFPage,
  input: {
    text: string;
    x: number;
    y: number;
    maxWidth: number;
    font: PDFFont;
    fontSize: number;
    color: ReturnType<typeof rgb>;
    lineHeight: number;
  }
): number {
  const lines = wrapText(input.text, input.font, input.fontSize, input.maxWidth);
  let cursorY = input.y;

  for (const line of lines) {
    page.drawText(line, {
      x: input.x,
      y: cursorY - input.fontSize,
      size: input.fontSize,
      font: input.font,
      color: input.color,
    });

    cursorY -= input.lineHeight;
  }

  return cursorY;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const normalized = sanitizePdfCell(text);
  if (!normalized) {
    return [''];
  }

  const words = normalized.split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = '';
    }

    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      current = word;
      continue;
    }

    lines.push(truncateTextToWidth(word, font, fontSize, maxWidth));
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}

function truncateTextToWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  const value = sanitizePdfCell(text);
  if (font.widthOfTextAtSize(value, fontSize) <= maxWidth) {
    return value;
  }

  const suffix = '...';
  let trimmed = value;

  while (trimmed.length > 0 && font.widthOfTextAtSize(`${trimmed}${suffix}`, fontSize) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed ? `${trimmed}${suffix}` : suffix;
}

function buildExportFailureResponse(type: 'motors' | 'parts' | null, error: unknown) {
  const detail = toErrorMessage(error);
  const isMissingMotorReference =
    type === 'parts' && /Inconsistent query result/i.test(detail) && /Field motor is required/i.test(detail);

  const baseMessage = isMissingMotorReference
    ? 'Failed to export parts because one or more assembly records reference a missing motor.'
    : `Failed to export ${type ?? 'data'}.`;

  const errorMessage = process.env.NODE_ENV !== 'production' ? `${baseMessage} ${detail}` : baseMessage;

  return NextResponse.json({ error: errorMessage }, { status: 500 });
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || 'Unknown error');
}
