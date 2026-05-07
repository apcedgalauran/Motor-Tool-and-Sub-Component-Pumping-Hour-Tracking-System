import {
  buildCsv,
  buildMotorTable,
  filterMotorRecords,
  filterPartRecords,
  type MotorExportRecord,
  type PartExportRecord,
} from '@/lib/export-data';
import { describe, expect, it } from 'vitest';

describe('export-data utilities', () => {
  it('filters motor rows by status, Date Out range, and minimum hours threshold', () => {
    const motors: MotorExportRecord[] = [
      {
        id: 'm-1',
        name: 'Motor Alpha',
        serialNumber: 'SN-001',
        location: 'Rig 1',
        status: 'ON_JOB',
        pumpingHours: 120,
        dateOut: '2026-04-01',
        dateIn: null,
        assembledParts: 3,
        sapId: 'SAP-001',
        assetType: 'Motor',
        size: '9 5/8"',
        brandType: 'RADIUS',
        connection: 'STD',
      },
      {
        id: 'm-2',
        name: 'Motor Bravo',
        serialNumber: 'SN-002',
        location: 'Rig 2',
        status: 'IDLE',
        pumpingHours: 80,
        dateOut: '2026-04-05',
        dateIn: null,
        assembledParts: 2,
      },
      {
        id: 'm-3',
        name: 'Motor Charlie',
        serialNumber: 'SN-003',
        location: 'Rig 3',
        status: 'FOR_MAINTENANCE',
        pumpingHours: 140,
        dateOut: null,
        dateIn: null,
        assembledParts: 0,
      },
    ];

    const filtered = filterMotorRecords(motors, {
      statuses: ['ON_JOB', 'IDLE'],
      dateOutFrom: '2026-04-01',
      dateOutTo: '2026-04-05',
      minHours: 90,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('m-1');

    const strictThreshold = filterMotorRecords(motors, {
      statuses: ['ON_JOB'],
      minHours: 120,
    });

    expect(strictThreshold).toHaveLength(0);
  });

  it('filters parts by component type, install status, and installed motor', () => {
    const parts: PartExportRecord[] = [
      {
        id: 'p-1',
        type: 'ROTOR',
        serialNumber: 'R-001',
        cumulativeHours: 120,
        availabilityStatus: 'INSTALLED',
        componentStatus: 'ACTIVE',
        currentMotorId: 'motor-1',
        currentMotorName: 'Motor Alpha',
        totalAssignments: 4,
      },
      {
        id: 'p-2',
        type: 'ROTOR',
        serialNumber: 'R-002',
        cumulativeHours: 30,
        availabilityStatus: 'INSTALLED',
        componentStatus: 'ACTIVE',
        currentMotorId: 'motor-2',
        currentMotorName: 'Motor Bravo',
        totalAssignments: 1,
      },
      {
        id: 'p-3',
        type: 'STATOR',
        serialNumber: 'S-001',
        cumulativeHours: 200,
        availabilityStatus: 'AVAILABLE',
        componentStatus: 'IN_MAINTENANCE',
        currentMotorId: null,
        currentMotorName: null,
        totalAssignments: 5,
      },
    ];

    const filtered = filterPartRecords(parts, {
      componentTypes: ['ROTOR'],
      statuses: ['INSTALLED'],
      installedMotorId: 'motor-1',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('p-1');
  });

  it('builds CSV with headers and properly escaped values', () => {
    const motors: MotorExportRecord[] = [
      {
        id: 'm-1',
        name: 'Motor Alpha',
        serialNumber: 'SN-001',
        location: 'Rig "A", North',
        status: 'ON_JOB',
        pumpingHours: 120,
        dateOut: '2026-04-01',
        dateIn: null,
        assembledParts: 3,
        sapId: 'SAP-001',
        assetType: 'Motor',
        size: '9 5/8"',
        brandType: 'RADIUS',
        connection: 'STD',
      },
    ];

    const table = buildMotorTable(motors, ['name', 'serialNumber', 'location']);
    const csv = buildCsv(table.headers, table.rows);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Name,Serial Number,Location');
    expect(lines[1]).toContain('Motor Alpha,SN-001,"Rig ""A"", North"');
  });

  it('includes spec fields in motor CSV export', () => {
    const motors: MotorExportRecord[] = [
      {
        id: 'm-1',
        name: 'Motor Alpha',
        serialNumber: 'SN-001',
        location: 'Rig 1',
        status: 'ON_JOB',
        pumpingHours: 120,
        dateOut: '2026-04-01',
        dateIn: null,
        assembledParts: 3,
        sapId: 'SAP-001',
        assetType: 'Motor',
        size: '9 5/8"',
        brandType: 'RADIUS',
        connection: 'STD',
      },
    ];

    const table = buildMotorTable(motors, ['serialNumber', 'sapId', 'size', 'brandType', 'connection']);
    const csv = buildCsv(table.headers, table.rows);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Serial Number,SAP ID,Size,Brand / Type,Connection');
    expect(lines[1]).toContain('SN-001,SAP-001,"9 5/8""",RADIUS,STD');
  });
});