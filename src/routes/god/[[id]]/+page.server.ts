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
                include: { 
                    father: true, 
                    mother: true,
                    children_as_father: true,
                    children_as_mother: true
                },
            })
            let rec = {...data, 
                children: (data.gender == "m" ? data.children_as_father : data.children_as_mother).map((x) => x.name)};
            return {
                rec,
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
