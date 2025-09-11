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

Details Pages
-------------

The `DetailsField` class is an HTML `input` or `textarea` that is also 
configured with `CombiTableColumn`.  It knows how to format and parse its
data based on the column type.  You can group these together with
`DetailsFieldSet` which adds Edit, New and Delete buttons.

Other Features
--------------

There are features for clicking on table columns to navigate to different
pages, saving history and temporary edits.

More Details
------------

For more details, close this repo 
https://github.com/mbakereth/combitable
and look at the documentation for the components and the `+page.svelte` files
in the routes.

