CombiTable
==========
Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

CombiTable is a table component for SvelteKit using TailwindCSS and Daisy UI.

It supports sorting, filtering, adding, editing and deleting.  These actions
are done through backend hooks that you provide to the table.

Quick Start
-----------

Assuming you have a data model with the columns id (integer), name (string),
dob (Date) and type (integer), in the `*.svelte` page where you want to use the 
component, write something like this

```html
<script>
    import { CombiTable, type CombiTableColumn } from 'combitable' 

    let columns : CombiTableColumn[] = [
        {name: "ID", col: "id", type: "integer", primaryKey: true},
        {name: "Name", col: "name", type: "string"},
        {name: "DOB", col: "dob", type: "date"},
        {name: "Type", col: "type", type: "select:integer", values=[0,1] names=["Employee", "Manager"]},
    ];

    let rows = [
        {id: 1, name: "Joe Bloggs", dob: "1980-06-12", type: 0},
        {id: 2, name: "Mary Smith", dob: "1978-05-20", type: 1},
        {id: 2, name: "Alice Jones", dob: "1982-02-15", type: 0},
    ];
</script>

...
<CombiTable 
    rows={rows} 
    columns={columns} 
/>

```
### Columns

The following fields are available in `TableColumn` 

* `name : string` Name to appear in the header
* `col: string` Name of the column in the rows
* `type: "string"|"boolean"|"integer"|"date"|"select:string"|"select:integer"` type of data in the rows
* `values?: string[]|number[]` if this is present, when the column is edited, it will be presented as a drop down list.  These are the available values
* `names?: string[]` optionally use this with `values`.  These are the names that will display for each value.  If omitted, the value will be displayed, typecast to string.
* `nullable?: boolean` Wben editing, allow this column to be left blank
* `nowrap?: boolean` Prevent this column from wrapping (always true for date fields)
* `primaryKey? : boolean` When updating or deleting data, this column will be used as the primary key
* `minWidth? : string` For fixed with tables, make the column this minimum size.  This is a TailwindCSS width.  Eg `minWidth={4}` will result in `min-w-4`
* `readOnly? : boolean` If this is true, the column will be omitted when editting.
* `link?: (row:{[key:string]:any}) => string` If this is present, the column will be an anchor and this function will be called with the row data to produce the `href`
* `minWidth`: minimum width for displaying the column.  This is turned into a TailwindCSS class by prepending `min-w` to it, for example setting `minWidth: "[2rem]"` will result in `min-w-[2rem]`.  See the note on PostCSS below.
* `editMinWidth`: as `minWidth`, except for edit fields (filter, edit text when adding/editing a row, what is displayed in the row for select items).
* `dropdownWidth`: as `minWidth`, except for dropdowm fields.  This is the actual with, not the minimum width, eg `dropdownWidth: 8` will result in the class `w-8`.


### CombiTable options

* `rows` an array of objects.  Keys match the `col` in columns
* `columns` Column configuration
* `defaultSort` Default sort column.  The data in `rows` should be sorted by this if no sort is present in the URL
* `enableSort` If true, column headers can be clicked on to sort.
* `enableFilter` If true, a filter row will be added
* `editUrl` If defined, an edit button will be added to each row.  Clicking will call this url with the row data plus `_pk` (as defined by the `primaryKey` row in `columns`) as the JSON body.
* `addUrl` If defined, an Add button will be added to the top of the table.  Saving the new row will call this url with the data as a JSON body.
* `deleteUrl` If defined, an edit button will be added to each row.  Clicking will call this url with `_pk` (as defined by the `primaryKey` row in `columns`) as the JSON body.
* `paginate` if greater than zero, turns on pagination with this number of rows per page.  `rows` is expected to have at most this number of rows (all will be displayed regardless of the value of `paginate`)
* `havePrevious` if true and `paginate` is greater than 0, enable the Previous button.
* `haveNext` if true and `paginate` is greater than 0, enable the Next button.

### URLs

Pagination, sorting and filtering are all done by calling the same URL with different query parameters.  The query parameters are:

* `s` sort column optionally with a `+` or `-` preceeding it, eg `-name`
* `f` filters, comma separated, in the form `colname:value` eg `gender:m,type:0`
* `t` (take) number of rows to return, 0 zero for all rows
* `k` (skip) for pagination, skip this number of rows
* `b` back URL.  This is query parameters conformant with the above, prefixed by the path name and a `?`.  You can use this to implement back functionality

Ther is a class SearchUrl that helps you create and parse this.  For example, to add sorting to a URL:

```typescript
const url = new SearchUrl($page.url);
url.sort("name", "ascending"); // add sorting by name to url
await invalidateAll();
searchParams = `?${url.url.searchParams.toString()}`;
goto(searchParams);
```

When parsing the URL:

```typescript
const url = new SearchUrl($page.url);
let {sortCol, sortDirection} = url.getSort();
```

If you use Prisma, you can do the following:

```typescript
const searchUrl = new SearchUrl(url);
const fields = searchUrl.getPrismaFields(Prisma.dmmf.datamodel.models, "ModelTheTableWasFor", "name");
const rows = await prisma.god.findMany({
    ...fields
});
```

The `getPrismaFields` method takes the Prisma model vector so that it can correctly typecast the filters from the string form in the query parameters to the correct types.

## Important: PostCSS Considerations

This component is styled with TailwindCSS.  TailwindCSS generates CSS classes
using PostCSS during the build process.  It can only do this if the classnames
appear as literals in a `class=` attribute.

Combitable generates some classes programmatically based on your `CombiTableColumn` settings.  As these are not literals, PostCSS doesn't pick them up.  The easiest may to make sure they are picked up is to create a hidden `DIV` somewhere in your code.  For example. if you set `minWidth: "8"` somewhere in your columns, add the following to one of your `.svelte` pages:

```html
<div class="hidden min-w-8></div>
```

See the Columns section above for details about setting `minWidth`, `editMinWidth` and `dropdownWidth`.
