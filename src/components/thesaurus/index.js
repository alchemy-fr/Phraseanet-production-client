import $ from 'jquery';
import _ from 'underscore';
import {sprintf} from 'sprintf-js';
import * as AppCommons from 'phraseanet-common';
import dialog from '../../../node_modules/phraseanet-common/src/components/dialog';
require('phraseanet-common/src/components/vendors/contextMenu');

const thesaurusService = (services) => {
    const {configService, localeService, appEvents} = services;
    let options = {};
    let config = {};
    let sbas;
    let bas2sbas;
    let trees; // @TODO remove global
    const initialize = (params) => {
        let {$container} = params;

        config = configService.get('thesaurusConfig');
        // set up thlist:
        options.thlist = {};
        options.tabs = null;
        for (let db in config.availableDatabases) {
            if (config.availableDatabases.hasOwnProperty(db)) {
                let curDb = config.availableDatabases[db];
                options.thlist['s' + curDb.id] = new ThesauThesaurusSeeker(curDb.id);
            }
        }

        startThesaurus();
        let cclicks = 0;
        const cDelay = 350;
        let cTimer = null;

        $container

            .on('click', '.thesaurus-branch-action', (event) => {
                let $el = $(event.currentTarget);
                event.preventDefault();
                cclicks++;

                if (cclicks === 1) {
                    cTimer = setTimeout(function () {
                        Xclick(event);
                        cclicks = 0;
                    }, cDelay);

                } else {
                    clearTimeout(cTimer);

                    if ($el.data('context') === 'thesaurus') {
                        TXdblClick(event);
                    } else {
                        CXdblClick(event);
                    }
                    cclicks = 0;
                }
            })
            .on('dblclick', '.thesaurus-branch-action', (event) => {
                // dbl is handled by click event
                event.preventDefault();
            })
            .on('click', '.thesaurus-cancel-wizard-action', (event) => {
                // dbl is handled by click event
                event.preventDefault();
                thesauCancelWizard();
            })
            .on('keyup', '.thesaurus-filter-suggest-action', (event) => {
                event.preventDefault();
                searchValue($(event.currentTarget).val());
            })
            .on('submit', '.thesaurus-filter-submit-action', (event) => {
                event.preventDefault();
                T_Gfilter(event.currentTarget);
            });

        searchValue = _.debounce(searchValue, 300);
    };


    function show() {
        // first show of thesaurus
        if (options.currentWizard === '???') {
            thesauShowWizard('wiz_0', false);
        }
    }

    function thesauCancelWizard() {
        thesauShowWizard('wiz_0', true);
    }

    function thesauShowWizard(wizard, refreshFilter) {
        if (wizard !== options.currentWizard) {
            $('#THPD_WIZARDS DIV.wizard', options.tabs).hide();
            $('#THPD_WIZARDS .' + wizard, options.tabs).show();
            $('#THPD_T_treeBox', options.tabs).css('top', $('#THPD_WIZARDS', options.tabs).height());

            options.currentWizard = wizard;

            if (refreshFilter) {
                searchValue($('#THPD_WIZARDS .gform', options.tabs).eq(0).val());
            }
            // browse
            if (wizard === 'wiz_0') {
                $('#THPD_WIZARDS .th_cancel', options.tabs).hide();
            } else {
                $('#THPD_WIZARDS .th_cancel', options.tabs).show();
            }
            // accept
            if (wizard === 'wiz_1') {
                $('#THPD_WIZARDS .th_ok', options.tabs).hide();
            } else {
                $('#THPD_WIZARDS .th_ok', options.tabs).show();
            }

            $('#THPD_WIZARDS FORM :text')[0].focus();
        }
    }


// here when the 'filter' forms is submited with key <enter> or button <ok>
// force immediate search
    function T_Gfilter(o) {
        var f;
        if (o.nodeName === 'FORM') {
            f = $(o).find('input[name=search_value]').val();
        } else if (o.nodeName === 'INPUT') {
            f = $(o).val();
        }

        searchValue(f);

        switch (options.currentWizard) {
            case 'wiz_0':	// browse
                break;
            case 'wiz_1':	// accept
                break;
            case 'wiz_2':	// replace
                T_replaceBy2(f);
                break;
            default:
                break;
        }
    }

// here when a key is pressed in the 'filter' form
    let searchValue = (f) => {
        switch (options.currentWizard) {
            case 'wiz_0':	// browse
                searchValueByMode(f, 'ALL');
                break;
            case 'wiz_1':	// accept
                searchValueByMode(f, 'CANDIDATE');
                break;
            case 'wiz_2':	// replace
                searchValueByMode(f, 'CANDIDATE');
                break;
            default:
                break;
        }
    }


    function T_replaceBy2(f) {
        if (trees.C._selInfos.n !== 1) {
            return;
        }
        let term = trees.C._selInfos.sel.eq(0).find('span span').html();
        let cid = trees.C._selInfos.sel[0].getAttribute('id').split('.');
        cid.shift();
        let sbas = cid.shift();
        cid = cid.join('.');

        trees.C._toReplace = {sbas: sbas, cid: cid, replaceby: f};

        let msg = sprintf(config.replaceMessage, {from: term, to: f});

        let confirmBox = dialog.create(services, {
            size: 'Alert',
            closeOnEscape: true,
            cancelButton: true,
            buttons: {
                Ok: function () {
                    confirmBox.close();
                    T_replaceCandidates_OK();
                }
            }
        });
        confirmBox.setContent(msg);
    }

    function searchValueByMode(f, mode) {

        if (mode === 'ALL') {
            // search in every base, everywhere
            for (let i in sbas) {
                let zurl = '/xmlhttp/search_th_term_prod.j.php'
                    + '?sbid=' + sbas[i].sbid
                    + '&t=' + encodeURIComponent(f);
                $('#THPD_T_treeBox').addClass('loading');
                sbas[i].seeker = $.ajax({
                    url: zurl,
                    type: 'POST',
                    data: [],
                    dataType: 'json',
                    success: function (j) {
                        var z = '#TX_P\\.' + j.parm.sbid + '\\.T';

                        var o = $(z);
                        var isLast = o.hasClass('last');

                        o.replaceWith(j.html);

                        if (isLast) {
                            $(z).addClass('last');
                        }
                    }, complete: function () {
                        $('#THPD_T_treeBox').removeClass('loading');
                    }
                });
            }
        } else if (mode === 'CANDIDATE') {
            // search only on the good base and the good branch(es)
            for (let i in sbas) {
                var zurl = '/xmlhttp/search_th_term_prod.j.php?sbid=' + sbas[i].sbid;
                $('#THPD_T_treeBox').addClass('loading');
                if (sbas[i].sbid === trees.C._selInfos.sbas) {
                    zurl += '&t=' + encodeURIComponent(f)
                        + '&field=' + encodeURIComponent(trees.C._selInfos.field);
                }
                sbas[i].seeker = $.ajax({
                    url: zurl,
                    type: 'POST',
                    data: [],
                    dataType: 'json',
                    success: function (j) {
                        var z = '#TX_P\\.' + j.parm.sbid + '\\.T';

                        var o = $(z);
                        var isLast = o.hasClass('last');

                        o.replaceWith(j.html);

                        if (isLast) {
                            $(z).addClass('last');
                        }
                    }, complete: function () {
                        $('#THPD_T_treeBox').removeClass('loading');
                    }
                });

            }
        }
    }


// ======================================================================================================

    function T_replaceCandidates_OK() {


        var replacingBox = dialog.create(services, {
            size: 'Alert'
        });
        replacingBox.setContent(config.replaceInProgressMsg);

        var parms = {
            url: '/xmlhttp/replacecandidate.j.php',
            data: {
                'id[]': trees.C._toReplace.sbas + '.' + trees.C._toReplace.cid,
                t: trees.C._toReplace.replaceby,
                debug: '0'
            },
            async: false,
            cache: false,
            dataType: 'json',
            timeout: 10 * 60 * 1000,	// 10 minutes !
            success: function (result, textStatus) {
                trees.C._toReplace = null;
                thesauShowWizard('wiz_0', false);

                replacingBox.close();

                if (result.msg !== '') {
                    var alert = dialog.create(services, {
                        size: 'Alert',
                        closeOnEscape: true,
                        closeButton: true
                    });
                    alert.setContent(result.msg);
                }

                for (let i in result.ctermsDeleted) {
                    var cid = '#CX_P\\.' + result.ctermsDeleted[i].replace(new RegExp('\\.', 'g'), '\\.');	// escape les '.' pour jquery
                    $(cid).remove();
                }

            },
            _ret: null	// private alchemy
        };

        $.ajax(parms);
    }


    function T_acceptCandidates_OK() {
        let same_sbas = true;
        let acceptingBox = dialog.create(services, {
            size: 'Alert'
        });
        acceptingBox.setContent(config.acceptMsg);

        let t_ids = [];
        let dst = trees.C._toAccept.dst.split('.');
        dst.shift();
        let sbid = dst.shift();
        dst = dst.join('.');
        // obviously the candidates and the target already complies (same sbas, good tbranch)
        trees.C._selInfos.sel.each(
            function () {
                var x = this.getAttribute('id').split('.');
                x.shift();
                if (x.shift() !== sbid) {
                    same_sbas = false;
                }
                t_ids.push(x.join('.'));
            }
        );

        if (!same_sbas) {
            return;
        }

        var parms = {
            url: '/xmlhttp/acceptcandidates.j.php',
            data: {
                // "debug": false,
                sbid: sbid,
                tid: dst,
                'cid[]': t_ids,
                typ: trees.C._toAccept.type,
                piv: trees.C._toAccept.lng
            },
            async: false,
            cache: false,
            dataType: 'json',
            success: function (result, textStatus) {
                for (let i in result.refresh) {
                    var zurl = '/xmlhttp/openbranch_prod.j.php'
                        + '?type=' + result.refresh[i].type
                        + '&sbid=' + result.refresh[i].sbid
                        + '&id=' + encodeURIComponent(result.refresh[i].id);
                    if (result.refresh[i].type === 'T') {
                        zurl += '&sortsy=1';
                    }

                    $.get(zurl,
                        [],
                        function (j) {
                            var z = '#' + j.parm.type
                                + 'X_P\\.'
                                + j.parm.sbid + '\\.'
                                + j.parm.id.replace(new RegExp('\\.', 'g'), '\\.');	// escape les '.' pour jquery

                            $(z).children('ul').eq(0).replaceWith(j.html);
                        },
                        'json');
                }
                trees.C._toAccept = null;
                thesauShowWizard('wiz_0', false);
                acceptingBox.close();
            },
            error: function () {
                acceptingBox.close();
            },
            timeout: function () {
                acceptingBox.close();
            },
            _ret: null	// private alchemy
        };

        $.ajax(parms);
    }


    function C_deleteCandidates_OK() {
        var deletingBox = dialog.create(services, {
            size: 'Alert'
        });
        deletingBox.setContent(config.deleteMsg);

        var t_ids = [];
        var lisel = trees.C.tree.find('LI .selected');
        trees.C.tree.find('LI .selected').each(
            function () {
                var x = this.getAttribute('id').split('.');
                x.shift();
                t_ids.push(x.join('.'));
            }
        );
        var parms = {
            url: '/xmlhttp/replacecandidate.j.php',
            data: {'id[]': t_ids},
            async: false,
            cache: false,
            dataType: 'json',
            timeout: 10 * 60 * 1000,	// 10 minutes !
            success: function (result, textStatus) {
                deletingBox.close();

                if (result.msg !== '') {
                    var alert = dialog.create(services, {
                        size: 'Alert',
                        closeOnEscape: true,
                        closeButton: true
                    });
                    alert.setContent(result.msg);
                }

                for (let i in result.ctermsDeleted) {
                    var cid = '#CX_P\\.' + result.ctermsDeleted[i].replace(new RegExp('\\.', 'g'), '\\.');	// escape les '.' pour jquery
                    $(cid).remove();
                }
            },
            _ret: null
        };

        $.ajax(parms);
    }


// menu option T:accept as...
    function T_acceptCandidates(menuItem, menu, type) {
        var lidst = trees.T.tree.find('LI .selected');
        if (lidst.length !== 1) {
            return;
        }

        var lisel = trees.C.tree.find('LI .selected');
        if (lisel.length === 0) {
            return;
        }

        var msg;

        if (lisel.length === 1) {
            var term = lisel.eq(0).find('span span').html();
            msg = sprintf(config.candidateUniqueMsg, term);
        } else {
            msg = sprintf(config.candidateManyMsg, lisel.length);
        }

        trees.C._toAccept.type = type;
        trees.C._toAccept.dst = lidst.eq(0).attr('id');

        var confirmBox = dialog.create(services, {
            size: 'Alert',
            closeOnEscape: true,
            cancelButton: true,
            buttons: {
                Ok: function () {
                    confirmBox.close();
                    T_acceptCandidates_OK();
                }
            }
        });
        confirmBox.setContent(msg);

    }


// menu option T:search
    function T_search(menuItem, menu, cmenu, e, label) {
        if (!menu._li) {
            return;
        }
        var tcids = menu._li.attr('id').split('.');
        tcids.shift();
        var sbid = tcids.shift();
        var term = menu._li.find('span span').html();

        doThesSearch('T', sbid, term, null);
    }


    function C_MenuOption(menuItem, menu, option, parm) {
        // nothing selected in candidates ?
        if (!trees.C._selInfos) {
            return;
        }

        trees.C._toAccept = null;	// cancel previous 'accept' action anyway
        trees.C._toReplace = null;	// cancel previous 'replace' action anyway
        // display helpful message into the thesaurus box...
        let msg;
        let term;
        switch (option) {
            case 'ACCEPT':
                // glue selection to the tree
                trees.C._toAccept = {lng: parm.lng};


                if (trees.C._selInfos.n === 1) {
                    msg = sprintf(config.acceptCandidateUniqueMsg, menu._srcElement.find('span').html());
                } else {
                    msg = sprintf(config.acceptCandidateManyMsg, trees.C._selInfos.n);
                }

                // set the content of the wizard
                $('#THPD_WIZARDS .wiz_1 .txt').html(msg);
                // ... and switch to the thesaurus tab
                options.tabs.tabs('option', 'active', 0);
                thesauShowWizard('wiz_1', true);

                break;

            case 'REPLACE':
                if (trees.C._selInfos.n === 1) {
                    term = trees.C._selInfos.sel.eq(0).find('span span').html();
                    msg = sprintf(config.replaceCandidateUniqueMsg, term);
                } else {
                    msg = sprintf(config.replaceCandidateManyMsg, trees.C._selInfos.n);
                }

                options.tabs.tabs('option', 'active', 0);

                // set the content of the wizard
                $('#THPD_WIZARDS .wiz_2 .txt').html(msg);
                // ... and switch to the thesaurus tab
                thesauShowWizard('wiz_2', true);

                break;

            case 'DELETE':
                $('#THPD_WIZARDS DIV', options.tabs).hide();

                if (trees.C._selInfos.n === 1) {
                    term = trees.C._selInfos.sel.eq(0).find('span span').html();
                    msg = sprintf(config.deleteCandidateUniqueMsg, term);
                } else {
                    msg = sprintf(config.deleteCandidateManyMsg, trees.C._selInfos.n);
                }

                let confirmBox = dialog.create(services, {
                    size: 'Alert',
                    closeOnEscape: true,
                    cancelButton: true,
                    buttons: {
                        Ok: function () {
                            confirmBox.close();
                            C_deleteCandidates_OK();
                        }
                    }
                });
                confirmBox.setContent(msg);

                break;
            default:
        }
    }


    function Xclick(e) {
        let x = e.srcElement ? e.srcElement : e.target;
        let li = $(x).closest('li');
        let tids = li.attr('id').split('.');
        let type;
        switch (x.nodeName) {
            case 'DIV':		// +/-
                var tid = tids.shift();
                var sbid = tids.shift();
                type = tid.substr(0, 1);
                // TX_P ou CX_P
                if ((type === 'T' || type === 'C') && tid.substr(1, 4) === 'X_P') {
                    var ul = li.children('ul').eq(0);
                    if (ul.css('display') === 'none' || AppCommons.utilsModule.is_ctrl_key(e)) {
                        if (AppCommons.utilsModule.is_ctrl_key(e)) {
                            ul.text(config.loadingMsg);
                            li.removeAttr('loaded');
                        }

                        ul.show();

                        if (!li.attr('loaded')) {
                            var zurl = '/xmlhttp/openbranch_prod.j.php?type=' + type + '&sbid=' + sbid + '&id=' + encodeURIComponent(tids.join('.'));
                            if (li.hasClass('last')) {
                                zurl += '&last=1';
                            }
                            if (type === 'T') {
                                zurl += '&sortsy=1';
                            }
                            $.get(zurl, [], function (j) {
                                    ul.replaceWith(j.html);
                                    li.attr('loaded', '1');
                                }
                                , 'json');
                        }
                    } else {
                        ul.hide();
                    }
                }
                break;
            case 'SPAN':
                type = tids[0].substr(0, 1);
                if ((type === 'T' && tids.length > 2) || tids.length === 4) {
                    tids.pop();
                    var tid3 = tids.join('.');
                    if (!AppCommons.utilsModule.is_ctrl_key(e) && !AppCommons.utilsModule.is_shift_key(e)) {
                        $('LI', trees[type].tree).removeClass('selected');
                        options.lastClickedCandidate = null;
                    } else {
                        // if($("#THPD_C_treeBox")._lastClicked)
                        if (options.lastClickedCandidate !== null) {
                            if (options.lastClickedCandidate.tid3 !== tid3) {
                                $('LI', trees[type].tree).removeClass('selected');
                                options.lastClickedCandidate = null;
                            } else {
                                if (e.shiftKey) {
                                    var lip = li.parent().children('li');
                                    var idx0 = lip.index(options.lastClickedCandidate.item);
                                    var idx1 = lip.index(li);
                                    if (idx0 < idx1) {
                                        lip.filter(function (index) {
                                            return (index >= idx0 && index < idx1);
                                        }).addClass('selected');
                                    } else {
                                        lip.filter(function (index) {
                                            return (index > idx1 && index <= idx0);
                                        }).addClass('selected');
                                    }
                                }
                            }
                        }
                    }
                    li.toggleClass('selected');
                    if (type === 'C') {
                        options.lastClickedCandidate = {item: li, tid3: tid3};
                    }
                }
                break;
            default:
                break;
        }
    }

    function TXdblClick(e) {
        let x = e.srcElement ? e.srcElement : e.target;
        let tid = $(x).closest('li').attr('id');
        let term;
        switch (x.nodeName) {
            case 'SPAN':		// term
                switch (options.currentWizard) {
                    case 'wiz_0':				// simply browse
                        if (tid.substr(0, 5) === 'TX_P.') {
                            var tids = tid.split('.');
                            if (tids.length > 3) {
                                var sbid = tids[1];
                                term = $(x).hasClass('separator') ? $(x).prev().text() : $(x).text();
                                doThesSearch('T', sbid, term, null);
                            }
                        }
                        break;
                    case 'wiz_2':				// replace by
                        if (tid.substr(0, 5) === 'TX_P.') {
                            term = $(x).text();
                            $('#THPD_WIZARDS .wiz_2 :text').val(term);
                            T_replaceBy2(term);
                        }
                        break;
                    default:
                }
                break;
            default:
                break;
        }
    }

    function CXdblClick(e) {
        var x = e.srcElement ? e.srcElement : e.target;
        switch (x.nodeName) {
            case 'SPAN':		// term
                var li = $(x).closest('li');
                var field = li.closest('[field]').attr('field');
                if (typeof field !== 'undefined') {
                    var tid = li.attr('id');
                    if (tid.substr(0, 5) === 'CX_P.') {
                        var sbid = tid.split('.')[1];
                        var term = $(x).text();
                        doThesSearch('C', sbid, term, field);
                    }
                }
                break;
            default:
                break;
        }
    }

    function doThesSearch(type, sbid, term, field) {
        appEvents.emit('search.activateDatabase', {databases: [sbid]});

        let queryString = '';
        if (type === 'T') {
            queryString = '[' + term + ']';
        } else {
            queryString = field + '="' + term + '"';
        }
        appEvents.emit('facets.doResetSelectedFacets');
        $('#EDIT_query').val(queryString);
        appEvents.emit('search.doCheckFilters');
        appEvents.emit('search.doNewSearch', queryString);
        //searchModule.newSearch(v);
    }

    function ThesauThesaurusSeeker(sbas_id) {
        this.sbas_id = sbas_id;
        this._ctimer = null;
        this._xmlhttp = null;
        this.tObj = {TH_searching: null, TH_P: null, TH_K: null};
        this.search = function (txt) {
            if (this._ctimer) {
                clearTimeout(this._ctimer);
            }
            this._ctimer = setTimeout(() => {
                return options.thlist['s' + this.sbas_id].search_delayed('"' + txt.replace("'", "\\'") + '"');
            }, 100);
        };
        this.search_delayed = function (txt) {
            var me = this;
            if (this._xmlttp.abort && typeof this._xmlttp.abort === 'function') {
                this._xmlhttp.abort();
            }
            var url = '/xmlhttp/openbranches_prod.x.php';
            var parms = {
                bid: this.sbas_id,
                t: txt,
                mod: 'TREE'
            };

            this._xmlhttp = $.ajax({
                url: url,
                type: 'POST',
                data: parms,
                success: function (ret) {
                    me.xmlhttpstatechanged(ret);
                },
                error: function () {

                },
                timeout: function () {

                }
            });

            this._ctimer = null;
        };
        this.openBranch = function (id, thid) {
            var me = this;
            if (this._xmlttp.abort && typeof this._xmlttp.abort === 'function') {
                this._xmlhttp.abort();
            }
            var url = '/xmlhttp/getterm_prod.x.php';
            var parms = {
                bid: this.sbas_id,
                sortsy: 1,
                id: thid,
                typ: 'TH'
            };

            this._xmlhttp = $.ajax({
                url: url,
                type: 'POST',
                data: parms,
                success: function (ret) {
                    me.xmlhttpstatechanged(ret, id);
                },
                error: function () {

                },
                timeout: function () {

                }
            });

        };
        this.xmlhttpstatechanged = function (ret, id) {
            try {
                if (!this.tObj.TH_searching) {
                    this.tObj.TH_searching = document.getElementById('TH_searching');
                }
                this.tObj.TH_searching.src = '/assets/common/images/icons/ftp-loader-blank.gif';
                // && (typeof(ret.parsed)=="undefined" || ret.parsed))
                if (ret) {
                    let htmlnodes = ret.getElementsByTagName('html');
                    let htmlnode = htmlnodes.item(0).firstChild;
                    if (htmlnodes && htmlnodes.length === 1 && htmlnode) {
                        if (typeof (id) === 'undefined') {
                            // called from search or 'auto' : full thesaurus search
                            if (!this.tObj.TH_P) {
                                this.tObj.TH_P = document.getElementById('TH_P.' + this.sbas_id + '.T');
                            }
                            if (!this.tObj.TH_K) {
                                this.tObj.TH_K = document.getElementById('TH_K.' + this.sbas_id + '.T');
                            }
                            this.tObj.TH_P.innerHTML = '...';
                            this.tObj.TH_K.className = 'h';
                            this.tObj.TH_K.innerHTML = htmlnode.nodeValue;
                        } else {
                            // called from 'openBranch'
                            //			var js = "document.getElementById('TH_K."+thid+"').innerHTML = \""+htmlnode.nodeValue+"\"";
                            //			self.setTimeout(js, 10);
                            document.getElementById('TH_K.' + id).innerHTML = htmlnode.nodeValue;
                        }
                    }
                }
            } catch (err) {
            }
        };
    }


    function startThesaurus() {

        options.thlist = config.thlist;
        options.currentWizard = '???';

        sbas = config.sbas;
        bas2sbas = config.bas2sbas;

        options.lastTextfocus = null;

        options.lastClickedCandidate = null;

        options.tabs = $('#THPD_tabs');
        options.tabs.tabs();

        trees = {
            T: {
                tree: $('#THPD_T_tree', options.tabs)
            },
            C: {
                tree: $('#THPD_C_tree', options.tabs),
                // may contain : {'type', 'dst', 'lng'}
                _toAccept: null,
                _toReplace: null,
                // may contain : {'sel':lisel, 'field':field, 'sbas':sbas, 'n':lisel.length}
                _selInfos: null
            }
        };

        trees.T.tree.contextMenu(
            [
                {
                    label: config.searchMsg,
                    onclick: function (menuItem, menu, cmenu, e, label) {
                        T_search(menuItem, menu, cmenu, e, label);
                    }
                },
                {
                    label: config.acceptSpecificTermMsg,
                    onclick: function (menuItem, menu) {
                        T_acceptCandidates(menuItem, menu, 'TS');
                    }
                },
                {
                    label: config.acceptSynonymeMsg,
                    onclick: function (menuItem, menu) {
                        T_acceptCandidates(menuItem, menu, 'SY');
                    }
                }
            ]
            ,
            {
                className: 'THPD_TMenu',
                beforeShow: function () {
                    var menuOptions = $(this.menu).find('.context-menu-item');
                    menuOptions.eq(1).addClass('context-menu-item-disabled');
                    menuOptions.eq(2).addClass('context-menu-item-disabled');

                    var x = this._showEvent.srcElement ? this._showEvent.srcElement : this._showEvent.target;
                    var li = $(x).closest('li');
                    this._li = null;
                    var tcids = li.attr('id').split('.');
                    if (tcids.length > 2 && tcids[0] === 'TX_P' && tcids[2] !== 'T' && x.nodeName !== 'LI') {
                        this._li = li;
                        tcids.shift();
                        var sbas = tcids.shift();

                        // this._srcElement = li;		// private alchemy
                        if (!li.hasClass('selected')) {
                            // rclick OUTSIDE the selection : unselect all
                            trees.T.tree.find('LI').removeClass('selected');

                            $('li', trees.T.tree).removeClass('selected');
                            li.addClass('selected');
                        }

                        if (trees.C._selInfos && trees.C._selInfos.sbas === sbas) {
                            // whe check if the candidates can be validated here
                            // aka does the tbranch of the field (of candidates) reaches the paste location ?
                            var parms = {
                                url: '/xmlhttp/checkcandidatetarget.j.php'
                                + '?sbid=' + sbas
                                + '&acf=' + encodeURIComponent(trees.C._selInfos.field)
                                + '&id=' + encodeURIComponent(tcids.join('.')),
                                data: [],
                                async: false,
                                cache: false,
                                dataType: 'json',
                                timeout: 1000,
                                success: function (result, textStatus) {
                                    this._ret = result;
                                    if (result.acceptable) {
                                        menuOptions.eq(1).removeClass('context-menu-item-disabled');
                                        menuOptions.eq(2).removeClass('context-menu-item-disabled');
                                    }
                                },
                                _ret: null	// private alchemy
                            };

                            $.ajax(parms);

                        }
                    }
                    return (true);
                }
            }
        );

        var contextMenu = [];
        for (let i = 0; i < config.langContextMenu.length; i++) {
            var langPlist = config.langContextMenu[i];
            contextMenu.push({
                label: langPlist.label,
                onclick: function (menuItem, menu) {
                    C_MenuOption(menuItem, menu, 'ACCEPT', {lng: langPlist.lngCode});
                }
            });
        }

        contextMenu.push({
            label: config.replaceWithMsg,
//      disabled:true,
            onclick: function (menuItem, menu) {
                C_MenuOption(menuItem, menu, 'REPLACE', null);
            }
        });

        contextMenu.push({
            label: config.removeActionMsg,
//      disabled:true,
            onclick: function (menuItem, menu) {
                C_MenuOption(menuItem, menu, 'DELETE', null);
            }
        });

        trees.C.tree.contextMenu(
            contextMenu,
            {
                beforeShow: function () {
                    var ret = false;

                    var x = this._showEvent.srcElement ? this._showEvent.srcElement : this._showEvent.target;
                    var li = $(x).closest('li');

                    if (!li.hasClass('selected')) {
                        // rclick OUTSIDE the selection : unselect all
                        // lisel.removeClass('selected');
                        trees.C.tree.find('LI').removeClass('selected');
                        options.lastClickedCandidate = null;
                    }
                    var tcids = li.attr('id').split('.');
                    if (tcids.length === 4 && tcids[0] === 'CX_P' && x.nodeName !== 'LI') {
                        // candidate context menu only clicking on final term
                        if (!li.hasClass('selected')) {
                            li.addClass('selected');
                        }
                        //				this._cutInfos = { sbid:tcids[1], field:li.parent().attr('field') };	// private alchemy
                        this._srcElement = li;						// private alchemy

                        // as selection changes, compute usefull info (field, sbas)
                        var lisel = trees.C.tree.find('LI .selected');
                        if (lisel.length > 0) {
                            // lisel are all from the same candidate field, so check the first li
                            var li0 = lisel.eq(0);
                            var field = li0.parent().attr('field');
                            var sbas = li0.attr('id').split('.')[1];

                            // glue selection info to the tree
                            trees.C._selInfos = {sel: lisel, field: field, sbas: sbas, n: lisel.length};

                            if (lisel.length === 1) {

                                $(this.menu).find('.context-menu-item').eq(config.languagesCount).removeClass('context-menu-item-disabled');
                            } else {
                                $(this.menu).find('.context-menu-item').eq(config.languagesCount).addClass('context-menu-item-disabled');
                            }
                        } else {
                            trees.C._selInfos = null;
                        }

                        ret = true;
                    }
                    return (ret);
                }
            }
        );

    }


    return {initialize, show};
};

export default thesaurusService;
