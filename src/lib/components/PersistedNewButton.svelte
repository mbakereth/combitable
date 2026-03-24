<!-- 
    @component for making in-edit new item buttons

    Your user may be editing an item and want to create something it has
    a relation to.  When finished creating said relation, your user wants
    to go back to the previous edit, with their unsaved changes restored.$$render
    
    This component is a button to do that.
-->
<script lang="ts">
    import { type Snippet } from 'svelte';

    type Props = {

        /**
         * Funtion to return the URL to go to when clicked
         */
        url: () => URL;

        /**
         * If passed together with toCol, value from this column will be
         * pasted into toCol when returning to the previous page.
         */
        fromCol? : string;

        /**
         * See fromCol
         */
        toCol? : string;

        children: Snippet;
    }
    import DetailsFieldSet from './DetailsFieldSet.svelte';
    import { getContext } from 'svelte';

    const { newItemWithPersistanceLink } = getContext<DetailsFieldSet>('detailsfieldset');

    let { url, fromCol, toCol, children} : Props = $props();

</script>

<button class="btn btn-default" onclick={async () => {await newItemWithPersistanceLink(url(), fromCol, toCol)}}>
    {@render children()}
</button>
