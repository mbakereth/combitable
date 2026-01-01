import { PrismaClient, type God } from '$lib/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

function errorMessage(e : any) : string {
    if (typeof(e) == "string") return e;
    if (typeof(e) == "object" && "message" in e) return e.message;
    return "Unknown error"
}

/** @type {import('./$types').PageLoad} */
import type { CombiTableColumn } from '@mbakereth/combitable';
export async function load({ params, url, depends }) {
    const connectionString = `${process.env.DATABASE_URL}`;
    const adapter = new PrismaBetterSqlite3({ url: connectionString });
    const prisma = new PrismaClient({adapter});

    if (params.id == "new") {
        let rec : Partial<God & {
            mother?: God, 
            father?: God, 
            children_as_father: God[], 
            children_as_mother: God[],
            children: string[]}> =
            {children_as_father: [], children_as_mother: [], children: []}
        return {
            rec,
            isAdd: true,
        };
    } else if (params.id) {
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
                isAdd: false,
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
