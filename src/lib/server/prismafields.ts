import { PrismaClient } from '$lib/generated/prisma/client'
import type { CombiTableColumn } from "../combitabletypes";
declare type RuntimeModel = Omit<{[key:string]:any}, 'name'>;
import { SearchUrl } from '../searchurl'
import type { PrismaFields, PrismaModelMap, PrismaModelMaps } from '../searchurl'

export declare type CombiTablePrismaClient = PrismaClient;

/**
 * Return a prisma representation of the filter and search parameters
 * @param models The PrismaModel for the model this is searching.  You can
 *     pass `(prisma as {[key:string]:any})._runtimeDataModel.models as RuntimeDataModel` for this
 * @param modelName the Prisma name of the model (capitalized)
 * @param defaultSearch If no search field is given in the command line,
 *     sort by this.
 * @param columns column configuration for all filterable/sortable columns
 * @returns 
 */
export function getPrismaFields(su: SearchUrl, prisma : PrismaClient|null, modelName: string, defaultSearch : string = "", columns: CombiTableColumn[]|undefined = undefined) : PrismaFields {

    let models = prisma == null ? {} : (prisma as {[key:string]:any})._runtimeDataModel.models as Record<string, RuntimeModel> //RuntimeDataModel
    
    let map : PrismaModelMaps = {}
    for (let modelName in models) {
        let name = modelName;
        let model = models[name]
        let model1 : PrismaModelMap = {
            name: name,
            fields: {}
        };
        for (let field of model.fields) {
            model1.fields[field.name] = field; 
        }
        map[name] = model1;
    }

    let ret : PrismaFields = {}
    let { sortCol, sortDirection} = su.getSort();
    const take = su.getTake();
    if (take > 0) {
        ret.take = take;
        ret.skip = su.getSkip();
    }
    //if (!sortCol) sortCol = defaultSearch;
    if (!sortCol) {
        if (defaultSearch.substring(0,1) == "+") {
            sortCol = defaultSearch.substring(1);
            sortDirection = "ascending";
        }
        else if (defaultSearch.substring(0,1) == "-") {
            sortCol = defaultSearch.substring(1);
            sortDirection = "descending";
        } else {
            sortCol = defaultSearch;
            sortDirection = "ascending";
        }
    }
    if (sortCol != "") {
        const colMatch = columns?.filter((val : {[key:string]:any}) => val.col == sortCol);
        if (!(colMatch && colMatch.length > 0 && colMatch[0].prismaOrderByIgnore)) {
            ret.orderBy = SearchUrl.makePrismaOrderBy(sortCol, sortDirection == "ascending" ? "asc" : "desc") 
        }
        /*ret.orderBy = {
            [sortCol]: sortDirection == "ascending" ? "asc" : "desc",
        };   */
    }
    let filters = su.getFilters();
    let prefilters = su.getPreFilters();
    let where : {[key:string]:any} = {}
    for (let filter in filters) {
        where = {...where, ...SearchUrl.makePrismaWhere(filter, filters[filter], map, modelName, su.suffix, su.emptySearch, columns, su.insensitive)};
    }
    for (let filter in prefilters) {
        where = {...where, ...SearchUrl.makePrismaWhere(filter, prefilters[filter], map, modelName, su.suffix, su.emptySearch, columns, su.insensitive)};
    }
    //console.log(JSON.stringify(where, null, 4))
    const ids = su.getIds();
    if (ids.length > 0) {
        const inClause = {[su.idColumn]: {in: ids}};
        where = {...where, ...inClause}
    }
    if (Object.keys(where).length !== 0) {
        ret.where = where;
    }        
    return ret;

}
