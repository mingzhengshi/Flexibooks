jQuery(document).ready(function ($) {
    // record the latest copy event
    var copied_from_editor_id = "";
    var copied_content = "";
    var copied_node = null;
    var copied_mode = "";

    var on_icon_hover = false;
    var _mouseX = -1;
    var _mouseY = -1;
    var _dragging = false;
    var _dragged_item_id = -1;

    tinymce.PluginManager.add('fb_folding_editor', function (editor, url) {

        // events
        editor.on('init', function () {
            if (editor.id.indexOf("fb-merge-mce") >= 0) {
            }

            if (editor.id.indexOf("fb-source-mce") >= 0) {
            }

            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                // when the derived mce is inited; we can load the source mce
                var callback = flexibook.deriveMceInitCallback;
                if (callback) callback();
            }

            update();
        });

        editor.on('SetContent', function () {

            update();
        });

        editor.on('change', function (e) {
            //console.log('change event', e);
            setupDerivedElementID();

            update();
        });

        editor.on('PostProcess', function (e) {
            update();
        });

        editor.on('activate', function (e) {
            update();
        });

        editor.on('focus', function (e) {
            update();
        });

        editor.on('cut', function (e) {
            onCutOrCopy(e);

            /*
            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                    var icon = document.createElement('div');
                    icon.id = 'move-test-id-1234';
                    icon.title = "draggable";
                    icon.className = 'fb_tinymce_left_column_icon2';
                    icon.innerHTML = 'd';
                    //icon.style.position = 'absolute';
                    //icon.style.top = 200 + 'px';
                    //icon.style.left = 10 + 'px';
                    icon.style.fontSize = '120%';

                    //icon.style.paddingLeft = '9px';
                    //icon.style.paddingRight = '9px';

                    icon.style.border = 'solid';
                    icon.style.borderWidth = '1px';
                    icon.style.borderColor = 'grey';
                    icon.style.borderRadius = '18px';

                    icon.style.width = '36px';
                    icon.style.textAlign = 'center';
                    //icon.style.height = '8px';
                    icon.style.backgroundColor = '#dedede';
                    icon.style.opacity = 1;

                    icon.draggable = true;

                    editor.getBody().appendChild(icon);
            }
            */
        });

        editor.on('copy', function (e) {
            onCutOrCopy(e);
        });

        editor.on('keydown', function (e) {
            // backspace key
            if (e.keyCode == 8) {

            }
                // enter key
            else if (e.keyCode == 13) {
                onEnterKeyDown(e);
            }
                // delete key
            else if (e.keyCode == 46) {

            }
        });

        /*
        editor.on('NodeChange', function (e) {
            //console.log('NodeChange event...', e);

            var selected_node = editor.selection.getNode();
            console.log("selected node:");
            console.log(selected_node);
            console.log("tagName: " + selected_node.tagName);

            var selected_content = editor.selection.getContent();
            console.log("selected content:");
            console.log(selected_content);
            console.log("selected content length:" + selected_content.length);
        });
        */

        editor.on('PastePreProcess', function (e) {
            if (editor.id.indexOf("fb-derived-mce") < 0) return; // only for derived editor

            pastePreProcess(e);
        });

        editor.on('mouseup', function (e) {
            if (on_icon_hover) return;
            resetIcons();
            onMouseUp(e);
        });

        function onMouseUp(e) {
            console.log("tinymce mouse up event");

            // the selected node can be an insert or delete tags or other inline tags
            var node = editor.selection.getNode();

            if (!node) return;
            if (node.tagName.toLowerCase() == 'body') return; // do not consider the case when multiple paragraphs have been selected
            if (editor.id.indexOf("fb-source-mce") < 0 && editor.id.indexOf("fb-derived-mce") < 0) return;

            var id = $(node).attr('id');

            while ((id == null) || (typeof id == 'undefined')) {
                node = $(node).parent()[0]; // only consider that case when one paragraph has been selected
                id = $(node).attr('id');
            }

            if (node.tagName.toLowerCase() == 'body') return; // if the node is the body again, then return

            // derived editor only 
            // change view of source document according to derive selections
            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                var post_id = $(node).attr('data-source-post-id');

                var callback = flexibook.derivedElementMouseUpCallback;
                if (callback) callback(post_id, id);
            }

            // derived editor only
            // drag and drop paragraphs
            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                var offset = $(node).offset(); // absolute position relative to the document
                var height = $(node).height();
                var top = offset.top - 22 + height / 2;
                var width = $(editor.getBody()).width();

                var moveIconID = 'move-' + $(node).attr('id');

                createDraggableIcon(moveIconID, top, width, '&#9776', 'Move this item')
                setupDraggableIconEvents(moveIconID);
                setupIconEvents();
            }


            //-----------------------------------------------------------------------------------------------
            // merge cases

            if (!$(node).attr('data-merge-case')) return;
            if ($(node).attr('data-merge-case') <= 0) return;

            var mcase = $(node).attr('data-merge-case');
            // setup merge icon

            var offset = $(node).offset(); // absolute position relative to the document
            var height = $(node).height();
            var top = offset.top - 22 + height / 2;
            var width = $(editor.getBody()).width();

            if (mcase == 1) {
                var yesIconID = 'myes-' + $(node).attr('id');
                var noIconID = 'mnon-' + $(node).attr('id');

                createMergeIcon(yesIconID, top, width - 50, '&#10003', mcase, "Accept the change in source document");
                createMergeIcon(noIconID, top, width, '&#10007', mcase, "Ignore the change in source document");
            }
            else if (mcase == 3) {
                var moreIconID = 'more-' + $(node).attr('id');
                var mlesIconID = 'mles-' + $(node).attr('id');
                var noIconID = 'mnon-' + $(node).attr('id');

                if (flexibook.columns_of_editors == 2) {
                    createMergeIcon(moreIconID, top, width - 50, 'III', mcase, "Show previous source (three-column view)");
                }
                else if (flexibook.columns_of_editors == 3) {
                    createMergeIcon(mlesIconID, top, width - 50, 'II', mcase, "Hide previous source (two-column view)");
                }
                createMergeIcon(noIconID, top, width, '&#10007', mcase, "Ignore the change in source document");
            }
            else if (mcase == 5) {
                var insIconID = 'mins-' + $(node).attr('id');
                var noIconID = 'mnon-' + $(node).attr('id');

                createMergeIcon(insIconID, top, width - 50, '&#8680', mcase, "Insert the new paragraph to derived document");
                createMergeIcon(noIconID, top, width, '&#10007', mcase, "Ignore this new paragraph");
            }
            else if (mcase == 6) {
                var yesIconID = 'myes-' + $(node).attr('id');
                var noIconID = 'mnon-' + $(node).attr('id');

                createMergeIcon(yesIconID, top, width - 50, '&#10003', mcase, "Accept the deletion in source document");
                createMergeIcon(noIconID, top, width, '&#10007', mcase, "Ignore the deletion in source document");
            }

            setupIconEvents();
        }

        function onEnterKeyDown(e) {
            var content = editor.selection.getContent();
            var node = editor.selection.getNode();

            if (content == null) return;
            if (!node) return;

            // only consider derive document; assume source document is not editable
            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                // if no content has been selected
                if (isEmptyContent(content) == true) {
                    // only consider the paragraph that derives from the source document
                    if (!$(node).attr('data-source-id')) {

                    }
                    // check if the cursor is at the start or the end of the paragraph
                }
                    // if some contents have been selected
                else {
                    // seems the enter key works like the backspace key
                    /*
                    // multiple paragraphs or parts of multiple paragraphs have been selected
                    if (node.tagName.toLowerCase() == 'body') {

                    }
                    // one paragraphs or part of one paragraph has been selected
                    else {

                    }
                    */
                }
            }
        }

        function onCutOrCopy(e) {
            if (!editor.hasOwnProperty("post_id")) return;
            var post_id = editor.post_id;

            copied_from_editor_id = editor.id;
            copied_content = editor.selection.getContent();
            copied_node = null;

            console.log("COPY:");
            console.log("copy from editor: " + copied_from_editor_id);
            if (copied_content == null || copied_content.length == 0) return;

            var copied_node = editor.selection.getNode(); // returns the currently selected element or the common ancestor element for both start and end of the selection
            if (!copied_node) return;

            if (editor.id.indexOf("fb-source-mce") >= 0 ||
                editor.id.indexOf("fb-derived-mce") >= 0) {
                // usually, multiple paragraphs or parts of multiple paragraphs have been selected
                if (copied_node.tagName.toLowerCase() == 'body') {
                    console.log("copied node:");
                    console.log(copied_node);
                    console.log("selected content:" + copied_content);

                    copied_mode = "multiple";
                    copied_node = null; // we don't need the node

                    var cont = "";
                    $(copied_content).each(function (index) {
                        var node = $(this).clone();
                        $(node).attr("data-source-post-id", post_id);
                        cont += $(node).prop('outerHTML');
                    });
                    copied_content = cont;
                }
                    // one paragraphs or part of one paragraph has been selected
                else {
                    copied_mode = "single";
                    var node = $(copied_node).clone();
                    $(node).attr("data-source-post-id", post_id);
                    $(node).html(copied_content);
                    copied_content = $(node).prop('outerHTML');

                    console.log("copied node:");
                    console.log(copied_node);
                    console.log("selected content:" + copied_content);
                }
            }
        }

        // this function only considers content copied from source or derived editors 
        function pastePreProcess(e) {
            console.log("PASTE:");
            console.log("e.content:" + e.content);
            console.log("copied_content:" + copied_content);
            if (e.content == null || e.content.length <= 0) return;

            // COPY: (assume that) all content copies from source or derived editors are html elements; 
            // CUT: single paragraph content cut from source or derived editors are NOT html elements; - but we should assume source content is not editable in derived pages
            //if (isHTML(e.content) == false) return;

            // if the content comes from the source document
            if (copied_from_editor_id.indexOf("fb-source-mce") >= 0) {
                if (copied_mode == "single") {
                    var paste_text = "";
                    // single paragraph content cut from source or derived editors are NOT html elements
                    if (isHTML(e.content) == false) {
                        paste_text = e.content.trim();
                    }
                    else {
                        paste_text = $(e.content).html().trim();
                    }

                    var copied_text = $(copied_content).html().trim();

                    // it is possible that the paste content comes from other sources such as word or notepad, etc.
                    if (paste_text == copied_text) {
                        e.content = copied_content;
                    }
                }
                else if (copied_mode == "multiple") {
                    var paste_text = "";

                    if (isHTML(e.content) == false) {
                        paste_text = e.content.trim();
                    }
                    else {
                        $(e.content).each(function (index) {
                            paste_text += $(this).html().trim();
                        });
                    }

                    var copied_text = "";
                    $(copied_content).each(function (index) {
                        copied_text += $(this).html().trim();
                    });

                    // it is possible that the paste content comes from other sources such as word or notepad, etc.
                    if (paste_text == copied_text) {
                        e.content = copied_content;
                    }
                }
            }
                // if the content comes from the derive document
            else if (copied_from_editor_id.indexOf("fb-derived-mce") >= 0) {

            }
        }

        function isEmptyContent(content) {
            if (!content) return true;

            if (isHTML(content) == true) {
                if ($(content).html().length == 0) return true;
            }
            else {
                if (content.length == 0) return true;
            }

            return false;
        }

        function isHTML(text) {
            var a = document.createElement('div');
            a.innerHTML = text;
            for (var c = a.childNodes, i = c.length; i--;) {
                if (c[i].nodeType == 1) return true;
            }
            return false;
        }

        function update() {
            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                var callback = flexibook.deriveUpdateCallback;
                if (callback) callback();
            }

            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                $(editor.getBody()).children().on('dragenter', function () {
                    if (_dragging == false) return;
                    $(editor.getBody()).find('.fb_tinymce_dragging').remove();

                    var item = $(this);
                    if (item.attr('id') == _dragged_item_id) return;

                    if (item.hasClass("fb_tinymce_left_column") == false && item.hasClass("fb_tinymce_left_column_icon") == false && item.hasClass("fb_tinymce_dragging") == false) {                                                                     
                        var dragged_item = editor.getDoc().getElementById(_dragged_item_id);

                        var clone = $(dragged_item).clone();
                        $(clone).addClass('fb_tinymce_dragging');
                        $(clone).css('opacity', 0.5);

                        //dragged_item_height = $(dragged_item).outerHeight(true);
                        //clone_outer = $(clone).prop('outerHTML');

                        //var insert = '<div class="fb_tinymce_dragging" height="' + dragged_item_height + 'px"></div>';
                        //var outer = item.prop('outerHTML') + insert;
                        //item.prop('outerHTML', outer);
                        $(clone).insertAfter(item);
                        console.log("mouse enter: " + item.attr('id'));
                    }
                });
            }

            resetIcons();
        }

        function resetIcons() {
            $(editor.getBody()).find('.fb_tinymce_left_column').remove();
            var left_column = document.createElement('div');
            left_column.style.position = 'absolute';
            left_column.style.top = 0;
            left_column.style.left = 0;
            left_column.style.width = '12px';

            //var body_height = $(editor.getBody()).height();
            //left_column.style.height = body_height + 'px';
            left_column.style.height = '100%';
            left_column.style.backgroundColor = '#e8e8e8';
            left_column.className = 'fb_tinymce_left_column';
            editor.getBody().appendChild(left_column);

            $(editor.getBody()).find('.fb_tinymce_left_column_icon').remove(); // clear all existing icons
            $(editor.getBody()).find('h1, h2, h3').each(function (index) {
                var foldingIconID = 'fold-' + $(this).attr('id');
                var pushIconID = 'push-' + $(this).attr('id');
                var offset = $(this).offset(); // absolute position relative to the document
                //var height = $(this).height();
                var classes = $(this).attr('class');

                if (classes && classes.indexOf("fb-display-none") >= 0) {
                    //var test = 1;
                }
                else if (classes && classes.indexOf("fb-collapse") >= 0) {
                    createIcon(foldingIconID, offset.top, -0.5, '&#8862'); // folding icon: plus 
                    if (editor.id.indexOf("fb-source-mce") >= 0) {
                        createIcon(pushIconID, offset.top + 15, -0.5, '&#9655');
                    }
                }
                else {
                    createIcon(foldingIconID, offset.top, -0.5, '&#8863'); // folding icon: minus 
                    if (editor.id.indexOf("fb-source-mce") >= 0) {
                        createIcon(pushIconID, offset.top + 15, -0.5, '&#9655');
                    }
                }
            });

            on_icon_hover = false;
            setupIconEvents();
        }

        function setupDraggableIconEvents(icon_id) {
            var icon = editor.getDoc().getElementById(icon_id);
            icon.addEventListener('dragstart', function (event) {
                _dragging = true;

                var targetID = icon.id.substr(5);
                if (targetID == null) return;
                _dragged_item_id = targetID;

                console.log('dragstart');
            });

            /*
            icon.addEventListener('drag', function (event) {
                if (Math.abs(event.clientX - _mouseX) <= 2 && Math.abs(event.clientY - _mouseY) <= 2) return;
                _mouseX = event.clientX;
                _mouseY = event.clientY;
                console.log('dragging: ' + event.clientX + ", " + event.clientY);
            });
            */

            icon.addEventListener('dragend', function (event) {
                _dragging = false;

                console.log('dragend');
            });
        }

        function setupIconEvents() {
            $(editor.getBody()).find('.fb_tinymce_left_column_icon').hover(
                // handlerIn
                function () {
                    $(this).css('cursor', 'pointer');
                    on_icon_hover = true;

                    if (isMergeIcons($(this)) || isDraggableIcons($(this))) {
                        $(this).css('opacity', 1);
                    }
                },
                // handlerOut
                function () {
                    $(this).css('cursor', 'text');
                    on_icon_hover = false;

                    if (isMergeIcons($(this)) || isDraggableIcons($(this))) {
                        $(this).css('opacity', 0.3);
                    }
                }
            );

            $(editor.getBody()).find('.fb_tinymce_left_column_icon').click(function () {
                var this_icon = $(this);
                var targetID = this_icon.attr('id').substr(5);
                if (targetID == null) return;

                // click the minus box: collapse
                if (this_icon.html().charCodeAt() == '8863') {
                    collapseOrExpand(targetID, true);

                    this_icon.html('&#8862');  // switch to plus box
                }
                    // click the plug box: expand
                else if (this_icon.html().charCodeAt() == '8862') {
                    collapseOrExpand(targetID, false);

                    this_icon.html('&#8863');  // switch to minus box
                }
                    // click the push button: add content
                else if (this_icon.html().charCodeAt() == '9655') {
                    insertContent(targetID);
                }
                    // click the show previous source button
                else if (this_icon.html() == 'III') {
                    var callback = flexibook.showPreviousSourceIconClickCallback;
                    if (callback) callback();
                }
                    // click the show previous source button
                else if (this_icon.html() == 'II') {
                    var callback = flexibook.showPreviousSourceIconClickCallback;
                    if (callback) callback();
                }
                    // click the merge button
                else if (isMergeIcons(this_icon)) {
                    var mcase = this_icon.prop('data-mcase');
                    switch (mcase) {
                        case "1":
                        case "3":
                        case "6":
                            var post_id;
                            var source_item_id;
                            var derive_item_id = targetID;

                            $(editor.getBody()).find('#' + targetID).each(function () {
                                post_id = $(this).attr('data-source-post-id');
                                source_item_id = $(this).attr('data-source-id');
                            });

                            var callback = flexibook.mergeIconClickCallback;
                            if (callback) callback(this_icon.html().charCodeAt(), post_id, source_item_id, derive_item_id, mcase);

                            break;
                        case "5":
                            var post_id = editor.post_id;
                            var source_item_id = this_icon.attr('id').substr(5);
                            var derive_item_id = null;

                            var callback = flexibook.mergeIconClickCallback;
                            if (callback) callback(this_icon.html().charCodeAt(), post_id, source_item_id, derive_item_id, mcase);

                            break;
                    }
                }

                update();
            });
        }

        function isMergeIcons(this_icon) {
            if ((this_icon.html().charCodeAt() == '10003') ||
                (this_icon.html().charCodeAt() == '10007') ||
                (this_icon.html() == 'III') ||
                (this_icon.html() == 'II') ||
                (this_icon.html().charCodeAt() == '8680')) {
                return true;
            }
            return false;
        }

        function isDraggableIcons(this_icon) {
            if (this_icon.html().charCodeAt() == '9776') {
                return true;
            }
            return false;
        }

        function setupDerivedElementID() {
            if (editor.id.indexOf("fb-derived-mce") < 0) return; // only for derived editor

            $(editor.getBody()).children().each(function (index) {
                if ($(this).hasClass("fb_tinymce_left_column") == false && $(this).hasClass("fb_tinymce_left_column_icon") == false) {
                    if (!$(this).attr('data-source-id')) {
                        if (!$(this).attr('id')) {
                            // new element created by the user
                            $(this).attr("data-source-id", "none");
                            $(this).attr("id", generateUUID());
                        }
                        else {
                            // element from source document
                            var source_id = $(this).attr("id");
                            $(this).attr("data-source-id", source_id);
                            $(this).attr("id", generateUUID());
                        }
                    }
                    else {
                        if (!$(this).attr('id')) {
                            // new element created by the user
                            $(this).attr("data-source-id", "none");
                            $(this).attr("id", generateUUID());
                        }
                    }
                }
            });
        }

        function generateUUID() {
            var d = new Date().getTime();
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
            });
            return uuid;
        };

        function insertContent(targetID) {
            var content = "";

            if (!editor.hasOwnProperty("post_id")) return;
            var post_id = editor.post_id;

            var start = false;
            var targetLevel = 10000;
            var children = $(editor.getBody()).children();
            if (children != null && children.length > 0) {
                for (var i = 0; i < children.length; i++) {
                    var element = children[i];
                    if (element.className.indexOf("fb_tinymce_left_column") >= 0) continue;

                    if (start == false) {
                        if (element.id == targetID) {
                            start = true;
                            targetLevel = parseInt(element.tagName.substr(1));

                            var element_copy = $(element).clone();
                            $(element_copy).attr("data-source-post-id", post_id);
                            content += $(element_copy).prop('outerHTML');
                        }
                    }
                    else {
                        if ((element.tagName.toLowerCase() == 'h1') || (element.tagName.toLowerCase() == 'h2') || (element.tagName.toLowerCase() == 'h3')) {
                            var level = parseInt(element.tagName.substr(1));
                            if (level <= targetLevel) {
                                break;
                            }
                            else {
                                var element_copy = $(element).clone();
                                $(element_copy).attr("data-source-post-id", post_id);
                                content += $(element_copy).prop('outerHTML');
                            }
                        }
                        else {
                            var element_copy = $(element).clone();
                            $(element_copy).attr("data-source-post-id", post_id);
                            content += $(element_copy).prop('outerHTML');
                        }
                    }
                }
            }

            var derived_mce = tinymce.get('fb-derived-mce');
            if (derived_mce) {
                derived_mce.insertContent(content); // inserts content at cursor position
            }
        }

        function collapseOrExpand(targetID, collapse) {
            var start = false;
            var targetLevel = 10000;
            var children = $(editor.getBody()).children();
            if (children != null && children.length > 0) {
                for (var i = 0; i < children.length; i++) {
                    var element = children[i];
                    if (element.className.indexOf("fb_tinymce_left_column") >= 0) continue;

                    if (start == false) {
                        if (element.id == targetID) {
                            start = true;
                            targetLevel = parseInt(element.tagName.substr(1));

                            if (collapse) {
                                element.className += (' fb-collapse');
                            }
                            else {
                                //$('#' + element.id).removeClass('fb-collapse');
                                element.className = element.className.replace(/(?:^|\s)fb-collapse(?!\S)/g, '').trim(); // remove class
                            }
                        }
                    }
                    else {
                        if ((element.tagName.toLowerCase() == 'h1') || (element.tagName.toLowerCase() == 'h2') || (element.tagName.toLowerCase() == 'h3')) {
                            var level = parseInt(element.tagName.substr(1));
                            if (level <= targetLevel) {
                                break;
                            }
                            else {
                                if (collapse) {
                                    element.className += (' fb-display-none-h' + targetLevel);
                                }
                                else {
                                    //$('#' + element.id).removeClass('fb-display-none-h' + targetLevel);
                                    var input = 'fb-display-none-h' + targetLevel;
                                    var re = new RegExp(input, "g");
                                    element.className = element.className.replace(re, '').trim(); // remove class
                                }
                            }
                        }
                        else {
                            if (collapse) {
                                element.className += (' fb-display-none-h' + targetLevel);
                            }
                            else {
                                //$('#' + element.id).removeClass('fb-display-none-h' + targetLevel);
                                var input = 'fb-display-none-h' + targetLevel;
                                var re = new RegExp(input, "g");
                                element.className = element.className.replace(re, '').trim(); // remove class
                            }
                        }
                    }
                }
            }
        }

        function createIcon(id, top, left, text) {
            //text = typeof text !== 'undefined' ? text : '&#8863'; // default parameter

            var icon = document.createElement('div');
            icon.className = 'fb_tinymce_left_column_icon';
            icon.id = id;
            icon.innerHTML = text;
            icon.style.position = 'absolute';
            icon.style.top = top + 'px';
            icon.style.left = left + 'px';
            //icon.style.width = '8px';
            //icon.style.height = '8px';
            //icon.style.backgroundColor = '#ff0000';

            editor.getBody().appendChild(icon);
        }

        function createMergeIcon(id, top, left, text, mcase, title) {
            //text = typeof text !== 'undefined' ? text : '&#8863'; // default parameter

            var icon = document.createElement('div');
            icon.className = 'fb_tinymce_left_column_icon';
            icon.id = id;
            icon['data-mcase'] = mcase;
            icon.title = title; 
            icon.innerHTML = text;
            icon.style.position = 'absolute';
            icon.style.top = top + 'px';
            icon.style.left = left + 'px';
            icon.style.fontSize = '150%';

            //icon.style.paddingLeft = '9px';
            //icon.style.paddingRight = '9px';

            icon.style.border = 'solid';
            icon.style.borderWidth = '1px';
            icon.style.borderColor = 'grey';
            icon.style.borderRadius = '18px';

            icon.style.width = '36px';
            icon.style.textAlign = 'center';
            //icon.style.height = '8px';
            icon.style.backgroundColor = '#dedede';
            icon.style.opacity = 0.3;

            editor.getBody().appendChild(icon);
        }

        function createDraggableIcon(id, top, left, text, title) {
            var icon = document.createElement('div');
            icon.className = 'fb_tinymce_left_column_icon';
            icon.id = id;
            icon.title = title;
            icon.innerHTML = text;
            icon.style.position = 'absolute';
            icon.style.top = top + 'px';
            icon.style.left = left + 'px';
            icon.style.fontSize = '150%';

            //icon.style.paddingLeft = '9px';
            //icon.style.paddingRight = '9px';

            icon.style.width = '36px';
            icon.style.textAlign = 'center';
            //icon.style.height = '8px';
            //icon.style.backgroundColor = '#dedede';
            icon.style.opacity = 0.3;

            icon.contentEditable = false;
            icon.draggable = true;

            editor.getBody().appendChild(icon);

        }
    });
});
