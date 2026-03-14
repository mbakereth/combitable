<!--
    @component Choose a date or partial date and output it as a string   
 -->
<script lang="ts">
    // Copyright (c) 2026 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

    type Props = {
        /**
         * yyyy-mm-dd, dd-mm-yyyy or mm-dd-yyyy.  Default yyyy-mm-dd
         */
        dateFormat? : "yyyy-mm-dd"|"dd-mm-yyyy"|"mm-dd-yyyy",

        /**
         * Currently only supported are en, de and el.  Default en.
         * Anything not supported trated as en.
         */
        lang? : string,

        /**
         * If your language is not suported, you can pass month names manually
        */
        months? : string[],

        /**
         * If your language is not suported, you can pass ok/cancel names manually
        */
        buttonText? : {ok: string, cancel: string},

        /**
         * If your language is not suported, you can pass day names manually
        */
        dayAbbrebiations? : string[],

        /**
         * If true, can choose just year and month or just year.  Default false
         */
        allowPartial? : boolean,

        /**
         * Bind to this to get or set the year
         */
        year : number|undefined,

        /**
         * Bind to this to get the month (0-11)
         */
        month : number|null|undefined,

        /**
         * Bind to this to get the day (1-31)
         */
        day : number|null|undefined,

        classes? : string,

        styles? : string,

        id? : string,

        zIndex? : number,

        onOk? (year: number, month: number|null, day: number|null) : void;
        onCancel? () : void;

    };

    const Months : {[key:string]:string[]} = {
        "en": [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ],
        "de": [
            "Januar",
            "Februar",
            "März",
            "April",
            "Mai",
            "Juni",
            "Juli",
            "August",
            "September",
            "Oktober",
            "November",
            "Dezember"
        ],
        "el": [
            "Ιανουάριος",
            "Φεβρουάριος",
            "Μάρτιος",
            "Απρίλιος",
            "Μάιος",
            "Ιούνιος",
            "Ιούλιος",
            "Αύγουστος",
            "Σεπτέμβριος",
            "Οκτώβριος",
            "Νοέμβριος",
            "Δεκέμβριος"
        ]
    }

    const ButtonText = {
        en: {ok: "OK", cancel: "Cancel"},
        de: {ok: "OK", cancel: "Abbrechen"},
        el: {ok: "OK", cancel: "Ακύρωση"},
    }

    const DayAbbreviations : {[key:string]:string[]} = {
        "en": [
            "So",
            "Mo",
            "Tu",
            "We",
            "Th",
            "Fr",
            "Sa",
        ],
        "de": [
            "So",
            "Mo",
            "Di",
            "Mi",
            "Do",
            "Fr",
            "Sa",
        ],
        "el": [
            "Κυ",
            "Δε",
            "Τρ",
            "Τε",
            "Πε",
            "Πα",
            "Σα",
        ]
    }

    import { 
        parseDate, 
        getToday, 
        printDate, 
        yearFromPartialDate, 
        monthFromPartialDate, 
        dayFromPartialDate,
        firstOfMonth,
        lastOfMonth,
        addDays,
        numDaysBetween } from '$lib/utils'
    import ForwardIcon from "./icons/ForwardIcon.svelte";
    import FastForwardIcon from "./icons/FastForwardIcon.svelte";
    import ReverseIcon from "./icons/ReverseIcon.svelte";
    import FastReverseIcon from "./icons/FastReverseIcon.svelte";

    let {
        dateFormat = "yyyy-mm-dd",
        lang = "en",
        allowPartial = false,
        classes="",
        styles="",
        year = $bindable(getToday().getUTCFullYear()),
        month = $bindable(getToday().getUTCMonth()),
        day = $bindable(getToday().getUTCDate()),
        months = undefined,
        buttonText = undefined,
        dayAbbrebiations = undefined,
        onOk = undefined,
        onCancel = undefined,
        id = undefined,
        zIndex = undefined,
    } : Props = $props();

    let currentMonth = $state(month ?? getToday().getUTCMonth());

    $effect(() => {
        if (!months) {
            if (lang in Months) months = Months[lang];
            else months = Months.en;
        }
        if (!dayAbbrebiations) {
            if (lang in DayAbbreviations) dayAbbrebiations = DayAbbreviations[lang];
            else dayAbbrebiations = DayAbbreviations.en;
        }
        if (!buttonText) {
            if (lang in ButtonText) buttonText = (ButtonText as {[key:string]:any})[lang] as {ok: string, cancel: string};
            else buttonText = ButtonText.en;
        }

        if (year === undefined) year = getToday().getUTCFullYear();
        if (month === undefined) month = getToday().getUTCMonth();
        if (day === undefined) day = getToday().getUTCDate();
        if (!allowPartial && month === null) month = 0;
        if (!allowPartial && !day === null) day = 1;
        if (month === undefined) currentMonth = getToday().getUTCMonth();
    });

    function getNumberOfWeeks() {
        const first = firstOfMonth(year, currentMonth, day);
        const last = lastOfMonth(year, currentMonth, day);
        const extraDaysFirstWeek = first.getUTCDay();
        const daysInMonthIncludingExtra = numDaysBetween(first, last)+extraDaysFirstWeek;
        return Math.ceil(daysInMonthIncludingExtra/7-0.01);
    }

    let firstDay = $derived(firstOfMonth(year, currentMonth, day));
    let lastDay = $derived(lastOfMonth(year, currentMonth, day))
    let numberOfWeeks = $derived.by(() => getNumberOfWeeks())

    function getDateForCalendar(rowIdx: number, dayIdx: number) {
        if (rowIdx == 0) {
            const first = firstOfMonth(year, currentMonth, day);
            const last = lastOfMonth(year, currentMonth, day);
            if (dayIdx < first.getUTCDay()) {
                return null;
            } else {
                return dayIdx - first.getUTCDay()+1;
            }
        } else if (rowIdx == numberOfWeeks-1) {
            const extraDaysFirstWeek = firstDay.getUTCDay();
            let date = (-extraDaysFirstWeek) + (rowIdx)*7 + dayIdx+1;
            if (date > lastDay.getUTCDate()) return null;
            return date;
        } else {
            const extraDaysFirstWeek = firstDay.getUTCDay();
            return (-extraDaysFirstWeek) + (rowIdx)*7 + dayIdx+1;
        }
    }
    
    function dayClicked(rowIdx : number, dayIdx : number) {
        if (!allowPartial) {
            day = getDateForCalendar(rowIdx, dayIdx)
        } else {
            if (day == null) {
                day = getDateForCalendar(rowIdx, dayIdx);
                month = currentMonth;
            } else if (day == getDateForCalendar(rowIdx, dayIdx)) { 
                day = null ;
            } else {
                day = getDateForCalendar(rowIdx, dayIdx)
                month = currentMonth;
            };
        }
    }

    function monthClicked() {
        if (!allowPartial) return;
        if (month === null) month = currentMonth;
        else {
            month = null;
            day = null;
        }
        console.log("monthClicked", month, currentMonth)
    }

    function monthForward() {
        if (currentMonth == 11) {
            currentMonth = 0;
            year++;
            if (month != null) month = currentMonth;
        } else {
            currentMonth++;
            if (month != null) month = currentMonth;

        }
        if (day != null) {
            if (day > lastDay.getUTCDate()) {
                day = lastDay.getUTCDate();
            }
        }
    }

    function monthReverse() {
        if (currentMonth == 0) {
            currentMonth = 11;
            year--;
            if (month != null) month = currentMonth;
        } else {
            currentMonth--;
            if (month != null) month = currentMonth;
        }
        if (day != null) {
            if (day > lastDay.getUTCDate()) {
                day = lastDay.getUTCDate();
            }
        }
    }

    function yearForward(n : number) {
        year += n;
        if (month != null) month = currentMonth;
        if (day != null) {
            if (day > lastDay.getUTCDate()) {
                day = lastDay.getUTCDate();
            }
        }
    } 

    let yearColor = $derived((allowPartial) ? "text-primary" : "text-base-content");
    let monthColor = $derived((allowPartial && month!==null) ? "text-primary" : "text-base-content");

    let zIndexStyle = $derived(zIndex === undefined ? "" : "z-index: "+zIndex+"; ");

    function keyEvent(e: KeyboardEvent, fn: () => void) {
        if (e.key == "Enter") {
            fn();
        } else if (e.key == "Escape") {
            if (onCancel) onCancel();
        }
    }
</script>

<div id={id ?? crypto.randomUUID()} 
    class="flex flex-col min-w-62.5 min-h-103.75 gap-1 bg-base-200  p-4 {classes}" 
    style="{zIndexStyle} {styles}"
    >

    <!-- year -->
    <div class="flex flex-row w-full items-center">
        <div class="join ">
            <span tabindex="0" style="{zIndexStyle}" class="join-item cursor-pointer p-1" 
            onclick={() => yearForward(-10)} 
            role="button" onkeyup={(e) => {keyEvent(e, () => yearForward(-10))}}><FastReverseIcon></FastReverseIcon></span>
            <span tabindex="0" style="{zIndexStyle}" class="join-item cursor-pointer p-1" 
            onclick={() => yearForward(-1)} 
            role="button" onkeyup={(e) => {keyEvent(e, () => yearForward(-1))}}><ReverseIcon></ReverseIcon></span>
        </div>
        <span style="{zIndexStyle}" class="grow flex-1 text-center {yearColor} text-base">{year}</span>
        <div style="{zIndexStyle}" class="join ">
            <span tabindex="0" style="{zIndexStyle}" class="join-item cursor-pointer p-1" 
            onclick={() => yearForward(1)} 
            role="button" onkeyup={(e) => {keyEvent(e, () => yearForward(1))}}><ForwardIcon></ForwardIcon></span>
            <span tabindex="0" style="{zIndexStyle}" class="join-item cursor-pointer p-1" 
            onclick={() => yearForward(1)} role="button" 
            onkeyup={(e) => {keyEvent(e, () => yearForward(10))}}><FastForwardIcon></FastForwardIcon></span>
        </div>
    </div>

    <!-- month -->
    <div class="flex flex-row mt-0 w-full items-center pt-1 ">
        <span tabindex="0" style="{zIndexStyle}" class="join-item cursor-pointer p-1" 
        onclick={() => monthReverse()} role="button" 
        onkeyup={(e) => {keyEvent(e, () => monthReverse())}}><ReverseIcon></ReverseIcon></span>
         {#if allowPartial}
            <span tabindex="0" style="{zIndexStyle}" 
            onclick={() => monthClicked()} 
            class="text-base font-normal grow flex-1 text-center cursor-pointer {monthColor}" 
            role="button" onkeyup={(e) => {keyEvent(e, () => monthClicked())}}>{months == undefined ? Months.en[currentMonth] : months[currentMonth]}</span>
         {:else}  
            <span tabindex="0" style="{zIndexStyle}" class="grow flex-1 text-center text-base font-formal {monthColor} " 
            role="button">{months == undefined ? Months.en[currentMonth] : months[currentMonth]}</span>
        {/if}
        <span tabindex="0" style="{zIndexStyle}" class="join-item cursor-pointer p-1" 
        onclick={() => monthForward()} 
        role="button" onkeyup={(e) => {keyEvent(e, () => monthForward())}}><ForwardIcon></ForwardIcon></span>
    </div>

    <!-- days -->
    <div class="grid grid-flow-row grid-cols-7 gap-x-8 gap-y-4 text-base pr-4 pt-1">
        {#each dayAbbrebiations as dayAbbrev, dayIdx}
            <div style="{zIndexStyle}" class="" >{dayAbbrev}</div>
        {/each}
        {#each { length: numberOfWeeks }, rowIdx}
            {#each dayAbbrebiations as dayAbbrev, dayIdx}
                <span tabindex="{getDateForCalendar(rowIdx, dayIdx)===null ? -1 : 0}" style="{zIndexStyle}" class="cursor-pointer px-0 py-0 m-0 font-normal {getDateForCalendar(rowIdx, dayIdx) == day ? 'text-primary' : 'text-content-base'}"
                    onclick={() => dayClicked(rowIdx, dayIdx)}
                    role="button" onkeyup={(e) => {keyEvent(e, () => dayClicked(rowIdx, dayIdx))}}
                    ><span class="text-base">{getDateForCalendar(rowIdx, dayIdx)}</span></span>
            {/each}
        {/each}
        {#if numberOfWeeks < 5}
            {#each dayAbbrebiations as dayAbbrev, dayIdx}
             <span>&nbsp;</span>
            {/each}
        {/if}
        {#if numberOfWeeks < 6}
            {#each dayAbbrebiations as dayAbbrev, dayIdx}
             <span>&nbsp;</span>
            {/each}
        {/if}
    </div>

    <!-- buttons -->
    <div class="flex flex-row w-full items-center justify-around mt-2">
        <div style="{zIndexStyle}" class="join ">
        <span tabindex="0" style="{zIndexStyle}" class="bg-primary px-4 py-2 rounded cursor-pointer" 
            onclick={(e) => {if (onOk) onOk(year, month, day)}}
            role="button" onkeyup={(evt) => {if (onOk && evt.key == "Enter") {onOk(year, month, day)} else if (onCancel && evt.key == "Escape") {onCancel()}}}
        >{buttonText?.ok ?? "OK"}</span>
        </div>
        <span tabindex="0" style="{zIndexStyle}" class="bg-base-100 px-4 py-2 rounded cursor-pointer" 
            onclick={() => {if (onCancel) onCancel()}}
            role="button" onkeyup={(evt) => {if (onCancel && evt.key == "Enter" || onCancel && evt.key == "Escape") onCancel()}}
        >{buttonText?.cancel ?? "Cancel"}</span>
    </div>
</div>

