// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

export interface CombiTableColumn {
    name : string,
    col: string,
    type: "string"|"boolean"|"integer"|"float"|"date"|"datetime"|"select:string"|"select:integer",
    values?: string[]|number[],
    names?: string[],
    nullable?: boolean,
    nowrap?: boolean,
    primaryKey? : boolean,
    minWidth? : string,
    editMinWidth? : string,
    dropdownWidth? : string,
    readOnly? : boolean,
    link?: (row:{[key:string]:any}) => string,
}
