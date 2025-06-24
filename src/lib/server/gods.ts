// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

import { json, type RequestEvent } from '@sveltejs/kit';
import { PrismaClient, type Prisma } from '@prisma/client';
import type { God } from '@prisma/client'
import { Ops } from './ops';

export class GodsOps extends Ops {

    static async addPost(event : RequestEvent)  : Promise<Response>  {
        try {
            const ret =  await GodsOps.addOrUpdateGod(event, true);
            return json(ret);
        } catch (e) {
            console.log(e);
            return json({errors: "Unexpected error: " + Ops.errorMessage(e)})
        }
    }

    static async editPost(event : RequestEvent)  : Promise<Response>  {
        try {
            const ret =  await GodsOps.addOrUpdateGod(event, false);
            return json(ret);
        } catch (e) {
            console.log(e);
            return json({errors: "Unexpected error: " + Ops.errorMessage(e)});
        }
    }
 
    static async deletePost(event : RequestEvent)  : Promise<Response>  {
        try {

            const body = await event.request.json();
            if (Ops.isEmpty(body._pk)) {
                return json({error: "Primary key invalid"});
            }
            const prisma = new PrismaClient();
            await prisma.god.delete({where: {name: body._pk}});
            return json({pk: body._pk});
        } catch (e) {
            console.log(e);
            return json({error: "Unexpected error: " + Ops.errorMessage(e)})
        }
    }

    static async addOrUpdateGod(event : RequestEvent, add: boolean)  : Promise<{row? : God, errors?: string[]|string, info? : string}>  {
        const body =  await event.request.json();
        if (!add && (Ops.isEmpty(body._pk))) {
            return {errors: "Primary key missing or invalid"};
        }

        const {errors, god} = await GodsOps.validate(body);
        if (errors) return {errors};
        let info : string|undefined = undefined;

        if (god) {
            try {
                const prisma = new PrismaClient();
                let newGod: God;
                if (add) {
                    delete god.father_id;
                    delete god.mother_id;
                    newGod = await prisma.god.create({
                        data: god as Prisma.GodCreateInput
                    });
                } else {
                    delete god.father;
                    delete god.mother;
                    let editGod : Prisma.GodUncheckedUpdateInput = {...god};
                    const res = await prisma.god.updateMany({
                        data: editGod,
                        where: {name: body._pk}
                    });
                    newGod = await prisma.god.findFirstOrThrow({where: {name: god.name}});
                }
                const retGod = await prisma.god.findUniqueOrThrow({
                    where: {id: newGod.id},
                    include: {
                        father: true,
                        mother: true,
                      },
                });
            
                return {row: retGod, info};
            } catch (e) {
                console.log(e);
                return {errors: "Couldn't add to database: " + Ops.errorMessage(e)}
            }
        } else {
            return {errors: "Unexpectedly receive no error and also no mouse"}
        }

    }

    static async validate(body: {[key:string]:any}) : Promise<{errors? : string[]|string, god? : Prisma.GodCreateInput&Prisma.GodUncheckedCreateInput}> {
        let errors : string[] = [];
        if (!Ops.isEmpty(body.gender) && (body.gender != "m" && body.gender != "f")) errors.push("Gender is invalid");
        if (Ops.isEmpty(body["died"])) errors.push("Died not given");
        if (Ops.isEmpty(body["type"]) || !Ops.isInteger(body["type"])) {
            errors.push("Type is invalid");
        } else {
            const n = Number(body.type);
            if (![0,1,2].includes(n)) errors.push("Type is invalid");
        }

        let have_father = false;
        let have_mother = false;
        let father_id = 0;
        let mother_id = 0;

        const prisma = new PrismaClient();

        if (body["father.name"]) {
            try {
                const res = await prisma.god.findUniqueOrThrow({where: {name: body["father.name"]}});
                have_father = true;
                father_id = res.id;
            } catch {}
        }
        if (body["mother.name"]) {
            try {
                const res = await prisma.god.findUniqueOrThrow({where: {name: body["mother.name"]}});
                have_mother = true;
                mother_id = res.id;
            } catch {}
        }
        if (!Ops.isEmpty(body["father.name"]) && !have_father) errors.push("Father doesn't exist")
            if (!Ops.isEmpty(body["mother.name"]) && !have_mother) errors.push("Mother doesn't exist")

        if (errors.length > 0) return {errors};

        let god : Prisma.GodCreateInput&Prisma.GodUncheckedCreateInput = {
            name: body.name,
            gender: body.gender,
            died: body.died,
            type: Number(body.type),
            father: Ops.isEmpty(body["father.name"]) ? undefined : { connect: {id: father_id}},
            mother: Ops.isEmpty(body["mother.name"]) ? undefined : { connect: {id: mother_id}},
            father_id: Ops.isEmpty(body["father.name"]) ? null : father_id,
            mother_id: Ops.isEmpty(body["mother.name"]) ? null : mother_id,
        }
        return { god };
    }

    static async killGodsPost(event : RequestEvent)  : Promise<Response>  {

        try {
            const body = await event.request.json();
            if (Ops.isEmpty(body.pks)) {
                return json({errors: "Primary key invalid"});
            }
            const prisma = new PrismaClient();
            const pks = body.pks as string[];
            await prisma.god.updateMany({
                data: {
                    died: true
                },
                where: {
                    name: { in: pks }
                }
            });    
            return json({info: "Successful"})
        } catch (e) {
            console.log(e);
            return json({error: "Unexpected error: " + Ops.errorMessage(e)})
        }
    }

    static async linkToOlympusPost(event : RequestEvent) : Promise<Response>  {
        const body =  await event.request.json();

        if ((Ops.isEmpty(body.name))) {
            return json({errors: "Name missing"});
        }

        try {
            const prisma = new PrismaClient();
            const olympus = await prisma.home.findUniqueOrThrow({
                where: { name: "Olympus"}
            });
            const god = await prisma.god.findUniqueOrThrow({
                where: { name:body.name}
            });
            if (god.home_id == olympus.id) {
                return json({error: "That god is already linked"})
            }
            await prisma.god.updateMany({
                data: { home_id: olympus.id},
                where: { name: body.name},
            });
            const ret = await prisma.god.findFirstOrThrow({where: {name: body.name, home_id: olympus.id}});
            return json({row: ret});

        } catch (e) {
            console.log(e);
            return json({ error: Ops.errorMessage(e)});
        }
    }

    static async unlinkToOlympusPost(event : RequestEvent) : Promise<Response>  {
        const body =  await event.request.json();

        if ((Ops.isEmpty(body._pk))) {
            return json({errors: "Name missing"});
        }

        try {
            const prisma = new PrismaClient();
            const olympus = await prisma.home.findUniqueOrThrow({
                where: { name: "Olympus"}
            });
            const god = await prisma.god.findUniqueOrThrow({
                where: { name: body._pk}
            });
            if (god.home_id != olympus.id) {
                return json({error: "That god is not linked"})
            }
            await prisma.god.updateMany({
                data: { home_id: null},
                where: { name: body._pk},
            });
            const ret = await prisma.god.findFirstOrThrow({where: {name: body._pk}});
            return json({row: ret});

        } catch (e) {
            console.log(e);
            return json({ error: Ops.errorMessage(e)});
        }
    }
}
