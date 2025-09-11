// Copyright (c) 2025 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

import { SearchUrl } from '$lib/searchurl';
import { PrismaClient, Prisma } from '@prisma/client';

/** @type {import('./$types').PageLoad} */
export async function load({ params, url, depends }) {
    const prisma = new PrismaClient();

    const searchUrl = new SearchUrl(url);
    searchUrl.setDefaultSortCol("name"); // if no sort parameter is given on the command line, sort by this field
    const fields = searchUrl.getPrismaFields(Prisma.dmmf.datamodel.models, "God", "name");
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
