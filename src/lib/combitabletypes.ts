// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

export type PrismaWhereFunction = (value : string) => {[key:string]:any};

/**
 * Column configuration for {@link CombiTable} and {@link DetailsField}
 */
export interface CombiTableColumn {
    /**  
     * This is what appears in the column header 
     */
    name : string, 

    /** 
     * The field in the passed data.  
     * If it contains a . then nested objects are traversed
     * Eg `mother.name` will pull out `"Mama"` from `{name: "Baby", mother: {name: "Mama"}}` 
     */
    col: string, 

    /**
     * Column type.
     * 
     * For `select:string` or `select:date`, pass `names`, `values` or both
     */
    type: "string"|"boolean"|"integer"|"float"|"date"|"datetime"|"select:string"|"select:integer"|"array:string",

    /**
     * For use with `select:integer` and `select:string` column types.
     * These are the values actually set in the objects, as opposed the the value that is displayed.
     * If `names` is not passed, it is also the value that is displayed
     */
    values?: string[]|number[],

    /**
     * For use with `select:integer` and `select:string` column types.
     * These the values that are displayed, not saved in the data.
     * If `values` is not passed, it is also the value that is saved in the data
     */
    names?: string[],

    /**
     * Indicates whether a field is mandatory.
     * 
     * If `nullable` is true, the field is displayed in detault colour and
     * client-side validation allows it to be empty.
     * If `nullable` is false, the field is shade blue and client-side
     * validation will display an error if it is empty.
     */
    nullable?: boolean,

    /**
     * Don't split the value over multiple lines when displaying
     */
    nowrap?: boolean,

    /**
     * The minimum width when displaying in non-edit mode (CSS `min-width`)
     */
    minWidth? : string,

    /**
     * The maximum width when displaying in non-edit mode (CSS `max-width`)
     */
    maxWidth? : string,

    /**
     * The minimum width when displaying in edit mode (CSS `min-width`)
     */
    editMinWidth? : string,

    /**
     * The maximum width when displaying in edit mode (CSS `max-width`)
     */
    editMaxWidth? : string,

    /**
     * The width when displaying drop-down menus (type `boolean`, 
     * `select:integer` and `select:string`) 
     * (CSS `width`)
     */
    dropdownWidth? : string,

    /**
     * Whether make the field editable.  Default true.
     */
    readOnly? : boolean,

    /**
     * Whether make the field sortable.  Default true.
     */
    sortable? : boolean,

    /**
     * This is only for {@link DetailsField}.  It is the value to show
     * instad of `-` when the field is empty.
     */
    default? : string, 

    /**
     * Normally, wheen retrieving a Prisma where function, it is derived
     * as `{[col.col]: value}` for simple columns and
     * `{[first]: {[second: value]}}` for column "first.second", etc.
     * 
     * If this is not how your model works, you can pass a custom function
     * to return the appropriate where clause, eg
     * `(value) => {first: {some: {secomd: value}}}`
     */
    prismaWhere? : PrismaWhereFunction,

    /**
     * How to make the column work as a link
     * @param row the row object is passed to your function here
     * @param i the row number in the data is passed here
     * @returns return a string of the url to link to in the `<a href`
     */
    link?: (row:{[key:string]:any}, i? : number) => string,

    /**
     * A function to call for autocomplete functionality.
     * The value if the field is passed as search param `t`
     * This function should return a JSON array of values starting with the text
     * in param `t`
     */
    autoCompleteLink? : string,

    /**
     * If this is set, the field will be a `TextArea` rather than `Input` and
     * it will be this high (CCC `height`)
     */
    editHeight? : string,

}

/**
 * Used for buttons in {@link CombiTable} that act on a selected set of rows.
 */
export interface CombiTableOp {

    /** The label for the button */
    label: string,

    /**
     * Function to call when button is clicked
     * @param pks set of selected primary keys from the table
     * @returns can optionally return an error message or info message to display
     */
    fn: (pks: (string|number)[]) => Promise<{error? : string, info? : string}>
} 

/**
 * For adding additional buttons where the `"Add"` button is
 */
export interface CombiTableExtraButton {
    label: string,
    fn: () => Promise<void>
} 

/**
 * Set of presets to pass when a new row is being created.
 * 
 * Any column set here will have the corresponding value instead of the
 * column being empty.
 * 
 * You can have a simple value or a function that returns a value
 */
export type CombiTablePresets = 
    {[key:string] : 
        string|number|boolean|Date|(()=>string|number|boolean|Date)};