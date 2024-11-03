export interface Variant {
    name: string,
}

export interface Cage {
    name: string,
}

export type Validator = (values : {[key:string]:string}) => string[];
