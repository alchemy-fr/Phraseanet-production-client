import $ from 'jquery';
import {Lists, List} from './model/index';
import listEditor from './listEditor';
import listShare from './listShare';
import dialog from '../../../node_modules/phraseanet-common/src/components/dialog';
import pushAddUser from '../record/recordPush/addUser';
import * as _ from 'underscore';
const humane = require('humane-js');

const ListManager = function (services, options) {
    const { configService, localeService, appEvents } = services;
    const { containerId } = options;
    const url = configService.get('baseUrl');
    let $container;

    this.list = null;
    this.container = $container = $(containerId);
    this.userList = new Lists();

    pushAddUser(services).initialize({$container: this.container});

    var _this = this;

    $container.on('click', '.back_link', function () {
            $('#PushBox').show();
            $('#ListManager').hide();
            return false;
        })
        .on('click', '.push-list-share-action', (event) => {
            event.preventDefault();
            let $el = $(event.currentTarget);
            const listId = $el.data('list-id');

            listShare(services).openModal({
                listId, modalOptions: {
                    size: 'Small',
                    closeButton: true,
                    title: $el.attr('title')
                }, modalLevel: 2
            });
            return false;
        })
        .on('click', 'a.user_adder', function () {

            var $this = $(this);

            $.ajax({
                type: 'GET',
                url: $this.attr('href'),
                dataType: 'html',
                beforeSend: function () {
                    var options = {
                        size: 'Medium',
                        title: $this.html()
                    };
                    dialog.create(services, options, 2).getDomElement().addClass('loading');
                },
                success: function (data) {
                    dialog.get(2).getDomElement().removeClass('loading').empty().append(data);
                    return;
                },
                error: function () {
                    dialog.get(2).close();
                    return;
                },
                timeout: function () {
                    dialog.get(2).close();
                    return;
                }
            });

            return false;
        })
        .on('mouseenter', '.list-trash-btn', function (event) {
            var $el = $(event.currentTarget);
            $el.find('.image-normal').hide();
            $el.find('.image-hover').show();
        })
        .on('mouseleave', '.list-trash-btn', function (event) {
            var $el = $(event.currentTarget);
            $el.find('.image-normal').show();
            $el.find('.image-hover').hide();
        })
        .on('click', '.list-trash-btn', function (event) {
            var $el = $(event.currentTarget);
            var list_id = $el.parent().data('list-id');
            appEvents.emit('push.removeList', {list_id: list_id});
        });

    var initLeft = () => {
        $container.on('click', '.push-refresh-list-action', (event) => {
            //$('a.list_refresh', $container).bind('click', (event) => {
            // /prod/lists/all/
            var callback = function (datas) {
                $('.all-lists', $container).removeClass('loading').append(datas);
                initLeft();
            };

            $('.all-lists', $container).empty().addClass('loading');

            this.userList.get(callback, 'html');

            return false;
        });

        $container.on('click', '.push-add-list-action', (event) => {
            event.preventDefault();
            var makeDialog = (box) => {

                var buttons = {};

                buttons[localeService.t('valider')] = () => {

                    var callbackOK = function () {
                        $('a.list_refresh', $container).trigger('click');
                        dialog.get(2).close();
                    };

                    var name = $('input[name="name"]', dialog.get(2).getDomElement()).val();

                    if ($.trim(name) === '') {
                        alert(localeService.t('listNameCannotBeEmpty'));
                        return;
                    }

                    this.userList.create(name, callbackOK);
                };
// /prod/lists/list/
                var options = {
                    cancelButton: true,
                    buttons: buttons,
                    size: '700x170'
                };

                dialog.create(services, options, 2).setContent(box);
            };

            var html = _.template($('#list_editor_dialog_add_tpl').html());
            makeDialog(html);

            return false;
        });

        /*$('li.list a.list_link', $container).bind('click', function (event) {

         var $this = $(this);

         $this.closest('.lists').find('.list.selected').removeClass('selected');
         $this.parent('li.list').addClass('selected');
         return false;
         });*/
        $container.on('click', '.list-edit-action', (event) => {
            event.preventDefault();
            let $el = $(event.currentTarget);
            const listId = $el.data('list-id');
            $el.closest('.lists').find('.list').removeClass('selected');
            $el.parent().addClass('selected');

            $.ajax({
                type: 'GET',
                url: `${url}prod/push/edit-list/${listId}/`,
                dataType: 'html',
                success: (data) => {
                    this.workOn(listId);
                    $('.editor', $container).removeClass('loading').append(data);
                    initRight();
                    listEditor(services, {
                        $container, listManagerInstance: this
                    });
                },
                beforeSend: function () {
                    $('.editor', $container).empty().addClass('loading');
                }
            });
        });
        $container.on('click', '.listmanager-delete-list-user-action', (event) => {
            event.preventDefault();
            let $el = $(event.currentTarget);
            const listId = $el.data('list-id');
            const userId = $el.data('user-id');


            var badge = $(this).closest('.badge');
            // var usr_id = badge.find('input[name="id"]').val();
            this.getList().removeUser(userId, function (list, data) {
                badge.remove();
            });
        });
    };

    var initRight = function () {

        var $container = $('#ListManager .editor');

        $('form[name="list-editor-search"]', $container).bind('submit', function () {

            var $this = $(this);
            var dest = $('.list-editor-results', $container);

            $.ajax({
                url: $this.attr('action'),
                type: $this.attr('method'),
                dataType: 'html',
                data: $this.serializeArray(),
                beforeSend: function () {
                    dest.empty().addClass('loading');
                },
                success: function (datas) {

                    dest.empty().removeClass('loading').append(datas);
                }
            });
            return false;
        });

        $('form[name="list-editor-search"] select, form[name="list-editor-search"] input[name="ListUser"]', $container).bind('change', function () {
            $(this).closest('form').trigger('submit');
        });

        $('.EditToggle', $container).bind('click', function () {
            $('.content.readonly, .content.readwrite', $('#ListManager')).toggle();
            return false;
        });
        $('.Refresher', $container).bind('click', function () {
            $('#ListManager ul.lists .list.selected a').trigger('click');
            return false;
        });

        $('form[name="SaveName"]', $container).bind('submit', function () {
            var $this = $(this);

            $.ajax({
                type: $this.attr('method'),
                url: $this.attr('action'),
                dataType: 'json',
                data: $this.serializeArray(),
                beforeSend: function () {

                },
                success: function (data) {
                    if (data.success) {
                        humane.info(data.message);
                        $('#ListManager .lists .list_refresh').trigger('click');
                    } else {
                        humane.error(data.message);
                    }
                    return;
                },
                error: function () {

                    return;
                },
                timeout: function () {

                    return;
                }
            });

            return false;
        });

        //button.deleter
        $('.listmanager-delete-list-action', $container).bind('click', function (event) {

            var list_id = $(this).data('list-id');

            var makeDialog = function (box) {

                var buttons = {};

                buttons[localeService.t('valider')] = function () {

                    var callbackOK = function () {
                        $('#ListManager .all-lists a.list_refresh').trigger('click');
                        dialog.get(2).close();
                    };

                    var List = new List(list_id);
                    List.remove(callbackOK);
                };

                var options = {
                    cancelButton: true,
                    buttons: buttons,
                    size: 'Alert'
                };

                dialog.create(services, options, 2).setContent(box);
            };

            var html = _.template($('#list_editor_dialog_delete_tpl').html());

            makeDialog(html);

            return false;
        });
        $('input[name="users-search"]', $container).autocomplete({
            minLength: 2,
            source: function (request, response) {
                $.ajax({
                    url: `${url}prod/push/search-user/`,
                    dataType: 'json',
                    data: {
                        query: request.term
                    },
                    success: function (data) {
                        response(data);
                    }
                });
            },
            focus: function (event, ui) {
                $('input[name="users-search"]').val(ui.item.label);
            },
            select: function (event, ui) {
                if (ui.item.type === 'USER') {
                    _this.selectUser(ui.item);
                } else if (ui.item.type === 'LIST') {
                    for (let e in ui.item.entries) {
                        _this.selectUser(ui.item.entries[e].User);
                    }
                }
                return false;
            }
        })
        .data('ui-autocomplete')._renderItem = function (ul, item) {
            var html = '';
    
            if (item.type === 'USER') {
                html = _.template($('#list_user_tpl').html())({
    
                    item: item
                });
            } else if (item.type === 'LIST') {
                html = _.template($('#list_list_tpl').html())({
                    item: item
                });
            }
    
            return $(html).data('ui-autocomplete-item', item).appendTo(ul);
        };
    };

    initLeft();

    $('.badges a.deleter', this.container).on('click', (event) => {
        let $this = $(event.currentTarget);
        var badge = $this.closest('.badge');

        var usr_id = badge.find('input[name="id"]').val();


        var callback = function (list, datas) {
            $('.counter.current, .list.selected .counter', $('#ListManager')).each(function () {
                $this.text(parseInt($this.text(), 10) - 1);
            });

            badge.remove();
        };

        this.getList().removeUser(usr_id, callback);

        return false;
    });

    return this;

};

ListManager.prototype = {
    selectUser: function (user) {
        if (typeof user !== 'object') {
            if (window.console) {
                console.log('trying to select a user with wrong datas');
            }
        }
        if ($('.badge_' + user.usr_id, this.container).length > 0) {
            humane.info('User already selected');
            return;
        }
        else {
            var html = _.template($('#list_manager_badge_tpl').html())({
                user: user
            });
    
            // p4.Feedback.appendBadge(html);
            this.getList().addUser(user.usr_id);
            this.appendBadge(html);
        }
    },
    workOn: function (list_id) {
        this.list = new List(list_id);
    },
    getList: function () {
        return this.list;
    },
    appendBadge: function (datas) {
        $('#ListManager .badges').append(datas);
    },
    createList: function (options) {
        let { name, collection } = options;

        this.userList.create(name, function (list) {
            list.addUsers(collection);
        });
    },
    removeList: function (list_id, callback) {
        this.list = new List(list_id);
        this.list.remove(callback);
    }
};


export default ListManager;
