// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

import { SearchUrl } from '$lib/searchurl';
import { PrismaClient, Prisma } from '@prisma/client';

/** @type {import('./$types').PageLoad} */
import type { CombiTableColumn } from '$lib/combitabletypes';
export async function load({ params, url, depends }) {
    const prisma = new PrismaClient();

    const searchUrl = new SearchUrl(url, 5);
    searchUrl.setDefaultSortCol("name");
    const fields = searchUrl.getPrismaFields(Prisma.dmmf.datamodel.models, "God", "name");
    const gods = await prisma.god.findMany({
        include: {
            father: true,
            mother: true,
          },
          ...fields
    });

    let g = Prisma.dmmf.datamodel.models;
    return {gods: gods, 
        havePrevious: searchUrl.defaultTake > 0 && searchUrl.getSkip()>0, 
        haveNext: searchUrl.defaultTake > 0 && gods.length >= searchUrl.getTake()
    };

}
