export interface Variant {
    name: string,
}

export interface Cage {
    name: string,
}

export type Validator = (values : {[key:string]:string}) => string[];

export enum PartialDateType {
    datetime=0,
    date,
    month,
    year
}
