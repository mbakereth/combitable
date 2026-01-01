// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
import { PrismaClient, type Prisma } from '../src/lib/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({adapter});

interface God extends Prisma.GodUncheckedCreateInput {
    father_name : string|undefined,
    mother_name: string|undefined,
}

interface Home extends Prisma.HomeUncheckedCreateInput {
}

const godsData : God[] = [
    {
        name: "Cronus",
        father_name: undefined,
        mother_name: undefined,
        gender: "m",
        died: true,
        type: 1,
    },
    {
        name: "Rhea",
        father_name: undefined,
        mother_name: undefined,
        gender: "f",
        died: true,
        type: 0,
    },
    {
        name: "Zeus",
        father_name: "Cronus",
        mother_name: "Rhea",
        gender: "m",
        died: false,
        type: 0,
    },
    {
        name: "Uranus",
        father_name: undefined,
        mother_name: undefined,
        gender: "f",
        died: false,
        type: 2,
    },
    {
        name: "Aphrodite",
        father_name: "Zeus",
        mother_name: "Uranus",
        gender: "m",
        died: false,
        type: 0,
    },
    {
        name: "Gaia",
        father_name: undefined,
        mother_name: undefined,
        gender: "f",
        died: false,
        type: 2,
    },
    {
        name: "Coeus",
        father_name: "Zeus",
        mother_name: "Gaia",
        gender: "m",
        died: true,
        type: 2,
    },
    {
        name: "Leto",
        father_name: "Coeus",
        mother_name: "Rhea",
        gender: "f",
        died: false,
        type: 0,
    },
    {
        name: "Apollo",
        father_name: "Coeus",
        mother_name: "Leto",
        gender: "m",
        died: false,
        type: 0,
    },
    {
        name: "Hera",
        father_name: "Cronus",
        mother_name: "Rhea",
        gender: "f",
        died: false,
        type: 0,
    },
    {
        name: "Phoebe",
        father_name: "Uranus",
        mother_name: "Gaia",
        gender: "f",
        died: false,
        type: 1,
    },
    {
        name: "Ares",
        father_name: "Zeus",
        mother_name: "Leto",
        gender: "m",
        died: false,
        type: 0,
    },
    {
        name: "Oceanus",
        father_name: undefined,
        mother_name: undefined,
        gender: "m",
        died: false,
        type: 2,
    },
    {
        name: "Tethys",
        father_name: "Cronus",
        mother_name: "Gaia",
        gender: "f",
        died: false,
        type: 0,
    },
    {
        name: "Metis",
        father_name: "Ares",
        mother_name: "Tethys",
        gender: "f",
        died: false,
        type: 0,
    },
    {
        name: "Athena",
        father_name: "Zeus",
        mother_name: "Metis",
        gender: "f",
        died: false,
        type: 0,
    },
];

const homeData : Home[] = [
    {
        name: "Olympus"
    }
];

const olympians = [
    "Zeus", "Aphrodite", "Apollo", "Athena"
];

async function main() {

    await prisma.god.deleteMany();
    await prisma.home.deleteMany();

    let godName2Id : {[key:string]:number} = {};

    for (let home of homeData) {
        let ret = await prisma.home.create({
            data: home
        });
        console.log("Created", home.name)
    }

    for (let god of godsData) {
        if (god.father_name) {
            if (god.father_name in godName2Id) {
                god.father_id = godName2Id[god.father_name];
                delete god.father_name;
            } else {
                throw Error("Parent " + god.father_name + " doesn't exist");
            }
        }
        if (god.mother_name) {
            if (god.mother_name in godName2Id) {
                god.mother_id = godName2Id[god.mother_name];
                delete god.mother_name;
            } else {
                throw Error("Parent " + god.mother_name + " doesn't exist");
            }
        }
        let ret = await prisma.god.create({
            data: god
        });
        console.log("Created", god.name)
        godName2Id[ret.name] = ret.id;

    }

    for (let name of olympians) {
        await prisma.god.update({
            data: {home: {connect: {name: "Olympus"}}},
            where: {name}
        })
        console.log("Set home for " + name + " to Olympus")
    }
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
