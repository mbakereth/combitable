// Copyright (c) 2025 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

import { SearchUrl } from '$lib/searchurl';
import { PrismaClient, Prisma,  } from '$lib/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getPrismaFields } from '$lib/server/prismafields'

/** @type {import('./$types').PageLoad} */
export async function load({ params, url, depends }) {
    const connectionString = `${process.env.DATABASE_URL}`;
    console.log("Connection string 1", connectionString)
    const adapter = new PrismaBetterSqlite3({ url: connectionString });
    const prisma = new PrismaClient({adapter});
    const searchUrl = new SearchUrl(url);
    searchUrl.setDefaultSortCol("name"); // if no sort parameter is given on the command line, sort by this field
    const fields = getPrismaFields(searchUrl, prisma, "God", "name");
    const gods = await prisma.god.findMany({
        include: {
            father: true,
            mother: true,
          },
          ...fields
    });

    // the havePrevious and haveNext buttons are passed to the CombiTable to activate their respective buttons
    return {gods: gods, 
        havePrevious: searchUrl.defaultTake > 0 && searchUrl.getSkip()>0, 
        haveNext: searchUrl.defaultTake > 0 && gods.length >= searchUrl.getTake()
    };

}
