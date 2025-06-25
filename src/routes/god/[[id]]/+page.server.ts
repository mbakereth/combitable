import { PrismaClient } from '@prisma/client';

function errorMessage(e : any) : string {
    if (typeof(e) == "string") return e;
    if (typeof(e) == "object" && "message" in e) return e.message;
    return "Unknown error"
}

/** @type {import('./$types').PageLoad} */
import type { CombiTableColumn } from '@mbakereth/combitable';
export async function load({ params, url, depends }) {
    const prisma = new PrismaClient();

    if (params.id) {
        const id = Number(params.id)
        try {
            const data = await prisma.god.findUniqueOrThrow({
                where: {id: id},
                include: { father: true, mother: true},
            })
            return {
                rec: data, 
            };
        }
        catch (e) {
            console.log(e);
            return {error: errorMessage(e)};        
        }
    } else {
        return {}
    }
}
