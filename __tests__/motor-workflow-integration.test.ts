/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type MotorRecord = {
  id: string;
  name: string;
  serialNumber: string;
  location: string | null;
  dateOut: Date | null;
  dateIn: Date | null;
  status: string;
  customStatusId: string | null;
  pumpingHours: number;
  createdAt: Date;
  updatedAt: Date;
};

type SubComponentRecord = {
  id: string;
  type: string;
  serialNumber: string;
  status: string;
  notes: string | null;
  cumulativeHours: number;
  createdAt: Date;
  updatedAt: Date;
};

type AssemblyRecord = {
  id: string;
  motorId: string;
  subComponentId: string;
  dateAssembled: Date;
  dateRemoved: Date | null;
  hoursAtAssembly: number;
  hoursAtRemoval: number | null;
  hoursAccrued: number | null;
  createdAt: Date;
};

type HourLogRecord = {
  id: string;
  motorId: string;
  userId: string;
  hoursAdded: number;
  totalAfter: number;
  rigName: string;
  wellNumber: string;
  notes: string | null;
  createdAt: Date;
};

type SubComponentHourLogRecord = {
  id: string;
  subComponentId: string;
  motorId: string | null;
  userId: string;
  hoursAdded: number;
  totalAfter: number;
  rigName: string;
  wellNumber: string;
  notes: string | null;
  createdAt: Date;
};

type MotorEditLogRecord = {
  id: string;
  motorId: string;
  userId: string;
  changedFields: unknown;
  editedAt: Date;
};

type CustomStatusRecord = {
  id: string;
  label: string;
  color: string;
  isPermanent: boolean;
  createdAt: Date;
};

type DbState = {
  motors: MotorRecord[];
  subComponents: SubComponentRecord[];
  assemblies: AssemblyRecord[];
  hourLogs: HourLogRecord[];
  subComponentHourLogs: SubComponentHourLogRecord[];
  motorEditLogs: MotorEditLogRecord[];
  customStatuses: CustomStatusRecord[];
  counters: {
    motor: number;
    subComponent: number;
    assembly: number;
    hourLog: number;
    subComponentHourLog: number;
    motorEditLog: number;
    customStatus: number;
  };
};

const { db, prismaMock, resetDb, getUserNameById } = vi.hoisted(() => {
  const userNames: Record<string, string> = {
    'user-1': 'Integration Tester',
  };

  const dbState: DbState = {
    motors: [],
    subComponents: [],
    assemblies: [],
    hourLogs: [],
    subComponentHourLogs: [],
    motorEditLogs: [],
    customStatuses: [],
    counters: {
      motor: 0,
      subComponent: 0,
      assembly: 0,
      hourLog: 0,
      subComponentHourLog: 0,
      motorEditLog: 0,
      customStatus: 0,
    },
  };

  function now(): Date {
    return new Date();
  }

  function nextId(prefix: keyof DbState['counters']): string {
    dbState.counters[prefix] += 1;
    return `${prefix}-${dbState.counters[prefix]}`;
  }

  function cloneDate(value: Date | null): Date | null {
    return value ? new Date(value) : null;
  }

  function cloneMotor(motor: MotorRecord): MotorRecord {
    return {
      ...motor,
      dateOut: cloneDate(motor.dateOut),
      dateIn: cloneDate(motor.dateIn),
      createdAt: new Date(motor.createdAt),
      updatedAt: new Date(motor.updatedAt),
    };
  }

  function cloneSubComponent(subComponent: SubComponentRecord): SubComponentRecord {
    return {
      ...subComponent,
      createdAt: new Date(subComponent.createdAt),
      updatedAt: new Date(subComponent.updatedAt),
    };
  }

  function cloneAssembly(assembly: AssemblyRecord): AssemblyRecord {
    return {
      ...assembly,
      dateAssembled: new Date(assembly.dateAssembled),
      dateRemoved: cloneDate(assembly.dateRemoved),
      createdAt: new Date(assembly.createdAt),
    };
  }

  function parseIdWhere(where: { id?: string; serialNumber?: string }) {
    if (where.id) {
      return dbState.motors.find((motor) => motor.id === where.id) || null;
    }

    if (where.serialNumber) {
      return dbState.motors.find((motor) => motor.serialNumber === where.serialNumber) || null;
    }

    return null;
  }

  function withMotorIncludes(motor: MotorRecord, include: Record<string, unknown> | undefined): any {
    if (!include) {
      return cloneMotor(motor);
    }

    const result: Record<string, unknown> = cloneMotor(motor);

    if (include.customStatus) {
      result.customStatus = motor.customStatusId
        ? dbState.customStatuses.find((status) => status.id === motor.customStatusId) || null
        : null;
    }

    if (include.assemblies) {
      const motorAssemblies = dbState.assemblies
        .filter((assembly) => assembly.motorId === motor.id)
        .sort((a, b) => b.dateAssembled.getTime() - a.dateAssembled.getTime())
        .map((assembly) => {
          const subComponent = dbState.subComponents.find((component) => component.id === assembly.subComponentId);

          return {
            ...cloneAssembly(assembly),
            subComponent: subComponent ? cloneSubComponent(subComponent) : null,
          };
        });

      result.assemblies = motorAssemblies;
    }

    if (include.hourLogs) {
      result.hourLogs = dbState.hourLogs
        .filter((log) => log.motorId === motor.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((log) => ({
          ...log,
          createdAt: new Date(log.createdAt),
          user: { name: userNames[log.userId] || null },
        }));
    }

    if (include.editLogs) {
      result.editLogs = dbState.motorEditLogs
        .filter((log) => log.motorId === motor.id)
        .sort((a, b) => b.editedAt.getTime() - a.editedAt.getTime())
        .map((log) => ({
          ...log,
          editedAt: new Date(log.editedAt),
          user: { name: userNames[log.userId] || null },
        }));
    }

    return result;
  }

  function withMotorSelect(motor: MotorRecord, select: Record<string, unknown>): any {
    const selected: Record<string, unknown> = {};

    for (const [key, enabled] of Object.entries(select)) {
      if (!enabled) continue;

      if (key === '_count') {
        const assembliesCount = dbState.assemblies.filter(
          (assembly) => assembly.motorId === motor.id && assembly.dateRemoved === null
        ).length;
        selected._count = { assemblies: assembliesCount };
        continue;
      }

      selected[key] = (motor as Record<string, unknown>)[key];
    }

    return selected;
  }

  function normalizeMotorOrderBy(orderBy: unknown): Array<Record<string, 'asc' | 'desc'>> {
    if (!orderBy) return [];
    if (Array.isArray(orderBy)) return orderBy as Array<Record<string, 'asc' | 'desc'>>;
    return [orderBy as Record<string, 'asc' | 'desc'>];
  }

  function applyMotorOrder(motors: MotorRecord[], orderBy: unknown): MotorRecord[] {
    const orderRules = normalizeMotorOrderBy(orderBy);
    if (orderRules.length === 0) {
      return [...motors];
    }

    return [...motors].sort((a, b) => {
      for (const rule of orderRules) {
        const [field, direction] = Object.entries(rule)[0];
        const aValue = (a as Record<string, unknown>)[field];
        const bValue = (b as Record<string, unknown>)[field];

        if (aValue === bValue) continue;
        const sort = aValue! > bValue! ? 1 : -1;
        return direction === 'desc' ? -sort : sort;
      }

      return 0;
    });
  }

  function resolveMotorUpdateSelection(
    motor: MotorRecord,
    args: { select?: Record<string, unknown>; include?: Record<string, unknown> }
  ): any {
    if (args.select) {
      return withMotorSelect(motor, args.select);
    }

    if (args.include) {
      return withMotorIncludes(motor, args.include);
    }

    return cloneMotor(motor);
  }

  function resetDatabase() {
    dbState.motors = [];
    dbState.subComponents = [];
    dbState.assemblies = [];
    dbState.hourLogs = [];
    dbState.subComponentHourLogs = [];
    dbState.motorEditLogs = [];
    dbState.customStatuses = [];
    dbState.counters = {
      motor: 0,
      subComponent: 0,
      assembly: 0,
      hourLog: 0,
      subComponentHourLog: 0,
      motorEditLog: 0,
      customStatus: 0,
    };
  }

  const prisma = {
    motor: {
      findUnique: vi.fn(async (args: any) => {
        const motor = parseIdWhere(args.where || {});
        if (!motor) return null;
        return withMotorIncludes(motor, args.include);
      }),
      findUniqueOrThrow: vi.fn(async (args: any) => {
        const motor = parseIdWhere(args.where || {});
        if (!motor) {
          throw new Error('Motor not found');
        }

        return withMotorIncludes(motor, args.include);
      }),
      findFirst: vi.fn(async (args: any) => {
        const where = args.where || {};
        const serial = where.serialNumber;
        const excludedId = where.id?.not;

        const match = dbState.motors.find(
          (motor) => motor.serialNumber === serial && motor.id !== excludedId
        );

        return match ? cloneMotor(match) : null;
      }),
      findMany: vi.fn(async (args: any) => {
        const ordered = applyMotorOrder(dbState.motors, args?.orderBy);

        if (args?.select) {
          return ordered.map((motor) => withMotorSelect(motor, args.select));
        }

        return ordered.map((motor) => withMotorIncludes(motor, args?.include));
      }),
      create: vi.fn(async (args: any) => {
        const data = args.data as Record<string, unknown>;
        const created: MotorRecord = {
          id: nextId('motor'),
          name: String(data.name),
          serialNumber: String(data.serialNumber),
          location: (data.location as string | null) || null,
          dateOut: (data.dateOut as Date | null) || null,
          dateIn: (data.dateIn as Date | null) || null,
          status: String(data.status || 'ON_LOCATION'),
          customStatusId: (data.customStatusId as string | null) || null,
          pumpingHours: Number(data.pumpingHours || 0),
          createdAt: now(),
          updatedAt: now(),
        };

        dbState.motors.push(created);
        return cloneMotor(created);
      }),
      update: vi.fn(async (args: any) => {
        const motor = dbState.motors.find((record) => record.id === args.where.id);
        if (!motor) {
          throw new Error('Record to update not found');
        }

        const data = args.data as Record<string, unknown>;

        if (data.pumpingHours && typeof data.pumpingHours === 'object' && 'increment' in (data.pumpingHours as object)) {
          motor.pumpingHours += Number((data.pumpingHours as { increment: number }).increment || 0);
        }

        if (data.name !== undefined) motor.name = String(data.name);
        if (data.serialNumber !== undefined) motor.serialNumber = String(data.serialNumber);
        if (data.location !== undefined) motor.location = (data.location as string | null) || null;
        if (data.dateOut !== undefined) motor.dateOut = (data.dateOut as Date | null) || null;
        if (data.dateIn !== undefined) motor.dateIn = (data.dateIn as Date | null) || null;
        if (data.status !== undefined) motor.status = String(data.status);
        if (data.customStatusId !== undefined) {
          motor.customStatusId = (data.customStatusId as string | null) || null;
        }

        motor.updatedAt = now();

        return resolveMotorUpdateSelection(motor, args);
      }),
    },

    subComponent: {
      findUnique: vi.fn(async (args: any) => {
        const where = args.where || {};
        const match = dbState.subComponents.find((record) => {
          if (where.id) return record.id === where.id;
          if (where.serialNumber) return record.serialNumber === where.serialNumber;
          return false;
        });

        if (!match) return null;

        if (!args.include) {
          return cloneSubComponent(match);
        }

        const result: Record<string, unknown> = {
          ...cloneSubComponent(match),
        };

        if (args.include?.assemblies) {
          const assemblies = dbState.assemblies
            .filter((assembly) => assembly.subComponentId === match.id)
            .sort((a, b) => b.dateAssembled.getTime() - a.dateAssembled.getTime())
            .map((assembly) => {
              const motor = dbState.motors.find((record) => record.id === assembly.motorId);
              return {
                ...cloneAssembly(assembly),
                motor: motor ? cloneMotor(motor) : null,
              };
            });

          result.assemblies = assemblies;
        }

        if (args.include?.subComponentHourLogs) {
          result.subComponentHourLogs = dbState.subComponentHourLogs
            .filter((log) => log.subComponentId === match.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((log) => {
              const motor = log.motorId
                ? dbState.motors.find((record) => record.id === log.motorId) || null
                : null;

              return {
                ...log,
                createdAt: new Date(log.createdAt),
                user: { name: userNames[log.userId] || null },
                motor: motor
                  ? {
                      id: motor.id,
                      name: motor.name,
                      serialNumber: motor.serialNumber,
                    }
                  : null,
              };
            });
        }

        return result;
      }),
      create: vi.fn(async (args: any) => {
        const data = args.data as Record<string, unknown>;

        const created: SubComponentRecord = {
          id: nextId('subComponent'),
          type: String(data.type),
          serialNumber: String(data.serialNumber),
          status: String(data.status || 'ACTIVE'),
          notes: (data.notes as string | null) || null,
          cumulativeHours: Number(data.cumulativeHours || 0),
          createdAt: now(),
          updatedAt: now(),
        };

        dbState.subComponents.push(created);
        return cloneSubComponent(created);
      }),
      update: vi.fn(async (args: any) => {
        const match = dbState.subComponents.find((record) => record.id === args.where.id);
        if (!match) {
          throw new Error('Record to update not found');
        }

        const data = args.data as Record<string, unknown>;
        if (data.cumulativeHours && typeof data.cumulativeHours === 'object' && 'increment' in (data.cumulativeHours as object)) {
          match.cumulativeHours += Number((data.cumulativeHours as { increment: number }).increment || 0);
        }
        if (data.type !== undefined) match.type = String(data.type);
        if (data.serialNumber !== undefined) match.serialNumber = String(data.serialNumber);
        if (data.status !== undefined) match.status = String(data.status);
        if (data.notes !== undefined) match.notes = (data.notes as string | null) || null;
        match.updatedAt = now();

        if (args.select) {
          const selected: Record<string, unknown> = {};
          for (const key of Object.keys(args.select)) {
            selected[key] = (match as Record<string, unknown>)[key];
          }
          return selected;
        }

        return cloneSubComponent(match);
      }),
      updateMany: vi.fn(async (args: any) => {
        const ids = (args.where?.id?.in || []) as string[];
        const increment = Number(args.data?.cumulativeHours?.increment || 0);

        let count = 0;
        for (const record of dbState.subComponents) {
          if (!ids.includes(record.id)) continue;
          record.cumulativeHours += increment;
          record.updatedAt = now();
          count += 1;
        }

        return { count };
      }),
      findMany: vi.fn(async (_args: any) => {
        return [...dbState.subComponents]
          .sort((a, b) => {
            if (a.type === b.type) {
              return a.serialNumber.localeCompare(b.serialNumber);
            }
            return a.type.localeCompare(b.type);
          })
          .map((subComponent) => {
            const assemblies = dbState.assemblies
              .filter((assembly) => assembly.subComponentId === subComponent.id)
              .sort((a, b) => b.dateAssembled.getTime() - a.dateAssembled.getTime())
              .map((assembly) => {
                const motor = dbState.motors.find((record) => record.id === assembly.motorId);
                return {
                  ...cloneAssembly(assembly),
                  motor: motor ? { id: motor.id, name: motor.name } : null,
                };
              });

            return {
              ...cloneSubComponent(subComponent),
              assemblies,
            };
          });
      }),
    },

    assembly: {
      findFirst: vi.fn(async (args: any) => {
        const where = args.where || {};

        const matches = dbState.assemblies.filter((assembly) => {
          if (where.subComponentId && assembly.subComponentId !== where.subComponentId) return false;
          if (where.motorId && assembly.motorId !== where.motorId) return false;

          if (where.dateRemoved === null) {
            return assembly.dateRemoved === null;
          }

          return true;
        });

        const ordered = matches.sort((a, b) => b.dateAssembled.getTime() - a.dateAssembled.getTime());
        const first = ordered[0];
        if (!first) return null;

        if (args.select) {
          const selected: Record<string, unknown> = {};
          for (const key of Object.keys(args.select)) {
            selected[key] = (first as Record<string, unknown>)[key];
          }
          return selected;
        }

        return cloneAssembly(first);
      }),
      findMany: vi.fn(async (args: any) => {
        const where = args.where || {};

        const filtered = dbState.assemblies.filter((assembly) => {
          if (where.motorId && assembly.motorId !== where.motorId) return false;
          if (where.subComponentId && assembly.subComponentId !== where.subComponentId) return false;
          if (where.dateRemoved === null && assembly.dateRemoved !== null) return false;
          return true;
        });

        if (args.select) {
          return filtered.map((assembly) => {
            const selected: Record<string, unknown> = {};
            for (const key of Object.keys(args.select)) {
              selected[key] = (assembly as Record<string, unknown>)[key];
            }
            return selected;
          });
        }

        return filtered.map(cloneAssembly);
      }),
      create: vi.fn(async (args: any) => {
        const data = args.data as Record<string, unknown>;

        const created: AssemblyRecord = {
          id: nextId('assembly'),
          motorId: String(data.motorId),
          subComponentId: String(data.subComponentId),
          dateAssembled: now(),
          dateRemoved: (data.dateRemoved as Date | null) || null,
          hoursAtAssembly: Number(data.hoursAtAssembly || 0),
          hoursAtRemoval: (data.hoursAtRemoval as number | null) ?? null,
          hoursAccrued: (data.hoursAccrued as number | null) ?? null,
          createdAt: now(),
        };

        dbState.assemblies.push(created);
        return cloneAssembly(created);
      }),
      findUniqueOrThrow: vi.fn(async (args: any) => {
        const match = dbState.assemblies.find((assembly) => assembly.id === args.where.id);
        if (!match) {
          throw new Error('Assembly not found');
        }

        const motor = dbState.motors.find((record) => record.id === match.motorId);

        return {
          ...cloneAssembly(match),
          motor: motor ? cloneMotor(motor) : null,
        };
      }),
      update: vi.fn(async (args: any) => {
        const match = dbState.assemblies.find((assembly) => assembly.id === args.where.id);
        if (!match) {
          throw new Error('Record to update not found');
        }

        const data = args.data as Record<string, unknown>;
        if (data.dateRemoved !== undefined) match.dateRemoved = (data.dateRemoved as Date | null) || null;
        if (data.hoursAtRemoval !== undefined) match.hoursAtRemoval = (data.hoursAtRemoval as number | null) ?? null;
        if (data.hoursAccrued !== undefined) match.hoursAccrued = (data.hoursAccrued as number | null) ?? null;

        return cloneAssembly(match);
      }),
    },

    hourLog: {
      create: vi.fn(async (args: any) => {
        const data = args.data as Record<string, unknown>;
        const created: HourLogRecord = {
          id: nextId('hourLog'),
          motorId: String(data.motorId),
          userId: String(data.userId),
          hoursAdded: Number(data.hoursAdded),
          totalAfter: Number(data.totalAfter),
          rigName: String(data.rigName),
          wellNumber: String(data.wellNumber),
          notes: (data.notes as string | null) || null,
          createdAt: now(),
        };

        dbState.hourLogs.push(created);
        return { ...created, createdAt: new Date(created.createdAt) };
      }),
    },

    subComponentHourLog: {
      create: vi.fn(async (args: any) => {
        const data = args.data as Record<string, unknown>;
        const created: SubComponentHourLogRecord = {
          id: nextId('subComponentHourLog'),
          subComponentId: String(data.subComponentId),
          motorId: (data.motorId as string | null) || null,
          userId: String(data.userId),
          hoursAdded: Number(data.hoursAdded),
          totalAfter: Number(data.totalAfter),
          rigName: String(data.rigName),
          wellNumber: String(data.wellNumber),
          notes: (data.notes as string | null) || null,
          createdAt: now(),
        };

        dbState.subComponentHourLogs.push(created);
        return { ...created, createdAt: new Date(created.createdAt) };
      }),
    },

    motorEditLog: {
      create: vi.fn(async (args: any) => {
        const data = args.data as Record<string, unknown>;
        const created: MotorEditLogRecord = {
          id: nextId('motorEditLog'),
          motorId: String(data.motorId),
          userId: String(data.userId),
          changedFields: data.changedFields,
          editedAt: now(),
        };

        dbState.motorEditLogs.push(created);
        return { ...created, editedAt: new Date(created.editedAt) };
      }),
    },

    customStatus: {
      findUnique: vi.fn(async (args: any) => {
        const where = args.where || {};

        if (where.id) {
          return dbState.customStatuses.find((status) => status.id === where.id) || null;
        }

        if (where.label) {
          return dbState.customStatuses.find((status) => status.label === where.label) || null;
        }

        return null;
      }),
      findMany: vi.fn(async () => {
        return [...dbState.customStatuses].map((status) => ({ ...status, createdAt: new Date(status.createdAt) }));
      }),
      count: vi.fn(async () => dbState.customStatuses.length),
      create: vi.fn(async (args: any) => {
        const data = args.data as Record<string, unknown>;
        const created: CustomStatusRecord = {
          id: nextId('customStatus'),
          label: String(data.label),
          color: String(data.color),
          isPermanent: Boolean(data.isPermanent),
          createdAt: now(),
        };

        dbState.customStatuses.push(created);
        return { ...created, createdAt: new Date(created.createdAt) };
      }),
    },

    $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => {
      const tx = {
        motor: { update: prisma.motor.update },
        hourLog: { create: prisma.hourLog.create },
        assembly: {
          findFirst: prisma.assembly.findFirst,
          findMany: prisma.assembly.findMany,
        },
        subComponent: {
          update: prisma.subComponent.update,
          updateMany: prisma.subComponent.updateMany,
        },
        subComponentHourLog: { create: prisma.subComponentHourLog.create },
        motorEditLog: { create: prisma.motorEditLog.create },
      };

      return callback(tx);
    }),
  };

  return {
    db: dbState,
    prismaMock: prisma,
    resetDb: resetDatabase,
    getUserNameById: (id: string) => userNames[id] || null,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { auth } from '@/auth';
import { assembleSubComponent } from '@/actions/assembly.actions';
import { createMotor, getMotor } from '@/actions/motor.actions';
import { createSubComponent } from '@/actions/subcomponent.actions';
import { POST as exportPost } from '@/app/api/export/route';
import { POST as postHourLog } from '@/app/api/hour-logs/route';
import { PATCH as patchMotor } from '@/app/api/motors/[id]/route';

describe('motor workflow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();

    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'user-1',
        name: getUserNameById('user-1'),
      },
    } as never);
  });

  it('covers create -> assemble -> log hours -> edit -> history -> PDF export with status filter', async () => {
    const oneTimeStatus = 'Awaiting Dispatch';

    const workflowMotor = await createMotor({
      name: 'Motor Workflow Alpha',
      serialNumber: 'MW-1001',
      status: oneTimeStatus,
      location: 'Rig 14',
      dateOut: '2026-04-09',
    });

    await createMotor({
      name: 'Motor Control Beta',
      serialNumber: 'MW-2002',
      status: 'ON_LOCATION',
      location: 'Rig 2',
      dateOut: '2026-04-02',
    });

    expect(workflowMotor.status).toBe(oneTimeStatus);

    const subComponent = await createSubComponent({
      type: 'ROTOR',
      serialNumber: 'SC-9001',
      notes: 'Integration test component',
    });

    await assembleSubComponent(workflowMotor.id, subComponent.id);

    const installedRecord = db.subComponents.find((record) => record.id === subComponent.id);
    expect(installedRecord?.status).toBe('INSTALLED');

    const logResponse = await postHourLog(
      new Request('http://localhost/api/hour-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subComponentId: subComponent.id,
          hoursAdded: 12.5,
          rigName: 'Rig 14',
          wellNumber: 'Well-22',
          notes: 'Initial post-assembly run',
        }),
      }) as never
    );

    expect(logResponse.status).toBe(201);
    const logPayload = await logResponse.json();
    expect(logPayload.mode).toBe('sub-component');
    expect(logPayload.motorId).toBe(workflowMotor.id);
    expect(logPayload.subComponentId).toBe(subComponent.id);
    expect(logPayload.totalAfter).toBe(12.5);
    expect(logPayload.subComponentsUpdated).toBe(1);

    const motorAfterSubComponentLog = db.motors.find((record) => record.id === workflowMotor.id);
    expect(motorAfterSubComponentLog?.pumpingHours).toBe(0);

    const componentAfterSubComponentLog = db.subComponents.find((record) => record.id === subComponent.id);
    expect(componentAfterSubComponentLog?.cumulativeHours).toBe(12.5);
    expect(db.hourLogs).toHaveLength(0);
    expect(db.subComponentHourLogs).toHaveLength(1);
    expect(db.subComponentHourLogs[0]).toMatchObject({
      subComponentId: subComponent.id,
      motorId: workflowMotor.id,
      userId: 'user-1',
      hoursAdded: 12.5,
      totalAfter: 12.5,
      rigName: 'Rig 14',
      wellNumber: 'Well-22',
      notes: 'Initial post-assembly run',
    });

    const motorLogResponse = await postHourLog(
      new Request('http://localhost/api/hour-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motorId: workflowMotor.id,
          hoursAdded: 7.5,
          rigName: 'Rig 14',
          wellNumber: 'Well-22',
          notes: 'Whole toolset run',
        }),
      }) as never
    );

    expect(motorLogResponse.status).toBe(201);
    const motorLogPayload = await motorLogResponse.json();
    expect(motorLogPayload.mode).toBe('motor');
    expect(motorLogPayload.motorId).toBe(workflowMotor.id);
    expect(motorLogPayload.motor.pumpingHours).toBe(7.5);
    expect(motorLogPayload.subComponentsUpdated).toBe(1);

    const motorAfterCascadeLog = db.motors.find((record) => record.id === workflowMotor.id);
    expect(motorAfterCascadeLog?.pumpingHours).toBe(7.5);

    const componentAfterCascadeLog = db.subComponents.find((record) => record.id === subComponent.id);
    expect(componentAfterCascadeLog?.cumulativeHours).toBe(20);
    expect(db.hourLogs).toHaveLength(1);
    expect(db.subComponentHourLogs).toHaveLength(1);

    const patchedName = 'Motor Workflow Alpha - Rev A';
    const patchResponse = await patchMotor(
      new Request(`http://localhost/api/motors/${workflowMotor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patchedName,
        }),
      }) as never,
      { params: Promise.resolve({ id: workflowMotor.id }) }
    );

    expect(patchResponse.status).toBe(200);

    const refreshedMotor = await getMotor(workflowMotor.id);
    expect(refreshedMotor?.name).toBe(patchedName);
    expect(refreshedMotor?.editLogs).toHaveLength(1);
    expect(refreshedMotor?.editLogs[0].changedFields).toMatchObject({
      name: {
        previous: 'Motor Workflow Alpha',
        next: patchedName,
      },
    });

    const csvResponse = await exportPost(
      new Request('http://localhost/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'motors',
          format: 'CSV',
          fields: ['name', 'status', 'pumpingHours'],
          filters: {
            statuses: [oneTimeStatus],
          },
        }),
      }) as never
    );

    expect(csvResponse.status).toBe(200);
    const csvBody = await csvResponse.text();
    expect(csvBody).toContain('Motor Workflow Alpha - Rev A');
    expect(csvBody).not.toContain('Motor Control Beta');

    const pdfResponse = await exportPost(
      new Request('http://localhost/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'motors',
          format: 'PDF',
          fields: ['name', 'serialNumber', 'status', 'pumpingHours'],
          filters: {
            statuses: [oneTimeStatus],
          },
        }),
      }) as never
    );

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get('content-type')).toContain('application/pdf');
    expect(pdfResponse.headers.get('content-disposition')).toContain('.pdf');

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    expect(pdfBuffer.length).toBeGreaterThan(200);
    expect(pdfBuffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });
});
