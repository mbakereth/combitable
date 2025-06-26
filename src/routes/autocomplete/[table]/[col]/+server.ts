import { type RequestEvent } from '@sveltejs/kit';
import { autocomplete } from '$lib/utils'
import { PrismaClient, type Prisma } from '@prisma/client';

export const GET = async (event : RequestEvent) => {
    const prisma = new PrismaClient();
    return await autocomplete(prisma, event, {god: ["**"]});
}
