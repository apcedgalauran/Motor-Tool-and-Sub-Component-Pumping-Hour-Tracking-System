import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
	const connectionString = process.env.DATABASE_URL ?? '';
	const log: (Prisma.LogLevel | Prisma.LogDefinition)[] = ['query', 'info', 'warn', 'error'];

	if (connectionString.startsWith('file:') || connectionString.includes('sqlite')) {
		const adapter = new PrismaBetterSqlite3({ url: connectionString });
		return new PrismaClient({ adapter, log });
	}

	if (connectionString.startsWith('postgres')) {
		const adapter = new PrismaPg({ connectionString });
		return new PrismaClient({ adapter, log });
	}

	// Default: construct with logging options (may require `adapter` or `accelerateUrl` in Prisma v7)
	return new PrismaClient({ log });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
