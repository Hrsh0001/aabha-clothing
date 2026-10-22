import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getNormalizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl) return undefined;
  if (
    (rawUrl.includes(':6543') || rawUrl.includes('pooler.supabase.com')) &&
    !rawUrl.includes('pgbouncer=true')
  ) {
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}pgbouncer=true`;
  }
  return rawUrl;
}

const normalizedUrl = getNormalizedDatabaseUrl();

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  (normalizedUrl
    ? new PrismaClient({
        datasourceUrl: normalizedUrl,
        log:
          process.env.NODE_ENV === 'test'
            ? []
            : process.env.NODE_ENV === 'development'
            ? ['error', 'warn']
            : ['error'],
      })
    : (null as unknown as PrismaClient));

if (prisma) {
  globalForPrisma.prisma = prisma;
}


