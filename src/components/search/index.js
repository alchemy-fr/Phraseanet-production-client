import * as Rx from 'rx';
import $ from 'jquery';
import dialog from '../../../node_modules/phraseanet-common/src/components/dialog';
import merge from 'lodash.merge';
import resultInfos from './resultInfos';
import Selectable from '../utils/selectable';
let lazyload = require('jquery-lazyload');
require('phraseanet-common/src/components/tooltip');
require('phraseanet-common/src/components/vendors/contextMenu');

import searchForm from './searchForm';

const search = services => {
    const { configService, localeService, appEvents } = services;
    const url = configService.get('baseUrl');
    let searchPromise = {};
    let searchResult = {
        selection: false,
        navigation: {
            tot: 0, // p4.tot in record preview
            tot_options: false, // datas.form; // p4.tot_options common/tooltip
            tot_query: false, // datas.query; // p4.tot_query
            perPage: 0,
            page: 0
        }
    };
    let $searchForm = null;
    let $searchResult = null;
    let answAjaxrunning = false;
    let resultInfoView;
    let facets = null;
    var lastFilterResults = [];
    let savedHiddenFacetsList = configService.get('savedHiddenFacetsList') ? JSON.parse(configService.get('savedHiddenFacetsList')) : [];


    const initialize = () => {
        $searchForm = $('#searchForm');
        searchForm(services).initialize({
            $container: $searchForm
        });

        $searchResult = $('#answers');

        resultInfoView = resultInfos(services);
        resultInfoView.initialize({
            $container: $('#answers_status')
        });

        searchResult.selection = new Selectable(services, $searchResult, {
            selector: '.IMGT',
            limit: 800,
            selectStart: function (event, selection) {
                $('#answercontextwrap table:visible').hide();
            },
            selectStop: function (event, selection) {
                appEvents.emit('search.doRefreshSelection');
            },
            callbackSelection: function (element) {
                var elements = $(element).attr('id').split('_');

                return elements
                    .slice(elements.length - 2, elements.length)
                    .join('_');
            }
        });
        // map events to result selection:
        appEvents.listenAll({
            'search.selection.selectAll': () =>
                searchResult.selection.selectAll(),
            'search.selection.unselectAll': () =>
                searchResult.selection.empty(),
            'search.selection.selectByType': dataType =>
                searchResult.selection.select(dataType.type),
            'search.selection.remove': data =>
                searchResult.selection.remove(data.records)
        });

        $searchResult
            .on('click', '.search-navigate-action', event => {
                event.preventDefault();
                let $el = $(event.currentTarget);
                navigate($el.data('page'));
            })
            .on('keypress', '.search-navigate-input-action', event => {
                // event.preventDefault();
                let $el = $(event.currentTarget);
                let inputPage = $el.val();
                let initialPage = $el.data('initial-value');
                let totalPages = $el.data('total-pages');

                if (isNaN(inputPage)) {
                    event.preventDefault();
                }
                if (event.keyCode === 13) {
                    if (inputPage > 0 && inputPage <= totalPages) {
                        navigate(inputPage);
                    } else {
                        $el.val(initialPage);
                    }
                }
            });

        window.searchResult = searchResult;
        window.dialog = dialog;
    };

    const getResultSelectionStream = () => searchResult.selection.stream;
    let resultNavigationStream = new Rx.Subject();
    const getResultNavigationStream = () => resultNavigationStream; //Rx.Observable.ofObjectChanges(searchResult.navigation);
    //const getResultNavigationStream = () => Rx.Observable.ofObjectChanges(searchResult.navigation);

    const newSearch = query => {
        searchResult.selection.empty();

        clearAnswers();
        $('#SENT_query').val(query);
        /*var histo = $('#history-queries ul');

         histo.prepend('<li onclick="prodModule.doSpecialSearch(\'' + query.replace(/\'/g, "\\'") + '\')">' + query + '</li>');

         var lis = $('li', histo);
         if (lis.length > 25) {
         $('li:last', histo).remove();
         }*/

        $('#idFrameC li.proposals_WZ').removeClass('active');
        appEvents.emit('search.doRefreshState');
        return false;
    };

    /**
     *
     */
    const onRefreshSearchState = () => {
        let data = $searchForm.serializeArray();
        let searchPromise = {};
        searchPromise = $.ajax({
            type: 'POST',
            url: `${url}prod/query/`,
            data: data,
            dataType: 'json',
            beforeSend: function (formData) {
                if (answAjaxrunning && searchPromise.abort !== undefined) {
                    searchPromise.abort();
                }
                beforeSearch();
            },
            error: function () {
                answAjaxrunning = false;
                $searchResult.removeClass('loading');
            },
            timeout: function () {
                answAjaxrunning = false;
                $('#answers').removeClass('loading');
            },
            success: function (datas) {
                $searchResult
                    .empty()
                    .append(datas.results)
                    .removeClass('loading');

                $('img.lazyload', $searchResult).lazyload({
                    container: $('#answers')
                });

                //load last result collected or [] if length == 0
                if (datas.facets.length == 0) {
                    appEvents.emit('facets.doLoadFacets', {
                        facets: lastFilterResults,
                        filterFacet: $('#look_box_settings input[name=filter_facet]').prop('checked'),
                        facetOrder: $('#look_box_settings select[name=orderFacet]').val(),
                        facetValueOrder: $('#look_box_settings select[name=facetValuesOrder]').val(),
                        hiddenFacetsList: savedHiddenFacetsList
                    });
                } else {
                    lastFilterResults = datas.facets;
                    appEvents.emit('facets.doLoadFacets', {
                        facets: datas.facets,
                        filterFacet: $('#look_box_settings input[name=filter_facet]').prop('checked'),
                        facetOrder: $('#look_box_settings select[name=orderFacet]').val(),
                        facetValueOrder: $('#look_box_settings select[name=facetValuesOrder]').val(),
                        hiddenFacetsList: savedHiddenFacetsList
                    });
                }

                facets = datas.facets;

                $searchResult.append(
                    '<div id="paginate"><div class="navigation"><div id="tool_navigate"></div></div></div>'
                );

                resultInfoView.render(
                    datas.infos,
                    searchResult.selection.length()
                );

                $('#tool_navigate').empty().append(datas.navigationTpl);

                // @TODO refactor
                $.each(searchResult.selection.get(), function (i, el) {
                    $('#IMGT_' + el).addClass('selected');
                });

                searchResult.navigation = merge(
                    searchResult.navigation,
                    datas.navigation,
                    {
                        tot: datas.total_answers,
                        tot_options: datas.form,
                        tot_query: datas.query
                    }
                );
                resultNavigationStream.onNext(searchResult.navigation);

                if (datas.next_page) {
                    $('#NEXT_PAGE, #answersNext').bind('click', function () {
                        navigate(datas.next_page);
                    });
                } else {
                    $('#NEXT_PAGE').unbind('click');
                }

                if (datas.prev_page) {
                    $('#PREV_PAGE').bind('click', function () {
                        navigate(datas.prev_page);
                    });
                } else {
                    $('#PREV_PAGE').unbind('click');
                }

                updateHiddenFacetsListInPrefsScreen();

                afterSearch();
            }
        });
    };

    const updateHiddenFacetsListInPrefsScreen = () => {
        const $hiddenFacetsContainer = $('#look_box_settings').find('.hiddenFiltersListContainer');
        if (savedHiddenFacetsList.length > 0) {
            $hiddenFacetsContainer.empty();
            _.each(savedHiddenFacetsList, function (value) {
                var $html = $('<span class="facetFilter" data-name="' + value.name + '"><span class="facetFilter-label" title="'
                    + value.title + '">' + value.title
                    + '<span class="facetFilter-gradient">&nbsp;</span></span><a class="remove-btn"></a></span>');

                $hiddenFacetsContainer.append($html);

                $('.remove-btn').on('click', function () {
                    let name = $(this).parent().data("name");
                    savedHiddenFacetsList = _.reject(savedHiddenFacetsList, function (obj) {
                        return (obj.name == name);
                    });
                    $(this).parent().remove();
                    appEvents.emit('search.saveHiddenFacetsList', savedHiddenFacetsList);
                    updateFacetData();
                });
            });
        }

    };

    const beforeSearch = () => {
        if (answAjaxrunning) {
            return;
        }
        answAjaxrunning = true;

        clearAnswers();
        $('#tooltip').css({
            display: 'none'
        });
        $searchResult.addClass('loading').empty();
        $('#answercontextwrap').remove();
    };

    const afterSearch = () => {
        if ($('#answercontextwrap').length === 0) {
            $('body').append('<div id="answercontextwrap"></div>');
        }

        $.each($('.contextMenuTrigger', $searchResult), function () {
            var id = $(this)
                .closest('.IMGT')
                .attr('id')
                .split('_')
                .slice(1, 3)
                .join('_');

            $(this).contextMenu('#IMGT_' + id + ' .answercontextmenu', {
                appendTo: '#answercontextwrap',
                openEvt: 'click',
                dropDown: true,
                theme: 'vista',
                showTransition: 'slideDown',
                hideTransition: 'hide',
                shadow: false
            });
        });

        answAjaxrunning = false;
        $searchResult.removeClass('loading');
        $('.captionTips, .captionRolloverTips').tooltip({
            delay: 0,
            delayOptions: {},
            isBrowsable: false,
            extraClass: 'caption-tooltip-container'
        });
        $('.infoTips').tooltip({
            delay: 0
        });
        $('.previewTips').tooltip({
            fixable: true
        });
        $('.thumb .rollovable').hover(
            function () {
                $('.rollover-gif-hover', this).show();
                $('.rollover-gif-out', this).hide();
            },
            function () {
                $('.rollover-gif-hover', this).hide();
                $('.rollover-gif-out', this).show();
            }
        );
        $('div.IMGT', $searchResult).draggable({
            helper: function () {
                $('body').append(
                    '<div id="dragDropCursor" style="position:absolute;z-index:9999;background:red;-moz-border-radius:8px;-webkit-border-radius:8px;"><div style="padding:2px 5px;font-weight:bold;">' +
                        searchResult.selection.length() +
                        '</div></div>'
                );
                return $('#dragDropCursor');
            },
            scope: 'objects',
            distance: 20,
            scroll: false,
            cursorAt: {
                top: -10,
                left: -20
            },
            start: function (event, ui) {
                if (!$(this).hasClass('selected')) {
                    return false;
                }
            }
        });
        appEvents.emit('ui.linearizeUi');
    };

    const clearAnswers = () => {
        $('#formAnswerPage').val('');
        $('#searchForm input[name="nba"]').val('');
        $($searchResult, '#dyn_tool').empty();
    };

    const navigate = page => {
        $('#searchForm input[name="sel"]').val(
            searchResult.selection.serialize()
        );
        $('#formAnswerPage').val(page);
        onRefreshSearchState();
    };

    const updateFacetData = () => {
        appEvents.emit('facets.doLoadFacets', {
            facets: facets,
            filterFacet: $('#look_box_settings input[name=filter_facet]').prop('checked'),
            facetOrder: $('#look_box_settings select[name=orderFacet]').val(),
            facetValueOrder: $('#look_box_settings select[name=facetValuesOrder]').val(),
            hiddenFacetsList: savedHiddenFacetsList
        });
    };

    const reloadHiddenFacetList = (hiddenFacetsList) => {
        savedHiddenFacetsList = hiddenFacetsList;
        updateHiddenFacetsListInPrefsScreen();
    }

    appEvents.listenAll({
        'search.doRefreshState': onRefreshSearchState,
        'search.doNewSearch': newSearch,
        'search.doAfterSearch': afterSearch,
        'search.doClearSearch': clearAnswers,
        'search.doNavigate': navigate,
        'search.updateFacetData': updateFacetData,
        'search.reloadHiddenFacetList': reloadHiddenFacetList
    });

    return { initialize, getResultSelectionStream, getResultNavigationStream };
};

export default search;
