import { type RequestEvent } from '@sveltejs/kit';
import { autocomplete } from '$lib/utils'
import { PrismaClient, type Prisma } from '$lib/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

export const GET = async (event : RequestEvent) => {
    const connectionString = `${process.env.DATABASE_URL}`;
    const adapter = new PrismaBetterSqlite3({ url: connectionString });
    const prisma = new PrismaClient({adapter});
    return await autocomplete(prisma, event, {god: ["**"]});
}
