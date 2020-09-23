import $ from 'jquery';
import * as appCommons from 'phraseanet-common';
import workzoneThesaurus from './thesaurus/index';
import workzoneFacets from './facets/index';
import workzoneBaskets from './baskets/index';
import Selectable from '../../utils/selectable';
import Alerts from '../../utils/alert';
const humane = require('humane-js');
require('phraseanet-common/src/components/tooltip');
require('phraseanet-common/src/components/vendors/contextMenu');

const workzone = (services) => {
    const {configService, localeService, appEvents} = services;
    const url = configService.get('baseUrl');
    let workzoneOptions = {};
    let searchSelection = {asArray: [], serialized: ''};
    workzoneFacets(services);
    workzoneBaskets(services).initialize();
    workzoneThesaurus(services).initialize();


    var nextBasketScroll = false;
    var warnOnRemove = true;
    let $container;
    let dragBloc = $('#basket-tab').val() ;

    function checkActiveBloc(destBloc) {

        if (document.getElementById('expose_tab') && document.getElementById('expose_tab').getAttribute('aria-expanded') == 'true') {
            $('#basket-tab').val('#expose_tab');
        }
        if (document.getElementById('baskets') && document.getElementById('baskets').getAttribute('aria-expanded') == 'true') {
            $('#basket-tab').val('#baskets');
        }

        var destBloc =  $('#basket-tab').val();
        console.log(destBloc);
        return destBloc;
    }
    checkActiveBloc(dragBloc);

    const initialize = () => {
        $container = $('#idFrameC');
        checkActiveBloc(dragBloc);
        $container.resizable({
            handles: 'e',
            resize: function () {
                appEvents.emit('ui.answerSizer');
                appEvents.emit('ui.linearizeUi');
            },
            stop: function () {

                var el = $('.SSTT.active').next();
                var w = el.find('div.chim-wrapper:first').outerWidth();
                var iw = el.innerWidth();
                var diff = $container.width() - el.outerWidth();
                var n = Math.floor(iw / w);

                $container.height('auto');

                var nwidth = n * w + diff + n + 10;
                if (isNaN(nwidth)) {
                    appEvents.emit('ui.saveWindow');
                    return;
                }
                if (nwidth < 247) {
                    nwidth = 247;
                }
                if (el.find('div.chim-wrapper:first').hasClass('valid') && nwidth < 410) {
                    nwidth = 410;
                }


                $container.stop().animate({
                        width: nwidth
                    },
                    300,
                    'linear',
                    function () {
                        appEvents.emit('ui.answerSizer');
                        appEvents.emit('ui.linearizeUi');
                        appEvents.emit('ui.saveWindow');
                    });
            }
        });

        $('#idFrameC .expose_li').on('click', function (event) {
            checkActiveBloc(dragBloc);
        });

        $('.add_expose').on('click',function (event) {
            openExposeModalOnBasket('#DIALOG-expose-add');
        });
        $('#expose_list').on('change', function () {
            $('.publication-list').empty().html('<img src="/assets/common/images/icons/main-loader.gif" alt="loading"/>');
            $.ajax({
                type: "GET",
                url: `/prod/expose/list-publication/?exposeName=` + this.value,
                success: function (data) {
                    $('.publication-list').empty().html(data);
                    console.log(data);
                    $('.expose_basket_item .top_block').on('click', function (event) {
                        $(this).parent().find('.expose_item_deployed').toggleClass('open');
                        $(this).toggleClass('open');
                    });
                    $('.edit_expose').on('click',function (event) {
                        openExposeModalOnBasket();
                    });
                }
            });
        });

        $('.publication-list').on('click', '.top-block' , function (event) {
            $(this).parent().find('.expose_item_deployed').toggleClass('open');
            $(this).toggleClass('open');
        });


        $('#idFrameC .ui-tabs-nav li').on('click', function (event) {
            if ($container.attr('data-status') === 'closed') {
                $('#retractableButton').find('i').removeClass('fa-angle-double-right').addClass('fa-angle-double-left');
                $container.width(360);
                $('#rightFrame').css('left', 360);
                $('#rightFrame').width($(window).width() - 360);
                $('#baskets, #expose_tab, #proposals, #thesaurus_tab').hide();
                $('.ui-resizable-handle, #basket_menu_trigger').show();
                var IDname = $(this).attr('aria-controls');
                $('#' + IDname).show();
            }

            $container.attr('data-status', 'open');
            $('.WZbasketTab').css('background-position', '9px 21px');
            $container.removeClass('closed');
        });

        var previousTab = '';

        $('#idFrameC #retractableButton').bind('click', function (event) {

            if ($container.attr('data-status') !== 'closed') {
                $(this).find('i').removeClass('fa-angle-double-left').addClass('fa-angle-double-right');
                $container.width(80);
                $('#rightFrame').css('left', 80);
                $('#rightFrame').width($(window).width() - 80);
                $container.attr('data-status', 'closed');
                $('#baskets, #expose_tab, #proposals, #thesaurus_tab, .ui-resizable-handle, #basket_menu_trigger').hide();
                $('#idFrameC .ui-tabs-nav li').removeClass('ui-state-active');
                $('.WZbasketTab').css('background-position', '15px 16px');
                $container.addClass('closed');
                previousTab = $('#idFrameC .prod-icon-menu').find('li.ui-tabs-active');
            } else {
                $(this).find('i').removeClass('fa-angle-double-right').addClass('fa-angle-double-left');
                $container.width(360);
                $('#rightFrame').css('left', 360);
                $('#rightFrame').width($(window).width() - 360);
                $container.attr('data-status', 'open');
                $('.ui-resizable-handle, #basket_menu_trigger').show();
                $('.WZbasketTab').css('background-position', '9px 16px');
                $container.removeClass('closed');
                $('#idFrameC .prod-icon-menu li').last().find('a').trigger('click');
                $('#idFrameC .prod-icon-menu li').first().find('a').trigger('click');
                $(previousTab).find('a').trigger('click');
            }

            event.stopImmediatePropagation();
            // workzoneOptions.close();
            return false;
        });

        $('#basket_menu_trigger').contextMenu('#basket_menu', {
            openEvt: 'click',
            dropDown: true,
            theme: 'vista',
            showTransition: 'slideDown',
            hideTransition: 'hide',
            shadow: false
        });


        $('#basket_menu_trigger').trigger('click');
        $('#basket_menu_trigger').trigger('click');

        $('.basketTips').tooltip({
            delay: 200,
            extraClass: 'tooltip_flat'
        });

        $('.basket_title').tooltip({
            extraClass: 'tooltip_flat'
        });

        $('#idFrameC .tabs').tabs({
            activate: function (event, ui) {
                if (ui.newTab.context.hash === '#thesaurus_tab') {
                    appEvents.emit('thesaurus.show');
                }
                workzoneOptions.open();
            }
        });
        $('.basket_refresher').on('click', function () {
            return workzoneOptions.refresh('current');
        });
        activeBaskets();

        $('body').on('click', 'a.story_unfix', (event) => {
            event.preventDefault();
            let $el = $(event.currentTarget);
            unfix($el.attr('href'));

            return false;
        });

        workzoneOptions = {
            selection: new Selectable(services, $(dragBloc), {selector: '.CHIM'}),
            refresh: refreshBaskets,
            addElementToBasket: function (options) {
                let {sbas_id, record_id, event, singleSelection} = options;
                singleSelection = !!singleSelection || false;

                if ($(dragBloc+' .SSTT.active').length === 1) {
                    return dropOnBask(event, $('#IMGT_' + sbas_id + '_' + record_id), $(dragBloc+' .SSTT.active'), singleSelection);
                } else {
                    humane.info(localeService.t('noActiveBasket'));
                }
            },
            removeElementFromBasket: WorkZoneElementRemover,
            reloadCurrent: function () {
                var sstt = $(dragBloc+' .content:visible');
                if (sstt.length > 0) {
                    getContent(sstt.prev());
                }
            },
            close: function () {
                const frame = $container;
                const that = this;

                if (!frame.hasClass('closed')) {
                    // hide tabs content
                    $('#idFrameC .tabs > .ui-tabs-panel').hide();

                    frame.data('openwidth', frame.width());
                    frame.animate({width: 100},
                        300,
                        'linear',
                        function () {
                            appEvents.emit('ui.answerSizer');
                            appEvents.emit('ui.linearizeUi');
                            $('#answers').trigger('resize');
                        });
                    frame.addClass('closed');
                    $('.escamote', frame).hide();
                    frame.unbind('click.escamote').bind('click.escamote', function () {
                        that.open();
                    });
                }
            },
            open: function () {
                var frame = $container;

                if (frame.hasClass('closed')) {
                    var width = frame.data('openwidth') ? frame.data('openwidth') : 300;
                    frame.css({width: width});
                    appEvents.emit('ui.answerSizer');
                    appEvents.emit('ui.linearizeUi');
                    frame.removeClass('closed');
                    $('.escamote', frame).show();
                    frame.unbind('click.escamote');
                    // show tabs content
                    var activeTabIdx = $('#idFrameC .tabs').tabs('option', 'active');
                    $('#idFrameC .tabs > div:eq(' + activeTabIdx + ')').show();
                }
            }
        };
        filterBaskets();
        $('#expose_tabs').tabs();

    };

    const getResultSelectionStream = () => workzoneOptions.selection.stream;

    /*left filter basket*/
    function filterBaskets() {
        $('#feedback-list input').click(function () {
            $('.feedbacks-block').toggleClass('hidden');
        });
        $('#push-list input').click(function () {
            $('.pushes-block').toggleClass('hidden');
        });
        $('#basket-list input').click(function () {
            $('.baskets-block').toggleClass('hidden');
        });
        $('#story-list input').click(function () {
            $('.stories-block').toggleClass('hidden');
        });
    }

    function refreshBaskets(options) {
        let {basketId = false, sort, scrolltobottom, type} = options || {};
        type = typeof type === 'undefined' ? 'basket' : type;

        var active = $(dragBloc +' .SSTT.ui-state-active');
        if (basketId === 'current' && active.length > 0) {
            basketId = active.attr('id').split('_').slice(1, 2).pop();
        }
        sort = ($.inArray(sort, ['date', 'name']) >= 0) ? sort : '';

        scrolltobottom = typeof scrolltobottom === 'undefined' ? false : scrolltobottom;

        $.ajax({
            type: 'GET',
            url: `${url}prod/WorkZone/`,
            data: {
                id: basketId,
                sort: sort,
                type: type
            },
            beforeSend: function () {
                $('#basketcontextwrap').remove();
            },
            success: function (data) {
                var cache = $('#idFrameC '+dragBloc);

                if ($('.SSTT', cache).data('ui-droppable')) {
                    $('.SSTT', cache).droppable('destroy');
                }
                if ($('.bloc', cache).data('ui-droppable')) {
                    $('.bloc', cache).droppable('destroy');
                }
                if (cache.data('ui-accordion')) {
                    cache.accordion('destroy').empty().append(data);
                }

                activeBaskets();
                filterBaskets();
                $('#expose_tabs').tabs();
                $('.basketTips').tooltip({
                    delay: 200
                });
                cache.disableSelection();

                if (!scrolltobottom) {
                    return;
                }

                nextBasketScroll = true;
                return;
            }
        });
    }

    function setTemporaryPref(name, value) {
        $.ajax({
            type: 'POST',
            url: '/user/preferences/temporary/',
            data: {
                prop: name,
                value: value
            },
            success: function (data) {
                return;
            }
        });
    }

    $(dragBloc+' div.content select[name=valid_ord]').on('change', function () {
        var active = $(dragBloc+' .SSTT.ui-state-active');
        if (active.length === 0) {
            return;
        }

        var order = $(this).val();

        getContent(active, order);
    });

    function WorkZoneElementRemover(el, confirm) {
        var context = el.data('context');

        if (confirm !== true && $(el).hasClass('groupings') && warnOnRemove) {
            var buttons = {};

            buttons[localeService.t('valider')] = function () {
                $('#DIALOG-baskets').dialog('close').remove();
                WorkZoneElementRemover(el, true);
            };

            buttons[localeService.t('annuler')] = function () {
                $('#DIALOG-baskets').dialog('close').remove();
            };

            var texte = '<p>' + localeService.t('confirmRemoveReg') + '</p><div><input type="checkbox" onchange="prodApp.appEvents.emit(\'workzone.doRemoveWarning\', this);"/>' + localeService.t('hideMessage') + '</div>';
            $('body').append('<div id="DIALOG-baskets"></div>');
            $('#DIALOG-baskets').attr('title', localeService.t('removeTitle'))
                .empty()
                .append(texte)
                .dialog({
                    autoOpen: false,
                    closeOnEscape: true,
                    resizable: false,
                    draggable: false,
                    modal: true,
                    buttons: buttons,
                    overlay: {
                        backgroundColor: '#000',
                        opacity: 0.7
                    }
                }).dialog('open');
            return false;
        } else {

            let id = $(el).attr('id').split('_').slice(2, 4).join('_');

            return $.ajax({
                type: 'POST',
                url: $(el).attr('href'),
                dataType: 'json',
                beforeSend: function () {
                    $('.wrapCHIM_' + id).find('.CHIM').fadeOut();
                },
                success: function (data) {
                    if (data.success) {
                        humane.info(data.message);
                        workzoneOptions.selection.remove(id);

                        if ($('.wrapCHIM_' + id).find('.CHIM').data('ui-draggable')) {
                            $('.wrapCHIM_' + id).find('.CHIM').draggable('destroy');
                        }

                        $('.wrapCHIM_' + id).remove();

                        if (context === 'reg_train_basket') {
                            var carousel = $('#PREVIEWCURRENTCONT');
                            var carouselItemLength = $('li', carousel).length;
                            var selectedItem = $('li.prevTrainCurrent.selected', carousel);
                            var selectedItemIndex = $('li', carousel).index(selectedItem);

                            // item is first and list has at least 2 items
                            if (selectedItemIndex === 0 && carouselItemLength > 1) {
                                // click next item
                                selectedItem.next().find('img').trigger('click');
                                // item is last item and list has at least 2 items
                            } else if (carouselItemLength > 1 && selectedItemIndex === (carouselItemLength - 1)) {
                                // click previous item
                                selectedItem.prev().find('img').trigger('click');
                                // Basket is empty
                            } else if (carouselItemLength > 1) {
                                // click next item
                                selectedItem.next().find('img').trigger('click');
                            } else {
                                appEvents.emit('preview.close');
                            }

                            selectedItem.remove();
                        } else {
                            return workzoneOptions.reloadCurrent();
                        }
                    } else {
                        humane.error(data.message);
                        $('.wrapCHIM_' + id).find('.CHIM').fadeIn();
                    }
                }
            });
        }

    }


    function activeBaskets() {
        checkActiveBloc(dragBloc);

        //var cache = $('#idFrameC #baskets');
        var cache = $('#idFrameC '+dragBloc);

        cache.accordion({
            active: 'active',
            heightStyle: 'content',
            collapsible: true,
            header: 'div.header',
            activate: function (event, ui) {
                var b_active = $('#baskets .SSTT.active');
                if (nextBasketScroll) {
                    nextBasketScroll = false;

                    if (!b_active.next().is(':visible')) {
                        return;
                    }

                    var t = $(dragBloc+' .SSTT.active').position().top + b_active.next().height() - 200;

                    t = t < 0 ? 0 : t;

                    $(dragBloc+' .bloc').stop().animate({
                        scrollTop: t
                    });
                }

                var uiactive = $(this).find('.ui-state-active');
                b_active.not('.ui-state-active').removeClass('active');

                if (uiactive.length === 0) {
                    return;
                    /* everything is closed */
                }

                uiactive.addClass('ui-state-focus active');

                workzoneOptions.selection.empty();

                getContent(uiactive);

            },
            beforeActivate: function (event, ui) {
                ui.newHeader.addClass('active');
                $('#basketcontextwrap .basketcontextmenu').hide();
            }
        });

        $('.bloc').droppable({
            accept: function (elem) {
                if ($(elem).hasClass('grouping') && !$(elem).hasClass('SSTT')) {
                    return true;
                }
                return false;
            },
            scope: 'objects',
            hoverClass: 'groupDrop',
            tolerance: 'pointer',
            drop: function () {
                fix();
            },
            over: function(event, ui) {
                console.log( this.id );
            }
        });

        if ($('.SSTT.active').length > 0) {
            var el = $('.SSTT.active', dragBloc)[0];
            $(el).trigger('click');
        }

        $('.SSTT, .content')
            .droppable({
                scope: 'objects',
                hoverClass: 'baskDrop',
                tolerance: 'pointer',
                accept: function (elem) {
                    if ($(elem).hasClass('CHIM')) {
                        if ($(elem).closest('.content').prev()[0] === $(this)[0]) {
                            return false;
                        }
                    }
                    if ($(elem).hasClass('grouping') || $(elem).parent()[0] === $(this)[0]) {
                        return false;
                    }
                    return true;
                },
                drop: function (event, ui) {
                    dropOnBask(event, ui.draggable, $(this));
                }
            });

        if ($('#basketcontextwrap').length === 0) {
            $('body').append('<div id="basketcontextwrap"></div>');
        }

        $('.context-menu-item').hover(function () {
            $(this).addClass('context-menu-item-hover');
        }, function () {
            $(this).removeClass('context-menu-item-hover');
        });
        $.each($('.SSTT'), function () {
            var el = $(this);
            $(this).find('.contextMenuTrigger').contextMenu('#' + $(this).attr('id') + ' .contextMenu', {
                appendTo: '#basketcontextwrap',
                openEvt: 'click',
                theme: 'vista',
                dropDown: true,
                showTransition: 'slideDown',
                hideTransition: 'hide',
                shadow: false
            });
        });

    }

    function getContent(header, order) {

        if (window.console) {
            console.log('Reload content for ', header);
        }

        var url = $('a', header).attr('href');

        if (typeof order !== 'undefined') {
            url += '?order=' + order;
        }

        $.ajax({
            type: 'GET',
            url: url,
            dataType: 'html',
            beforeSend: function () {
                $('#tooltip').hide();
                header.next().addClass('loading');
            },
            success: function (data) {
                header.removeClass('unread');

                var dest = header.next();
                if (dest.data('ui-droppable')) {
                    dest.droppable('destroy');
                }
                dest.empty().removeClass('loading');

                dest.append(data);

                $('a.WorkZoneElementRemover', dest).bind('mousedown', function (event) {
                    return false;
                }).bind('click', function (event) {
                    return WorkZoneElementRemover($(this), false);
                });

                $(dragBloc+" div.content select[name=valid_ord]").on('change', function () {
                    var active = $(dragBloc+' .SSTT.ui-state-active');
                    if (active.length === 0) {
                        return;
                    }

                    var order = $(this).val();
                    getContent(active, order);
                });

                dest.droppable({
                    accept: function (elem) {
                        if ($(elem).hasClass('CHIM')) {
                            if ($(elem).closest('.content')[0] === $(this)[0]) {
                                return false;
                            }
                        }
                        if ($(elem).hasClass('grouping') || $(elem).parent()[0] === $(this)[0]) {
                            return false;
                        }
                        return true;
                    },
                    hoverClass: 'baskDrop',
                    scope: 'objects',
                    drop: function (event, ui) {
                        dropOnBask(event, ui.draggable, $(this).prev());
                    },
                    tolerance: 'pointer'
                });

                $('.noteTips, .captionRolloverTips', dest).tooltip({
                    extraClass: 'tooltip_flat'
                });

                dest.find('.CHIM').draggable({
                    helper: function () {
                        $('body').append('<div id="dragDropCursor" ' +
                            'style="position:absolute;z-index:9999;background:red;' +
                            '-moz-border-radius:8px;-webkit-border-radius:8px;">' +
                            '<div style="padding:2px 5px;font-weight:bold;">' +
                            workzoneOptions.selection.length() + '</div></div>');
                        return $('#dragDropCursor');
                    },
                    scope: 'objects',
                    distance: 20,
                    scroll: false,
                    refreshPositions: true,
                    cursorAt: {
                        top: 10,
                        left: -20
                    },
                    start: function (event, ui) {
                        var baskets = $(dragBloc);
                        baskets.append('<div class="top-scroller"></div>' +
                            '<div class="bottom-scroller"></div>');
                        $('.bottom-scroller', baskets).bind('mousemove', function () {
                            $(dragBloc+' .bloc').scrollTop($(dragBloc+' .bloc').scrollTop() + 30);
                        });
                        $('.top-scroller', baskets).bind('mousemove', function () {
                            $(dragBloc+' .bloc').scrollTop($(dragBloc+' .bloc').scrollTop() - 30);
                        });
                    },
                    stop: function () {
                        $(dragBloc).find('.top-scroller, .bottom-scroller')
                            .unbind()
                            .remove();
                    },
                    drag: function (event, ui) {
                        if (appCommons.utilsModule.is_ctrl_key(event) || $(this).closest('.content').hasClass('grouping')) {
                            $('#dragDropCursor div').empty().append('+ ' + workzoneOptions.selection.length());
                        } else {
                            $('#dragDropCursor div').empty().append(workzoneOptions.selection.length());
                        }

                    }
                });
                window.workzoneOptions = workzoneOptions;
                appEvents.emit('ui.answerSizer');
                return;
            }
        });
    }

    function openExposeModalOnBasket(edit = '#DIALOG-expose-edit') {
        $(edit).attr('title', localeService.t('Edit expose title'))
            .dialog({
                autoOpen: false,
                closeOnEscape: true,
                resizable: true,
                draggable: true,
                width: 900,
                height: 575,
                modal: true,
                overlay: {
                    backgroundColor: '#000',
                    opacity: 0.7
                }
            }).dialog('open');
        $('.ui-dialog').addClass('black-dialog-wrap publish-dialog');
        $('.close-expose-modal').on('click', function () {
            $('#DIALOG-expose-edit').dialog('close');
        });
    }

    function dropOnBask(event, from, destKey, singleSelection) {
        checkActiveBloc(dragBloc);

        let action = '';
        let dest_uri = '';
        let lstbr = [];
        let sselcont = [];
        let act = 'ADD';
        from = $(from);

        if (from.hasClass('CHIM')) {
            /* Element(s) come from an open object in the workzone */
            action = $(dragBloc+' .ui-state-active').hasClass('grouping') ? 'REG2' : 'CHU2';
        } else {
            /* Element(s) come from result */
            action = 'IMGT2';
        }

        action += destKey.hasClass('grouping') ? 'REG' : 'CHU';

        if (destKey.hasClass('content')) {
            /* I dropped on content */
            dest_uri = $('a', destKey.prev()).attr('href');
        } else {
            /* I dropped on Title */
            dest_uri = $('a', destKey).attr('href');
        }

        if (window.console) {
            window.console.log('Requested action is ', action, ' and act on ', dest_uri);
        }

        if (action === 'IMGT2CHU' || action === 'IMGT2REG') {
            if ($(from).hasClass('.baskAdder')) {
                lstbr = [$(from).attr('id').split('_').slice(2, 4).join('_')];
            } else if (singleSelection) {
                if (from.length === 1) {
                    lstbr = [$(from).attr('id').split('_').slice(1, 3).join('_')];
                } else {
                    lstbr = [$(from).selector.split('_').slice(1, 3).join('_')];
                }
            } else {
                lstbr = searchSelection.asArray;
            }
        } else {
            sselcont = $.map(workzoneOptions.selection.get(), function (n, i) {
                return $('.CHIM_' + n, $(dragBloc+' .content:visible')).attr('id').split('_').slice(1, 2).pop();
            });
            lstbr = workzoneOptions.selection.get();
        }

        switch (action) {
            case 'CHU2CHU' :
                if (!appCommons.utilsModule.is_ctrl_key(event)) act = 'MOV';
                break;
            case 'IMGT2REG':
            case 'CHU2REG' :
            case 'REG2REG':
                let sameSbas = true;
                const sbas_reg = destKey.attr('sbas');

                for (let i = 0; i < lstbr.length && sameSbas; i++) {
                    if (lstbr[i].split('_').shift() !== sbas_reg) {
                        sameSbas = false;
                        break;
                    }
                }

                if (sameSbas === false) {
                    return Alerts('', localeService.t('reg_wrong_sbas'));
                }

                break;
            default:
        }

            let url = '';
            let data = {};
            switch (act + action) {
                case 'MOVCHU2CHU':
                    url = dest_uri + 'stealElements/';
                    data = {
                        elements: sselcont
                    };
                    break;
                case 'ADDCHU2REG':
                case 'ADDREG2REG':
                case 'ADDIMGT2REG':
                case 'ADDCHU2CHU':
                case 'ADDREG2CHU':
                case 'ADDIMGT2CHU':
                    url = dest_uri + 'addElements/';
                    data = {
                        lst: lstbr.join(';')
                    };
                    break;
                default:
                    if (window.console) {
                        console.log('Should not happen');
                    }
                    return false;
            }

        //save basket after drop elt
        if($('#basket-tab').val() == '#baskets') {

            if (window.console) {
                window.console.log('About to execute ajax POST on ', url, ' with datas ', data);
            }


            $.ajax({
                type: 'POST',
                url: url,
                data: data,
                dataType: 'json',
                beforeSend: function () {

                },
                success: function (data) {
                    if (!data.success) {
                        humane.error(data.message);
                    } else {
                        humane.info(data.message);
                    }
                    if (act === 'MOV' || $(destKey).next().is(':visible') === true || $(destKey).hasClass('content') === true) {
                        $('.CHIM.selected:visible').fadeOut();
                        workzoneOptions.selection.empty();
                        return workzoneOptions.reloadCurrent();
                    }

                    return true;
                }
            });

        }else {
            console.log('To do : dropped expose to display ');
            window.console.log('About to put record on expose ', url, ' with datas ', data);
            $('#'+dest_uri).append('<p>'+data.lst+'</p>')
        }
    }

    function fix() {
        $.ajax({
            type: 'POST',
            url: `${url}prod/WorkZone/attachStories/`,
            data: {stories: searchSelection.asArray},
            dataType: 'json',
            success: function (data) {
                humane.info(data.message);
                workzoneOptions.refresh();
            }
        });
    }

    function unfix(link) {
        $.ajax({
            type: 'POST',
            url: link,
            dataType: 'json',
            success: function (data) {
                humane.info(data.message);
                workzoneOptions.refresh();
            }
        });
    }

    function setRemoveWarning(state) {
        warnOnRemove = state;
    }

    // remove record from basket/story preferences
    function toggleRemoveWarning(el) {
        var state = !el.checked;
        appCommons.userModule.setPref('reg_delete', (state ? '1' : '0'));
        warnOnRemove = state;
    }

    // map events to result selection:
    appEvents.listenAll({
        'workzone.selection.selectAll': () => workzoneOptions.selection.selectAll(),
        // 'workzone.selection.unselectAll': () => workzoneOptions.selection.empty(),
        // 'workzone.selection.selectByType': (dataType) => workzoneOptions.selection.select(dataType.type),
        'workzone.selection.remove': (data) => workzoneOptions.selection.remove(data.records)
    });

    appEvents.listenAll({
        'broadcast.searchResultSelection': (selection) => {
            searchSelection = selection;
        },
        'workzone.refresh': refreshBaskets,
        'workzone.doAddToBasket': (options) => {
            workzoneOptions.addElementToBasket(options);
        },
        'workzone.doRemoveFromBasket': (options) => {
            WorkZoneElementRemover(options.event, options.confirm);
        },
        'workzone.doRemoveWarning': setRemoveWarning,
        'workzone.doToggleRemoveWarning': toggleRemoveWarning
    });

    return {
        initialize, workzoneFacets, workzoneBaskets, workzoneThesaurus, setRemoveWarning,
        toggleRemoveWarning, getResultSelectionStream
    };
};
export default workzone;
