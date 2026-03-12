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

        onOk? (year: number, month: number|null, day: number|null) : void;
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
        year = $bindable(getToday().getUTCFullYear()),
        month = $bindable(getToday().getUTCMonth()),
        day = $bindable(getToday().getUTCDate()),
        months = undefined,
        dayAbbrebiations = undefined,
        onOk = undefined,
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

        if (year === undefined) year = getToday().getUTCFullYear();
        if (month === undefined) month = getToday().getUTCMonth();
        if (day === undefined) day = getToday().getUTCDate();
        if (!allowPartial && month === null) month = 0;
        if (!allowPartial && !day === null) day = 1;
        if (month === undefined) currentMonth = getToday().getUTCMonth();

        console.log("DateSelector finished effect")
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
</script>

<div class="flex flex-col w-fit gap-1 bg-base-200  p-2 {classes}">

    <!-- year -->
    <div class="flex flex-row w-full items-center">
        <div class="join ">
            <button class="btn btn-square btn-sm join-item" onclick={() => yearForward(-10)}><FastReverseIcon></FastReverseIcon></button>
            <button class="btn btn-square btn-sm join-item" onclick={() => yearForward(-1)}><ReverseIcon></ReverseIcon></button>            
        </div>
        <span class="grow flex-1 text-center {yearColor}">{year}</span>
        <div class="join ">
            <button class="btn btn-square  btn-sm join-item" onclick={() => yearForward(1)}><ForwardIcon></ForwardIcon></button>
            <button class="btn btn-square  btn-sm join-item" onclick={() => yearForward(10)}><FastForwardIcon></FastForwardIcon></button>
        </div>
    </div>

    <!-- month -->
    <div class="flex flex-row mt-0 w-full items-center">
         <button class="btn btn-square btn-sm align-middle" onclick={() => monthReverse()}><ReverseIcon></ReverseIcon></button>          
         {#if allowPartial}
            <button onclick={() => monthClicked()} class="btn btn-sm btn-ghost text-base grow flex-1 text-center {monthColor}">{months == undefined ? Months.en[currentMonth] : months[currentMonth]}</button>
         {:else}  
            <span class="grow flex-1 text-center {monthColor}">{months == undefined ? Months.en[currentMonth] : months[currentMonth]}</span>
        {/if}
        <button class="btn btn-square btn-sm" onclick={() => monthForward()}><ForwardIcon></ForwardIcon></button>
    </div>

    <!-- days -->
    <div class="grid grid-flow-row grid-cols-7 gap-0">
        {#each dayAbbrebiations as dayAbbrev, dayIdx}
            <div>{dayAbbrev}</div>
        {/each}
        {#each { length: numberOfWeeks }, rowIdx}
            {#each dayAbbrebiations as dayAbbrev, dayIdx}
                <button class="btn btn-ghost btn-sm px-1 py-0 m-0 {getDateForCalendar(rowIdx, dayIdx) == day ? 'text-primary' : 'text-content-base'}"
                    onclick={() => dayClicked(rowIdx, dayIdx)}><span class="text-base">{getDateForCalendar(rowIdx, dayIdx)}</span></button>
            {/each}
        {/each}
    </div>

    <!-- buttons-->
    <div class="flex flex-row w-full items-center justify-around mt-1">
        <button class="btn btn-sm btn-primary" onclick={() => {if (onOk) onOk(year, month, day)}}>OK</button>
        <button class="btn btn-sm btn-default">Cancel</button>
    </div>
</div>

