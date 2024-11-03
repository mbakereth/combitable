// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
import { PrismaClient, type Prisma } from '@prisma/client'

const prisma = new PrismaClient();

async function main() {

    /////////////////////////////////////////////////////////////////////////////////////
    // Transponders

    await prisma.transponder.deleteMany();

    const transponder1 : Prisma.TransponderCreateInput = {
        transponder_id: "T0001",
        transponder_id2: null,
        implantation_date: new Date("2024-02-01"),
        transponder_type: "normal"
    };
    await prisma.transponder.create({data: transponder1});

    const transponder2 : Prisma.TransponderCreateInput = {
        transponder_id: "T0002",
        transponder_id2: null,
        implantation_date: new Date("2024-02-02"),
        transponder_type: "normal"
    };
    await prisma.transponder.create({data: transponder2});

    /////////////////////////////////////////////////////////////////////////////////////
    // Breedings Pairs and their Mice

    await prisma.mouse.deleteMany();
    await prisma.breedingPair.deleteMany();

    const mouse1 : Prisma.MouseCreateInput = {
        mouse_id: "mouse1",
        sex: "m",
        birth_date: new Date("2024-01-01"),
        death_date: null,
        death_type: null,
        origin: 2,
        transponder: {connect: {transponder_id: transponder1.transponder_id}},
        social_status: "breeding",
        past_experience: "Had contact",
        remark: null,
                
    };
    await prisma.mouse.create({data: mouse1});

    const mouse2 : Prisma.MouseCreateInput = {
        mouse_id: "mouse2",
        sex: "f",
        birth_date: new Date("2024-01-02"),
        death_date: null,
        death_type: null,
        origin: 2,
        transponder: {connect: {transponder_id: transponder2.transponder_id}},
        social_status: "breeding",
        past_experience: "Had contact",
        remark: null,
                
    };
    await prisma.mouse.create({data: mouse2});

    const breedingPair1 : Prisma.BreedingPairCreateInput = {
        breeding_pair_id: "breed1",
        male: {connect: {mouse_id: mouse1.mouse_id}},
        female: {connect: {mouse_id: mouse2.mouse_id}},
        bp_start: new Date("2024-05-01"),
        bp_end: null,
        active: true,
    }
    await prisma.breedingPair.create({data: breedingPair1});

    /////////////////////////////////////////////////////////////////////////////////////
    // Litters and their Mice

    await prisma.litter.deleteMany();

    const litter1 : Prisma.LitterCreateInput = {
        litter_id: "litter1",
        birth_date: new Date("2024-09-01"),
        age_found: 5,
        pups_found: 2,
        breeding_pair: {connect: {breeding_pair_id: breedingPair1.breeding_pair_id}},
    }
    await prisma.litter.create({data: litter1});

    const mouse3 : Prisma.MouseCreateInput = {
        mouse_id: "mouse3",
        sex: "m",
        birth_date: new Date("2024-06-01"),
        death_date: null,
        death_type: null,
        origin: 1,
        litter: {connect: {litter_id: litter1.litter_id}},
        social_status: "",
        past_experience: "",
        remark: null,
                
    };
    await prisma.mouse.create({data: mouse3});

    const mouse4 : Prisma.MouseCreateInput = {
        mouse_id: "mouse4",
        sex: "f",
        birth_date: new Date("2024-06-01"),
        death_date: null,
        death_type: null,
        origin: 1,
        litter: {connect: {litter_id: litter1.litter_id}},
        social_status: "",
        past_experience: "",
        remark: null,
                
    };
    await prisma.mouse.create({data: mouse4});
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        // @ts-ignore
        process.exit(1)
    })
