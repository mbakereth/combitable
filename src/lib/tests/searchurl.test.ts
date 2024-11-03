// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

import { test, expect } from 'vitest';
import { SearchUrl } from '../searchurl'

test('utils.searchUrl.sortAscending', async () => {
    let url = new URL("http://server.com/page");
    let searchUrl = new SearchUrl(url);
    searchUrl.sort("name", "ascending");
    let sort = searchUrl.getSort();
    expect(sort.sortCol).toBe("name");
    expect(sort.sortDirection).toBe("ascending");
    expect(searchUrl.url.searchParams.get("s")).toBe("+name");
})

test('utils.searchUrl.sortDescending', async () => {
    let url = new URL("http://server.com/page");
    let searchUrl = new SearchUrl(url);
    searchUrl.sort("name", "descending");
    let sort = searchUrl.getSort();
    expect(sort.sortCol).toBe("name");
    expect(sort.sortDirection).toBe("descending");
    expect(searchUrl.url.searchParams.get("s")).toBe("-name");
})

test('utils.searchUrl.filter', async () => {
    let url = new URL("http://server.com/page");
    let searchUrl = new SearchUrl(url);
    searchUrl.setFilters({name: "XXX"});
    expect(searchUrl.getFilters().name).toBe("XXX");
    expect(searchUrl.url.searchParams.get("f")).toBe("name:XXX")
})

test('utils.searchUrl.takeDefault', async () => {
    let url = new URL("http://server.com/page");
    let searchUrl = new SearchUrl(url);
    expect(searchUrl.getTake()).toBe(searchUrl.defaultTake);
})

test('utils.searchUrl.take', async () => {
    let url = new URL("http://server.com/page");
    let searchUrl = new SearchUrl(url);
    searchUrl.take(10);
    expect(searchUrl.getTake()).toBe(10);
    expect(searchUrl.url.searchParams.get("t")).toBe("10")
})

test('utils.searchUrl.skipDefault', async () => {
    let url = new URL("http://server.com/page");
    let searchUrl = new SearchUrl(url);
    expect(searchUrl.getSkip()).toBe(0);
})

test('utils.searchUrl.skip', async () => {
    let url = new URL("http://server.com/page");
    let searchUrl = new SearchUrl(url);
    searchUrl.skip(10);
    expect(searchUrl.getSkip()).toBe(10);
    expect(searchUrl.url.searchParams.get("k")).toBe("10")
})

test('utils.searchUrl.back', async () => {
    let backUrl = new URL("http://server.com/backpage");
    let backSearchUrl = new SearchUrl(backUrl);
    backSearchUrl.sort("name", "descending");
    backSearchUrl.setFilters({v1: "XXX", v2: "YYY"})
    backSearchUrl.take(20);
    backSearchUrl.skip(10);

    let url = new URL("http://server.com/page");
    let searchUrl = new SearchUrl(url);
    searchUrl.sort("sex", "ascending");
    searchUrl.setFilters({v3: "ZZZ"})
    searchUrl.setBack(backSearchUrl);

    let poppedBackSearchUrl = searchUrl.popBack();
    expect(poppedBackSearchUrl).not.toBeNull();
    if (poppedBackSearchUrl) {
        expect(poppedBackSearchUrl.url.pathname).toBe("/backpage");
        let sort = poppedBackSearchUrl.getSort();
        expect(sort.sortCol).toBe("name");
        expect(sort.sortDirection).toBe("descending");
        expect(poppedBackSearchUrl.getFilters().v1).toBe("XXX");
        expect(poppedBackSearchUrl.getFilters().v2).toBe("YYY");
        expect(poppedBackSearchUrl.getTake()).toBe(20);
        expect(poppedBackSearchUrl.getSkip()).toBe(10);

        expect(poppedBackSearchUrl.popBack()).toBeNull();
    }
})

test('utils.searchUrl.doubleBack', async () => {
    let backUrl = new URL("http://server.com/backpage");
    let backSearchUrl = new SearchUrl(backUrl);
    backSearchUrl.sort("name", "descending");
    backSearchUrl.setFilters({v1: "XXX", v2: "YYY"})
    backSearchUrl.take(20);
    backSearchUrl.skip(10);

    let backUrl2 = new URL("http://server.com/backpage2");
    let backSearchUrl2 = new SearchUrl(backUrl2);
    backSearchUrl2.sort("sex", "ascending");
    backSearchUrl2.setFilters({v3: "ZZZ"})
    backSearchUrl2.setBack(backSearchUrl);

    let url = new URL("http://server.com/page");
    let searchUrl = new SearchUrl(url);
    searchUrl.sort("litter", "ascending");
    searchUrl.setFilters({v4: "AAA"})
    searchUrl.setBack(backSearchUrl2);

    let poppedBackSearchUrl2 = searchUrl.popBack();
    expect(poppedBackSearchUrl2).not.toBeNull();
    if (poppedBackSearchUrl2) {
        expect(poppedBackSearchUrl2.url.pathname).toBe("/backpage2");
        let sort = poppedBackSearchUrl2.getSort();
        expect(sort.sortCol).toBe("sex");
        expect(sort.sortDirection).toBe("ascending");

        let poppedBackSearchUrl = poppedBackSearchUrl2.popBack();
        expect(poppedBackSearchUrl).not.toBeNull();
        if (poppedBackSearchUrl) {
            sort = poppedBackSearchUrl.getSort();
            expect(sort.sortCol).toBe("name");
            expect(sort.sortDirection).toBe("descending");
            expect(poppedBackSearchUrl.getFilters().v1).toBe("XXX");
            expect(poppedBackSearchUrl.getFilters().v2).toBe("YYY");
            expect(poppedBackSearchUrl.getTake()).toBe(20);
            expect(poppedBackSearchUrl.getSkip()).toBe(10);

            expect(poppedBackSearchUrl.popBack()).toBeNull();
        }
    }
})

test('utils.searchUrl.prismaFields', async () => {
    let url = new URL("http://server.com/page");
    let searchUrl = new SearchUrl(url, 20);
    searchUrl.skip(10);
    searchUrl.setFilters({"key1": "val1", "key2.key3.key4": "val2"});
    searchUrl.sort("col1", "descending");
    const fields = searchUrl.getPrismaFields([], "");
    expect(fields.take).toBe(20);
    expect(fields.skip).toBe(10);
    expect(fields.orderBy?.col1).toBe("desc");
    expect(fields.where?.key1).toBe("val1");
    expect(fields.where?.key2.is.key3.is.key4).toBe("val2");
})

