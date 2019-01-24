require('./facets.scss');

import $ from 'jquery';
require('jquery-ui');
require('jquery.fancytree/src/jquery.fancytree');
import * as _ from 'underscore';
const workzoneFacets = services => {
    const { configService, localeService, appEvents } = services;

    /*
     selectedFacetValues[]
     key : facet.name
     value : {
     'value' : facet.value,
     'mode' : "AND"|"EXCEPT"
     }
     */

    const ORDER_BY_BCT = "ORDER_BY_BCT";
    const ORDER_ALPHA_ASC = "ORDER_ALPHA_ASC";
    const ORDER_BY_HITS = "ORDER_BY_HITS";

    let selectedFacetValues = [];
    let facetStatus = $.parseJSON(sessionStorage.getItem('facetStatus')) || [];
    let hiddenFacetsList = [];


    /*var getSelectedFacets = function() {
     return selectedFacetValues;
     };*/

    var resetSelectedFacets = function () {
        selectedFacetValues = [];
        return selectedFacetValues;
    };


    var loadFacets = function (data) {
        hiddenFacetsList = data.hiddenFacetsList;

        function sortIteration(i) {
            switch(data.facetValueOrder) {
                case ORDER_ALPHA_ASC:
                    return i.value.toString().toLowerCase();
                    break;
                case ORDER_BY_HITS:
                    return i.count*-1;
                    break;
            }
        }

        // Convert facets data to fancytree source format
        var treeSource = _.map(data.facets, function (facet) {
            // Values
            var values = _.map(_.sortBy(facet.values, sortIteration), function (value) {
                return {
                    title: value.value + ' (' + value.count + ')',
                    query: value.query,
                    label: value.value,
                    tooltip: value.value + ' (' + value.count + ')'
                };
            });
            // Facet
            return {
                name: facet.name,
                title: facet.label,
                folder: true,
                children: values,
                expanded: !_.some(facetStatus, function(o) { return _.has(o, facet.name)})
            };
        });

        treeSource.sort(
            _sortFacets('title', true, function (a) {
                return a.toUpperCase();
            })
        );

        if(data.facetOrder == ORDER_BY_BCT) {
            treeSource = _sortByPredefinedFacets(treeSource, 'name', ['base_aggregate', 'collection_aggregate', 'doctype_aggregate']);
        }

        if(data.filterFacet == true) {
            treeSource = _shouldFilterSingleContent(treeSource);
        }

        if (hiddenFacetsList.length > 0) {
            treeSource = _shouldMaskNodes(treeSource, hiddenFacetsList);
        }

        treeSource = _parseColors(treeSource);

        return _getFacetsTree().reload(treeSource)
            .done(function () {
                _.each($('#proposals').find('.fancytree-expanded'), function (element, i) {
                    $(element).find('.fancytree-title, .fancytree-expander').css('line-height', $(element)[0].offsetHeight + 'px');
                    $(element).find('.mask-facets-btn, .fancytree-expander').css('height', $(element)[0].offsetHeight + 'px');

                    var li_s = $(element).next().children('li');
                    var ul = $(element).next();
                    if(li_s.length > 5) {
                        _.each(li_s, function(el, i) {
                            if(i > 4) {
                                $(el).hide();
                            }
                        });
                        ul.append('<button class="see_more_btn">See more</button>');
                    }
                });
                $('.see_more_btn').on('click', function() {
                    $(this).closest('ul').children().show();
                    $(this).hide();
                    return false;
                });
            });
    };

    function _parseColors(source) {
        _.forEach(source, function (facet) {
            if (!_.isUndefined(facet.children) && (facet.children.length > 0)) {
                _.forEach(facet.children, function (child) {
                    var title = child.title;
                    child.title = _formatColorText(title.toString());
                });
            }
        });
        return source;
    }

    function _formatColorText(string, textLimit = 0) {
        //get color code from text if exist
        var regexp = /^(.*)\[#([0-9a-fA-F]{6})].*$/;


        var match = string.match(regexp);
        if (match && match[2] != null) {
            var colorCode = '#' + match[2];
            // //add color circle and re move color code from text;
            var textWithoutColorCode = string.replace('[' + colorCode + ']', '');
            if (textLimit > 0 && textWithoutColorCode.length > textLimit) {
                textWithoutColorCode = textWithoutColorCode.substring(0, textLimit) + '…';
            }
            return '<span class="color-dot" style="background-color: ' + colorCode + '"></span>' + ' ' + textWithoutColorCode;
        } else {
            if (textLimit > 0 && string.length > textLimit) {
                string = string.substring(0, textLimit) + '…';
            }
            return string;
        }
    }


    // from stackoverflow
    // http://stackoverflow.com/questions/979256/sorting-an-array-of-javascript-objects/979325#979325
    function _sortFacets(field, reverse, primer) {
        var key = function (x) {
            return primer ? primer(x[field]) : x[field];
        };

        return function (a, b) {
            let A = key(a);
            let B = key(b);
            return (A < B ? -1 : A > B ? 1 : 0) * [-1, 1][+!!reverse];
        };
    }

    function _shouldMaskNodes(source, facetsList) {
        let filteredSource = source.slice();
        _.each(facetsList, function (facetsValue, index) {
            for (let i = filteredSource.length - 1; i > -1; --i) {
                let facet = filteredSource[i];
                if (facet['name'] !== undefined) {
                    if (facet['name'] === facetsValue.name) {
                        filteredSource.splice(i, 1);
                    }
                }
            }
        });
        return filteredSource;
    }

    function _shouldFilterSingleContent(source) {
        var filteredSource = [];
        _.forEach(source, function (facet) {
            //close expansion for facet containing selected values
            // if (!_.isUndefined(selectedFacetValues[facet.title])) {
            //     facet.expanded = false;
            // }
            if (
                !_.isUndefined(facet.children) &&
                (facet.children.length > 1 ||
                !_.isUndefined(selectedFacetValues[facet.title]))
            ) {
                filteredSource.push(facet);
            }
        });
        return filteredSource;
    }

    function _sortByPredefinedFacets(source, field, predefinedFieldOrder) {
        let filteredSource = source.slice();
        let ordered = [];

        _.each(predefinedFieldOrder, function (fieldValue, index) {
            for (let i = filteredSource.length - 1; i > -1; --i) {
                let facet = filteredSource[i];
                if (facet[field] !== undefined) {
                    if (facet[field] === fieldValue) {
                        ordered.push(facet);
                        // remove from filtered
                        filteredSource.splice(i, 1);
                    }
                }
            }
        });

        const olen = filteredSource.length;
        // fill predefined facets with non predefined facets
        for (let i = 0; i < olen; i++) {
            ordered.push(filteredSource[i]);
        }
        return ordered;
    }

    function _getFacetsTree() {
        var $facetsTree = $('#proposals');
        if (!$facetsTree.data('ui-fancytree')) {
            $facetsTree.fancytree({
                // activate and expand
                clickFolderMode: 3,
                icons: false,
                source: [],
                activate: function (event, data) {
                    var query = data.node.data.query;
                    var eventType = event.originalEvent;
                    //if user did not click, then no need to perform any query
                    if(eventType == null) {
                        return;
                    }
                    if (query) {
                        var facet = data.node.parent;
                        var facetData = {
                            value: data.node.data,
                            mode: event.altKey ? "EXCEPT" : "AND"
                        };

                        if (selectedFacetValues[facet.title] == null) {
                            selectedFacetValues[facet.title] = [];
                        }
                        selectedFacetValues[facet.title].push(facetData);
                        _facetCombinedSearch();
                    }
                },
                collapse: function (event, data) {
                    var dict = {};
                    dict[data.node.data.name] = "collapse";
                    if(_.findWhere(facetStatus, dict) !== undefined ) {
                        facetStatus = _.without(facetStatus, _.findWhere(facetStatus, dict))
                    }
                    facetStatus.push(dict);
                    sessionStorage.setItem('facetStatus', JSON.stringify(facetStatus));
                },
                expand: function (event, data) {
                    var dict = {};
                    dict[data.node.data.name] = "collapse";
                    if (_.findWhere(facetStatus, dict) !== undefined) {
                        facetStatus = _.without(facetStatus, _.findWhere(facetStatus, dict))
                    }
                    sessionStorage.setItem('facetStatus', JSON.stringify(facetStatus));
                },
                renderNode: function (event, data) {
                    var facetFilter = "";
                    var node = data.node;
                    var $nodeSpan = $(node.span);

                    // check if span of node already rendered
                    if (!$nodeSpan.data('rendered')) {
                        var deleteButton = $('<div class="mask-facets-btn"><a></a></div>');
                        $nodeSpan.append(deleteButton);
                        deleteButton.hide();

                        $nodeSpan.hover(function () {
                            deleteButton.show();
                        }, function () {
                            deleteButton.hide();
                        });

                        deleteButton.click(function () {
                            var nodeObj = {name: node.data.name, title: node.title};
                            hiddenFacetsList.push(nodeObj);
                            node.remove();
                            appEvents.emit('search.saveHiddenFacetsList', hiddenFacetsList);
                            appEvents.emit('search.reloadHiddenFacetList', hiddenFacetsList);
                        });

                        // span rendered
                        $nodeSpan.data('rendered', true);

                        if (data.node.folder && !_.isUndefined(selectedFacetValues[data.node.title])) {
                            if ($(".fancytree-folder", data.node.li).find('.dataNode').length == 0) {
                                var dataNode = document.createElement('div');
                                dataNode.setAttribute("class", "dataNode");
                                $(".fancytree-folder", data.node.li).append(
                                    dataNode
                                );
                            } else {
                                //remove existing facets
                                $(".dataNode", data.node.li).empty();
                            }

                            _.each(selectedFacetValues[data.node.title], function (facetValue) {

                                facetFilter = facetValue.value.label;

                                var s_label = document.createElement("SPAN");
                                s_label.setAttribute("class", "facetFilter-label");
                                s_label.setAttribute("title", facetFilter);

                                var length = 15;
                                var facetFilterString = _formatColorText(facetFilter.toString(), length);

                                _.each($.parseHTML(facetFilterString), function (elem) {
                                    s_label.appendChild(elem);
                                });

                                var buttonsSpan = document.createElement("SPAN");
                                buttonsSpan.setAttribute("class", "buttons-span");

                                var s_inverse = document.createElement("A");
                                s_inverse.setAttribute("class", "facetFilter-inverse");

                                var s_closer = document.createElement("A");
                                s_closer.setAttribute("class", "facetFilter-closer");

                                var s_gradient = document.createElement("SPAN");
                                s_gradient.setAttribute("class", "facetFilter-gradient");
                                s_gradient.appendChild(document.createTextNode("\u00A0"));

                                s_label.appendChild(s_gradient);

                                var s_facet = document.createElement("SPAN");
                                s_facet.setAttribute("class", "facetFilter" + '_' + facetValue.mode);
                                s_facet.appendChild(s_label);
                                s_facet.appendChild(buttonsSpan);
                                buttonsSpan.appendChild(s_inverse);
                                buttonsSpan.appendChild(s_closer);

                                $(s_closer).on('click',
                                    function (event) {
                                        event.stopPropagation();
                                        var $facet = $(this).parent().parent();
                                        var facetTitle = $facet.data("facetTitle");
                                        var facetFilter = $facet.data("facetFilter");
                                        var mode = $facet.hasClass("facetFilter_EXCEPT") ? "EXCEPT" : "AND";
                                        selectedFacetValues[facetTitle] = _.reject(selectedFacetValues[facetTitle], function (obj) {
                                            return (obj.value.label == facetFilter && obj.mode == mode);
                                        });
                                        //delete selectedFacetValues[facetTitle];
                                        _facetCombinedSearch();
                                        return false;
                                    }
                                );

                                $(s_inverse).on('click',
                                    function (event) {
                                        event.stopPropagation();
                                        var $facet = $(this).parent().parent();
                                        var facetTitle = $facet.data("facetTitle");
                                        var facetFilter = $facet.data("facetFilter");
                                        var mode = $facet.hasClass("facetFilter_EXCEPT") ? "EXCEPT" : "AND";
                                        var found = _.find(selectedFacetValues[facetTitle], function (obj) {
                                            return (obj.value.label == facetFilter && obj.mode == mode);
                                        });
                                        if (found) {
                                            var newMode = mode == "EXCEPT" ? "AND" : "EXCEPT";
                                            found.mode = newMode;
                                            //replace class attr
                                            $facet.filter('.' + "facetFilter" + '_' + mode).removeClass("facetFilter" + '_' + mode).addClass("facetFilter" + '_' + newMode).end();
                                            _facetCombinedSearch();
                                        }
                                        return false;
                                    }
                                );

                                var newNode = document.createElement('div');
                                newNode.setAttribute("class", "newNode");
                                s_facet = $(newNode.appendChild(s_facet));
                                s_facet.data("facetTitle", data.node.title);
                                s_facet.data("facetFilter", facetFilter);

                                s_facet.hover(function () {
                                    $(buttonsSpan).show();
                                }, function () {
                                    $(buttonsSpan).hide();
                                });

                                $(".fancytree-folder .dataNode", data.node.li).append(
                                    newNode
                                );
                            });
                        }
                    }
                }
            });
        }
        return $facetsTree.fancytree('getTree');
    }

    function _facetCombinedSearch() {
        var q = $('#EDIT_query').val();
        var q_facet_and = "";
        var q_facet_except = "";
        _.each(_.values(selectedFacetValues), function (facet) {
            _.each(facet, function (facetValue) {
                switch (facetValue.mode) {
                    case "AND":
                        q_facet_and += (q_facet_and ? " AND " : "") + '(' + facetValue.value.query + ')';
                        break;
                    case "EXCEPT":
                        q_facet_except += (q_facet_except ? " OR " : "") + '(' + facetValue.value.query + ')';
                        break;
                }
            });
        });
        if(!q && !q_facet_and && q_facet_except) {
            // too bad : an except with no query.
            q = "created_on>1900/01/01";    // fake "all"
        }
        if(q_facet_and != "") {
            if (q) {
                q = '(' + q + ') AND '
            }
            q += q_facet_and;
        }
        if(q_facet_except != "") {
            q = '(' + q + ') EXCEPT (' + q_facet_except + ')';
        }

        appEvents.emit('search.doCheckFilters');
        appEvents.emit('search.doNewSearch', q);
        // searchModule.newSearch(q);
    }

    appEvents.listenAll({
        'facets.doLoadFacets': loadFacets,
        'facets.doResetSelectedFacets': resetSelectedFacets,
    });

    return {
        loadFacets,
        resetSelectedFacets
    };
};

export default workzoneFacets;
