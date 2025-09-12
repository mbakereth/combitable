CombiTable
==========
Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

CombiTable is a table component for SvelteKit using TailwindCSS and Daisy UI.

It supports sorting, filtering, adding, editing and deleting.  These actions
are done through backend hooks that you provide to the table.  In the UI
they are done in-place in the table.

This package also provide a set of classes for making details pages as an
alternative to editing in the table directly.

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

Nested Data
-----------

Row objects can be nested, for example:

```ts
    let rows = [
        {id: 1, name: "Joe Bloggs", dob: "1980-06-12", type: 0, home: {
            id: 1,
            town: "Adelaide",
            country: "Australia",
        }},
        {id: 2, name: "Mary Smith", dob: "1978-05-20", type: 1, home: {
            id: 1,
            town: "Chur",
            country: "Switzerland",
        }},
        {id: 2, name: "Alice Jones", dob: "1982-02-15", type: 0, home: {
            id: 1,
            town: "Cambridge",
            country: "UK",
        }},
    ];
```

In your columns, you can refer to the fields using dot notation, eg:

```ts
    let columns : CombiTableColumn[] = [
        {name: "ID", col: "id", type: "integer", primaryKey: true},
        {name: "Name", col: "name", type: "string"},
        {name: "DOB", col: "dob", type: "date"},
        {name: "Town", col: "home.town", type: "string"},
        {name: "Type", col: "type", type: "select:integer", values=[0,1] names=["Employee", "Manager"]},
```

URLs
----

Pagination, sorting and filtering parameters are stored in URL parameters, so that your page is displayed with `GET` not only `POST`.

The parameters are:

|Param|Description|Example|
|-----|-----------|-------|
|s    |Sort col, optionally prefixed with `-` or `-|`name`, `-home.town`|
|f    |Filters `fieldname:value` separated by `,`|`name:Joe*,home.town:Adelaide`|
|t    |Return at most this number of rows (0=all)|`20`|
|k    |Skip this number of rows|`10`|
|i    |Return only rows with these IDs, comma-separated|`1,3`|
|b    |Back URL|See below|

AS in the above example, wildcards are supported in filter values with `*` but for Prisma only at the beginning or end.

The Back URL feature allows URL history to be stored as a stack. To add
a URL to the stack, remove the origin, host and port, URL-Encode the rest and set the `b` parameter to it.  To add another URL to the stack, repeat on the URL including the `b` parameter.

### SearchUrl class

The SearchUrl class is designed to manipulate and query the above parameters.  Eg if your URL has

```
/mypage?s=+name&f=Name%3AJoe%20Bloggs
```

and you have in your `+page.server.ts`
```ts
    const searchUrl = new SearchUrl(url);
    searchUrl.setDefaultSortCol("name"); 
    const sort = searchUrl.getSort();
    const filters = searchUrl.getFilters();
```

then `sort` will be 
```
{sortCol: "name", sortDirection: "ascending"}
``` 

and `filters` will be

```
{name: "Joe Bloggs"}
```

Likewise you can set thee in the URL parameters with

```ts
serachUrl.sort("name", "ascending");
searchUrl.setFilterComponent("name", "Joe Bloggs")
```

You can get the resulting URL (as a URL object) with

```ts
searchUrl.url
```

Pagination
----------

CombiTable is designed to only hold a page of data, not the whole table, so sorting requires a call to your backend `+page.server.ts`.  This is particularly easy if you use Prisma as SearchUrl has direct support for it.

Eg, in your `+page.server.ts` (this is ferom the exmaple in the Repo):

```ts
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
```

`getPrismaFields` uses Prisma's column configuration in `Prisma.dmmf.datamodel.models` and outputs an object which can be included directly in Prisma's find methods.  This includes sorting, filtering, pagination and direct selection of IDs.  For the latter, by default the ID column is `id_pk`.  This can be overridden with `setIdColumn()`.

Sorting and Filtering
---------------------

To turn on sorting, add

```
enableSort={true}
```

to your `CombiTable` tag.  The column headers become clickable.  First click sorts in ascending order, second click in descending.  When you click on a column. it makes call to the same URL again but with the new sort setting in the `s` parameter as per the description above.

To turn on filtering, add

```
enableFilter={true}
```

A filter row will appear in your table.  If you enter a value in one or more of the fields and press Enter, it makes call to the same URL again but with the new sort setting in the `f` parameter as per the description above.

### Advanced Sorting and Filtering

You can turn off sorting for an individual column with `sortable=false` in the column setting (CombiTableColumn).

#### Filtering on nested objects

For Prisma, filtering works out of the box for many-to-one and one-to-one relations, eg `home.town`.  It doesn't work for many-to-many or many-to-one.  If you want to support this, you can pass a custom function for that column by setting `prismaWhere`

For sorting on many-to-many or one-to-many function with Prisma, or recommendation is to create a view with appropriate join to flatten to flatten the table, and select from this instead.

Linking from Table Fields
-------------------------

You can turn a table cell into a link but using the `link` field in the `CombiTableColumn` row, eg:

```ts
    let columns : CombiTableColumn[] = [
        ...
        {name: "Town", col: "home.town", type: "string", link: (row) => "address/"+row.home.id},
        ...
```

Editable Tables
---------------

You can turn on editing rows, deleting rows and adding new rows with the following attributes in the COmbiTable element:

|Attribute|Description|
|----------|-----------|
|editUrl   |URL to call to update the record|
|deleteUrl |URL to call to delete the record|
|addUrl    |URL to call to add a new record|
|primaryKey|The name of the field to use as the primary key|

### Editing

For editing, the body will contain each of the fields in your columns array, keyed on the `col` attribute.  `_pk` will be set to the value of the primary key.  It is up to you to implement the function to save the record.  The response it returns should contain the following fields (all of which are optional):

|Field|Description|
|----------|-----------|
|row       |Record, in same format as the row normally passed from `+page.server.ts`|
|errors |Either a string or an array of strings if you want to display an error|
|info    |A string to display if you want to show any additional information on success|

The URL is called as a POST.

### Adding

The add URL works the same as the edit URL, except it receives no primary key value in `_pk`.

The URL is called as a POST.

### Deleting

The delete URL is also called as a POST and has the primary key of the record to delete in the `_pk` attribute of the body.

### Validation

CombiTable will validate your fields for missing values and invalid values for the given type.  Other than that it is up to you to validate the data.

### Examples

See the example in the repo under `src/routes/main/god/{add|edit|delete}`

Other Features
--------------

There are features such as setting the size of the columns, operations on multiple rows, linking and unlinking related records.  See the documentation for ComboTable and CombiTableColumn and the example in the repo (https://github.com/mbakereth/combitable)
for details.

 Details Pages
-------------

The `DetailsField` class is an HTML `input` or `textarea` that is also 
configured with `CombiTableColumn`.  It knows how to format and parse its
data based on the column type.  You can group these together with
`DetailsFieldSet` which adds Edit, New and Delete buttons.

An simple example is 


```html
<script lang="ts">

    let columns : CombiTableColumn[] = [
        {name: "Name", col: "name", type: "string"},
        {name: "Gender", col: "gender", type: "select:string", values: ["m", "f"], names: ["m", "f"], minWidth: "[4rem]"},
    ]

    function urlAftetSave(rec : {[key:string]:any}) : string {
        return "/god/" + rec.id;
    }
</script>

<DetailsFieldSet
        bind:isAdd={isAdd}
        pk={data.rec?.id}
        addUrl="/add"
        newUrl="/god/new"
        editUrl="/edit"
        deleteUrl="/delete"
        deleteNextPage="/"
        saveNextPage={urlAftetSave}
    >

    <table class="table overflow-y-visible table-sm">
        <tbody>
            <tr class="border-none">
                <td class="w-32">Name</td>
                <td>
                    <DetailsField
                        col={columns[0]}
                        bind:value={fieldData[0]}
                    />
                </td>
            </tr>

            <tr class="border-none">
                <td class="w-32">Gender</td>
                <td>
                    <DetailsField
                        col={columns[1]}
                        bind:value={fieldData[1]}
                    />
                </td>
            </tr>
        </tbody>
    </table>

</DetailsFieldSet>
```

The add, edit and delete URLs work the same way as for CombiTable.  After man edit or add, the URL given by the function in `saveNextPage` is called. You can use this to display the record.  The new/updarted record is passwed to the functiom.

When a record is deleted, by default it navigates to ? `/` on success.  You can override with with the `deleteNextPage` attribute to DetailsFieldSet.

Adding over Multiple Pages
==========================

A common request from users is to navigate to a page to add a row to a related table, then navigate back without losing their unsaved edits.  DetailsFieldSet supports this with the `persistance` attribute and the PersistedNewButton component.  For an example, see the repo in
`src/routes/main/god/[id]/+page.svelte`
