import * as Rx from 'rx';
import $ from 'jquery';
import _ from 'underscore';
import user from 'phraseanet-common/src/components/user';

const searchAdvancedForm = (services) => {
    const {configService, localeService, appEvents} = services;
    const url = configService.get('baseUrl');
    let $container = null;
    const initialize = (options) => {
        let initWith = {$container} = options;
        let previousVal;
        const multi_term_select_html = $('.term_select_wrapper').html();


        // advanced
        $container.on('click', '.toggle-collection', (event) => {
            let $el = $(event.currentTarget);
            toggleCollection($el, $($el.data('toggle-content')));
        });

        $container.on('click', '.toggle-database', (event) => {
            let $el = $(event.currentTarget);
            let state = $el.data('state') || false;
            toggleAllDatabase(state);
        });

        $container.on('change', '.select-database', (event) => {
            let $el = $(event.currentTarget);
            let collectionId = $el.data('database');

            selectDatabase($el, collectionId);
        });

        $container.on('change', '.check-filters', (event) => {
            let $el = $(event.currentTarget);
            let shouldSave = $el.data('save') || false;

            checkFilters(shouldSave);
        });

        $container.on('click', '.search-reset-action', () => {
            resetSearch();
        });

        $(document).on('focus', 'select.term_select_field', (event) => {
            previousVal = $(event.currentTarget).val();
        });
        $(document).on('change', 'select.term_select_field', (event) => {
            const $this = $(event.currentTarget);
    
            // if option is selected
            if($this.val()) {
                $this.siblings().prop('disabled', false);
    
                $('.term_select_multiple option').each((index, el) => {
                    let $el = $(el);
                    if($this.val() === $el.val()) {
                        $el.prop('selected', true);
                    }
                    else if (previousVal === $el.val()) {
                        $el.prop('selected', false);
                    }
                });
            }
            else {
                $this.siblings().prop('disabled', 'disabled');
    
                $('.term_select_multiple option').each((index, el) => {
                    let $el = $(el);
                    if(previousVal === $el.val()) {
                        $el.prop('selected', false);
                    }
                });
            }
            $this.blur();
            checkFilters(true);
        });

        $(document).on('click', '.term_deleter', (event) => {
            event.preventDefault();
            let $this = $(event.currentTarget);
            let rowOption = $this.siblings('.term_select_field');
            
            $('.term_select_multiple option').each((index, el) => {
                let $el = $(el);
                if(rowOption.val() == $el.val()) {
                    $el.prop('selected', false);
                }
            });
            checkFilters(true);
            $this.closest('.term_select_wrapper').remove();
        });

        $('.add_new_term').on('click', (event) => {
            event.preventDefault();
            if ($('select.term_select_field').length === 0) {
                $('.term_select').prepend('<div class="term_select_wrapper">' + multi_term_select_html + '</div>');
            }
            else if ($('select.term_select_field').last().val() !== '') {
                $('.term_select_wrapper').last().after('<div class="term_select_wrapper">' + multi_term_select_html + '</div>');
            }
        });

        // @TODO - check if usefull
        /**
         * inform global app for state
         * @TODO refactor
         */
        $('#EDIT_query').bind('focus', function () {
            $(this).addClass('focused');
        }).bind('blur', function () {
            $(this).removeClass('focused');
        });
    };

    /**
     * adv search : check/uncheck all the collections (called by the buttons "all"/"none")
     *
     * @param bool
     */
    const toggleAllDatabase = (bool) => {
        $('form.phrasea_query .sbas_list').each(function () {

            var sbas_id = $(this).find('input[name=reference]:first').val();
            if (bool) {
                $(this).find(':checkbox').prop('checked', true);
            } else {
                $(this).find(':checkbox').prop('checked', false);
            }
        });

        checkFilters(true);
    };

    const toggleCollection = ($el, $elContent) => {
        if ($el.hasClass('deployer_opened')) {
            $el.removeClass('deployer_opened').addClass('deployer_closed');
            $elContent.hide();
        } else {
            $el.removeClass('deployer_closed').addClass('deployer_opened');
            $elContent.show();
        }
    };

    const selectDatabase = ($el, sbas_id) => {
        var bool = $el.prop('checked');
        $.each($('.sbascont_' + sbas_id + ' :checkbox'), function () {
            this.checked = bool;
        });

        checkFilters(true);
    };
    const activateDatabase = (databaseCollection) => {
        // disable all db,
        toggleAllDatabase(false);
        // then enable only provided
        _.each(databaseCollection, (databaseId) => {
            _.each($('.sbascont_' + databaseId + ' :checkbox'), (checkbox) => {
                $(checkbox).prop('checked', true);
            });
        });

    };

    const checkFilters = (save) => {
        var danger = false;
        var search = {
            bases: {},
            fields: [],
            dates: {},
            status: [],
            elasticSort: {}

        };

        var adv_box = $('form.phrasea_query .adv_options');
        var container = $('#ADVSRCH_OPTIONS_ZONE');
        var fieldsSort = $('#ADVSRCH_SORT_ZONE select[name=sort]', container);
        var fieldsSortOrd = $('#ADVSRCH_SORT_ZONE select[name=ord]', container);
        var fieldsSelect = $('#ADVSRCH_FIELDS_ZONE select.term_select_multiple', container);
        var fieldsSelectFake = $('#ADVSRCH_FIELDS_ZONE select.term_select_field', container);
        var statusFilters = $('#ADVSRCH_SB_ZONE .status-section-title .danger_indicator', container);
        var dateFilterSelect = $('#ADVSRCH_DATE_ZONE select', container);
        var scroll = fieldsSelect.scrollTop();

        // hide all the fields in the "sort by" select, so only the relevant ones will be shown again
        $('option.dbx', fieldsSort).hide().prop('disabled', true);  // dbx is for "field of databases"

        // hide all the fields in the "fields" select, so only the relevant ones will be shown again
        $('option.dbx', fieldsSelect).hide().prop('disabled', true);     // option[0] is "all fields"
        $("option.dbx", fieldsSelectFake).hide().prop("disabled", true);

        // hide all the fields in the "date field" select, so only the relevant ones will be shown again
        $('option.dbx', dateFilterSelect).hide().prop('disabled', true);   // dbx = all "field" entries in the select = all except the firstt

        statusFilters.removeClass('danger');
        $.each($('#ADVSRCH_SB_ZONE .field_switch'), function(index,el){
            if( $(el).prop('checked') === true ) {
                danger = true;
                statusFilters.addClass('danger');
            }
        });

        var nbTotalSelectedColls = 0;
        $.each($('.sbascont', adv_box), function () {
            var $this = $(this);

            var sbas_id = $this.parent().find('input[name="reference"]').val();
            search.bases[sbas_id] = [];

            var nbCols = 0;
            var nbSelectedColls = 0;
            $this.find('.checkbas').each(function (idx, el) {
                nbCols++;
                if ($(this).prop('checked')) {
                    nbSelectedColls++;
                    nbTotalSelectedColls++;
                    search.bases[sbas_id].push($(this).val());
                }
            });

            // display the number of selected colls for the databox
            if (nbSelectedColls == nbCols) {
                $('.infos_sbas_' + sbas_id).empty().append(nbCols);
                $(this).siblings(".clksbas").removeClass("danger");
                $(this).siblings(".clksbas").find(".custom_checkbox_label input").prop("checked", "checked");
            }
            else {
                $('.infos_sbas_' + sbas_id).empty().append('<span style="color:#2096F3;font-size: 20px;">' + nbSelectedColls + '</span> / ' + nbCols);
                $(this).siblings(".clksbas").addClass("danger");
            }

            // if one coll is not checked, show danger
            if (nbSelectedColls !== nbCols) {
                $('#ADVSRCH_SBAS_ZONE').addClass('danger');
                danger = true;
            } 
            else if (nbSelectedColls === nbCols && danger === false) {
                $('#ADVSRCH_SBAS_ZONE').removeClass('danger');
            }

            if (nbSelectedColls === 0) {
                // no collections checked for this databox
                // hide the status bits
                $('#ADVSRCH_SB_ZONE_' + sbas_id, container).hide();
                // uncheck
                $('#ADVSRCH_SB_ZONE_' + sbas_id + ' input:checkbox', container).prop('checked', false);
            } else {
                // at least one coll checked for this databox
                // show again the relevant fields in "sort by" select
                $('.db_' + sbas_id, fieldsSort).show().prop('disabled', false);
                // show again the relevant fields in "from fields" select
                $('.db_' + sbas_id, fieldsSelect).show().prop('disabled', false);
                $('.db_' + sbas_id, fieldsSelectFake).show().prop("disabled", false);
                // show the sb
                $('#ADVSRCH_SB_ZONE_' + sbas_id, container).show();
                // show again the relevant fields in "date field" select
                $('.db_' + sbas_id, dateFilterSelect).show().prop('disabled', false);
            }
        });

        if (nbTotalSelectedColls === 0) {
            // no collections checked at all
            // hide irrelevant filters
            $('#ADVSRCH_OPTIONS_ZONE').hide();
        } else {
            // at least one collection checked
            // show relevant filters
            $('#ADVSRCH_OPTIONS_ZONE').show();
        }

        // --------- sort  --------

        // if no field is selected for sort, select the default option
        if ($('option:selected:enabled', fieldsSort).length === 0) {
            $('option.default-selection', fieldsSort).prop('selected', true);
            $('option.default-selection', fieldsSortOrd).prop('selected', true);
        }

        search.elasticSort.by = $('option:selected:enabled', fieldsSort).val();
        search.elasticSort.order = $('option:selected:enabled', fieldsSortOrd).val();

        // --------- from fields filter ---------

        // unselect the unavailable fields (or all fields if "all" is selected)
        var optAllSelected = false;
        $('option', fieldsSelect).each(
            function (idx, opt) {
                if (idx === 0) {
                    // nb: unselect the "all" field, so it acts as a button
                    optAllSelected = $(opt).is(':selected');
                }
                if (idx === 0 || optAllSelected || $(opt).is(':disabled') || $(opt).css('display') === 'none') {
                    $(opt).prop('selected', false);
                }
            }
        );

        // here only the relevant fields are selected
        search.fields = fieldsSelect.val();
        if (search.fields === null || search.fields.length === 0) {
            $('#ADVSRCH_FIELDS_ZONE', container).removeClass('danger');
            search.fields = [];
        } else {
            $('#ADVSRCH_FIELDS_ZONE', container).addClass('danger');
            danger = true;
        }

        // --------- status bits filter ---------

        // here only the relevant sb are checked
        const availableDb = search.bases;
        for (let sbas_id in availableDb) {

            var nchecked = 0;
            $('#ADVSRCH_SB_ZONE_' + sbas_id + ' :checkbox[checked]', container).each(function () {
                var n = $(this).attr('n');
                search.status[n] = $(this).val().split('_');
                nchecked++;
            });
            if (nchecked === 0) {
                $('#ADVSRCH_SB_ZONE_' + sbas_id, container).removeClass('danger');
            } else {
                $('#ADVSRCH_SB_ZONE_' + sbas_id, container).addClass('danger');
                danger = true;
            }
        }

        // --------- dates filter ---------

        // if no date field is selected for filter, select the first option

        $('#ADVSRCH_DATE_ZONE', adv_box).removeClass('danger');
        if ($('option:selected:enabled', dateFilterSelect).length === 0) {
            $('option:eq(0)', dateFilterSelect).prop('selected', true);
        }
        if ($('option:selected', dateFilterSelect).val() !== '') {
            $('#ADVSRCH_DATE_SELECTORS', container).show();
            search.dates.minbound = $('#ADVSRCH_DATE_ZONE input[name=date_min]', adv_box).val();
            search.dates.maxbound = $('#ADVSRCH_DATE_ZONE input[name=date_max]', adv_box).val();
            search.dates.field = $('#ADVSRCH_DATE_ZONE select[name=date_field]', adv_box).val();
            if ($.trim(search.dates.minbound) || $.trim(search.dates.maxbound)) {
                danger = true;
                $('#ADVSRCH_DATE_ZONE', adv_box).addClass('danger');
            }
        } else {
            $('#ADVSRCH_DATE_SELECTORS', container).hide();
        }

        fieldsSelect.scrollTop(scroll);

        // if one filter shows danger, show it on the query
        if (danger) {
            $('#EDIT_query').addClass('danger');
        } else {
            $('#EDIT_query').removeClass('danger');
        }

        if (save === true) {
            user.setPref('search', JSON.stringify(search));
        }
    };

    const saveHiddenFacetsList = (hiddenFacetsList) => {
        user.setPref('hiddenFacetsList', JSON.stringify(hiddenFacetsList));
    }

    // @TODO seem to be never used
    const resetSearch = () => {
        var container = $('#ADVSRCH_OPTIONS_ZONE');
        var fieldsSort = $('#ADVSRCH_SORT_ZONE select[name=sort]', container);
        var fieldsSortOrd = $('#ADVSRCH_SORT_ZONE select[name=ord]', container);
        var dateFilterSelect = $('#ADVSRCH_DATE_ZONE select', container);

        $('option.default-selection', fieldsSort).prop('selected', true);
        $('option.default-selection', fieldsSortOrd).prop('selected', true);

        $('#ADVSRCH_FIELDS_ZONE option').prop('selected', false);
        $('#ADVSRCH_OPTIONS_ZONE input:checkbox.field_switch').prop('checked', false);

        $('option:eq(0)', dateFilterSelect).prop('selected', true);
        $('#ADVSRCH_OPTIONS_ZONE .datepicker').val('');
        $('form.adv_search_bind input:text').val('');
        toggleAllDatabase(true);
    };

    appEvents.listenAll({
        'search.doCheckFilters': checkFilters,
        'search.doSelectDatabase': selectDatabase,
        'search.activateDatabase': (params) => activateDatabase(params.databases),
        'search.doToggleCollection': toggleCollection,
        'search.saveHiddenFacetsList': saveHiddenFacetsList
    })
    return {initialize};
};

export default searchAdvancedForm;
