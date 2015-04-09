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
    //var _dragged_item_id = -1;
    var _dragged_item_copy = null;

    var _select_content = null;

    var _TOC_ID = "table_of_content";

    tinymce.PluginManager.add('fb_folding_editor', function (editor, url) {

        // events
        editor.on('init', function () {
            $(editor.getBody()).css('margin-left', 50); // for all editors

            if (editor.id.indexOf("fb-merge-mce") >= 0) {
            }

            if (editor.id.indexOf("fb-source-mce") >= 0) {
                //$(editor.getBody()).css('margin-left', 50);
                $(editor.getBody()).css('margin-right', 100);
                /*
                $(editor.getDoc()).find('.mce-toolbar-grp').each(function () {
                    $(this).css('display', 'none');
                })
                */
            }

            if (editor.id.indexOf("fb-old-source-mce") >= 0) {
                //$(editor.getBody()).css('margin-left', 50);
                $(editor.getBody()).css('margin-right', 100);
            }

            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                // when the derived mce is inited; we can load the source mce
                //var callback = flexibook.deriveMceInitCallback;
                //if (callback) callback();

                //$(editor.getBody()).css('margin-left', 50);
                $(editor.getBody()).css('margin-right', 100);
            }

            if (editor.id.indexOf("fb-invisible-editor") >= 0) {
                // when the derived mce is inited; we can load the source mce
                var callback = flexibook.deriveMceInitCallback;
                if (callback) callback();
            }

            update();
        });

        editor.on('SetContent', function () {
            console.log('on set content');
            update();
        });

        editor.on('change', function (e) {
            console.log('on change');
            //setupDerivedElementID();

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
        });

        editor.on('copy', function (e) {
            onCutOrCopy(e);
        });

        editor.on('keydown', function (e) {
            if (editor.id.indexOf("fb-derived-mce") < 0) return; // only for derived editor

            console.log('........................................................');
            console.log('on key down');

            flexibook.postpone_update = true;

            // backspace key
            if (e.keyCode == 8) {
                //flexibook.postpone_update = true;
                //console.log('backspace key down');
            }
                // enter key
            else if (e.keyCode == 13) {
                //onEnterKeyDown(e);
            }
                // delete key
            else if (e.keyCode == 46) {
                //flexibook.postpone_update = true;
                //console.log('delete key down');
            }

        });

        editor.on('keyup', function (e) {
            if (editor.id.indexOf("fb-derived-mce") < 0) return; // only for derived editor

            console.log('on key up');

            flexibook.postpone_update = false;

            //update();

            // backspace key
            if (e.keyCode == 8) {
                //console.log('backspace key up');
                //update();
            }
                // delete key
            else if (e.keyCode == 46) {
                //console.log('delete key up');
                //update();
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
            //update(); // use update function will setup icon events twice
            resetIcons();
            onMouseUp(e);
            setupIconEvents();
            drawLines();
            drawLinesMergeElements();
        });

        // add custom buttons
        editor.addButton('fb_custom_button_table_of_content', {
            title: 'Update Table of Content',
            icon: 'icon dashicons-media-spreadsheet',
            onclick: function () {
                console.log('Test button on click');

                updateTableOfContent();
            }
        });

        //---------------------------------------------------------------------
        /*
            <div>
              <p>Chapter One</p>
              <ul>
                  <li>Section One</li>
                  <li>Section Two </li>
                  <li>Section Three </li>
              </ul>
              <p>Chapter Two</p>
              <ul>
                  <li>Section Four</li>
                  <li>Section Five</li>
                  <li>Section Six</li>
              </ul>
            </div>
        */
        function updateTableOfContent() {
            // firstly remove the toc if it already exists
            $(editor.getBody()).find('.toc').remove();

            $(editor.getBody()).prepend('<div id="' + _TOC_ID + '" class="toc"></div>');
            toc = editor.getDoc().getElementById(_TOC_ID);

            var ul = null;

            $(editor.getBody()).children().each(function (index) {
                var element = $(this);
                if (isAdminElementjQuery(element)) return true; // continue

                if (element.hasClass("main-heading-1") == true) {
                    $(toc).append('<p class="toc-main-heading-1">' + element.html() + '</p>');
                    ul = $(toc).append('<ul></ul>');
                }

                if (element.hasClass("main-heading-2") == true) {
                    if (ul != null) {
                        ul.append('<li class="toc-main-heading-2">' + element.html() + '</li>');
                    }
                }
            });

            var callback = flexibook.tableOfContentCallback;
            if (callback) callback(editor.id);
        }

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

            //-----------------------------------------------------------------------------------------------
            // edit icons
            // 1. quick delete paragraph - derived editor only 
            // 2. drag and drop paragraphs

            if (editor.id.indexOf("fb-derived-mce") >= 0 ||
                editor.id.indexOf("fb-source-mce") >= 0) {
                if (!$(node).attr('data-merge-case')) {
                    var offset = $(node).offset(); // absolute position relative to the document
                    var height = $(node).height();
                    var top = offset.top - 22 + height / 2;
                    var width = $(editor.getBody()).width();

                    var moveIconID = 'move-' + $(node).attr('id');
                    var draggable = true;
                    if (editor.id.indexOf("fb-source-mce") >= 0) {
                        createEditIcon(moveIconID, top, width + 60, '&#9776', 'Drag and drop this item to derive document', draggable);
                    }
                    else if (editor.id.indexOf("fb-derived-mce") >= 0) {
                        createEditIcon(moveIconID, top, width + 105, '&#9776', 'Move this item', draggable);
                    }

                    if (editor.id.indexOf("fb-derived-mce") >= 0) {
                        var deleteIconID = 'qdel-' + $(node).attr('id');
                        createEditIcon(deleteIconID, top, width + 60, '&#10005', 'Delete this item', false);
                    }
                }
            }

            //-----------------------------------------------------------------------------------------------
            // merge icons
            /*
            if ($(node).attr('data-merge-case') && $(node).attr('data-merge-case') > 0) {
                var mcase = $(node).attr('data-merge-case');
                // setup merge icon

                var offset = $(node).offset(); // absolute position relative to the document
                var height = $(node).height();
                var top = offset.top - 22 + height / 2;
                var width = $(editor.getBody()).width();

                if (mcase == 1) {
                    var yesIconID = 'myes-' + $(node).attr('id');
                    var noIconID = 'mnon-' + $(node).attr('id');

                    createMergeIcon(yesIconID, top, width + 50, '&#10003', mcase, "Accept the change in source document");
                    createMergeIcon(noIconID, top, width + 100, '&#10007', mcase, "Ignore the change in source document");
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
                    var yesIconID = 'myes-' + $(node).attr('id');
                    var noIconID = 'mnon-' + $(node).attr('id');

                    createMergeIcon(yesIconID, top, width + 50, '&#10003', mcase, "Accept this new paragraph");
                    createMergeIcon(noIconID, top, width + 100, '&#10007', mcase, "Ignore this new paragraph");
                }
                else if (mcase == 6) {
                    var yesIconID = 'myes-' + $(node).attr('id');
                    var noIconID = 'mnon-' + $(node).attr('id');

                    createMergeIcon(yesIconID, top, width + 50, '&#10003', mcase, "Accept the deletion in source document");
                    createMergeIcon(noIconID, top, width + 100, '&#10007', mcase, "Ignore the deletion in source document");
                }
            }
            */
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
            setupDerivedElementID(); // ms

            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                var callback = flexibook.deriveUpdateCallback;
                if (callback) callback();
            }

            // setup drag event for derive elements
            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                $(editor.getBody()).children().on('dragenter', function () {
                    if (_dragging == false) return;

                    var item = $(this);
                    if (item.attr('id') == flexibook.dragged_item_id) return;

                    $(editor.getBody()).find('.fb_tinymce_dragging').remove();

                    if (item.hasClass("fb_tinymce_left_column") == false && item.hasClass("fb_tinymce_left_column_icon") == false && item.hasClass("fb_tinymce_dragging") == false) {                                                                     
                        var clone = $(_dragged_item_copy).clone();
                        $(clone).addClass('fb_tinymce_dragging');
                        $(clone).css('opacity', 0.5);

                        $(clone).insertAfter(item);
                        console.log("mouse enter: " + item.attr('id'));
                    }
                });
            }

            resetIcons();
            setupIconEvents();
            drawLines();
            drawLinesMergeElements();
        }

        function resetIcons() {
            $(editor.getBody()).find('.fb_tinymce_left_column').remove();
            /*
            var left_column = document.createElement('div');
            left_column.style.position = 'absolute';
            left_column.style.top = 0;
            left_column.style.left = 0;
            left_column.style.width = '12px';
            left_column.style.zIndex = -2;

            //var body_height = $(editor.getBody()).height();
            //left_column.style.height = body_height + 'px';
            left_column.style.height = '100%';
            left_column.style.backgroundColor = '#e8e8e8';
            left_column.className = 'fb_tinymce_left_column';
            editor.getBody().appendChild(left_column);
            */

            // add svg element
            $(editor.getBody()).find('.fb_tinymce_left_column_svg').remove();
            var id = editor.id + '-svg';
            //$(editor.getBody()).append('<svg id="' + id + '" class="fb_tinymce_left_column_svg" style="position:absolute; top:0px; left:0px; height: 100%; width: 50px; z-index: -1;" xmlns="http://www.w3.org/2000/svg"/></svg>');
            $(editor.getBody()).append('<svg id="' + id + '" class="fb_tinymce_left_column_svg" style="position:absolute; top:0px; left:0px; height: 100%; width: 100%; z-index: -1;" xmlns="http://www.w3.org/2000/svg"/></svg>'); // ms - test

            // reset icons
            $(editor.getBody()).find('.fb_tinymce_left_column_icon').remove(); // clear all existing icons
            $(editor.getBody()).find('h1, h2, h3').each(function (index) {
                var foldingIconID = 'fold-' + $(this).attr('id');
                var pushIconID = 'push-' + $(this).attr('id');
                var offset = $(this).offset(); // absolute position relative to the document
                //var height = $(this).height();
                var classes = $(this).attr('class');
                var tagName = $(this).prop("tagName").toLowerCase();

                if (classes && classes.indexOf("fb-display-none") >= 0) {
                    //var test = 1;
                }
                else if (classes && classes.indexOf("fb-collapse") >= 0) {
                    if (tagName == 'h1') {
                        createIcon(foldingIconID, offset.top, -1, '&#8862', '150%'); // folding icon: plus 
                    }
                    else if (tagName == 'h2') {
                        createIcon(foldingIconID, offset.top, 10, '&#8862', '120%'); // folding icon: plus 
                    }

                    if (editor.id.indexOf("fb-source-mce") >= 0) {
                        if (tagName == 'h1') {
                            createIcon(pushIconID, offset.top, 22, '&#9655', '150%');
                        }
                        else if (tagName == 'h2') {
                            createIcon(pushIconID, offset.top, 30, '&#9655', '120%');
                        }                     
                    }
                }
                else {
                    if (tagName == 'h1') {
                        createIcon(foldingIconID, offset.top, -1, '&#8863', '150%'); // folding icon: minus 
                    }
                    else if (tagName == 'h2') {
                        createIcon(foldingIconID, offset.top, 10, '&#8863', '120%'); // folding icon: minus 
                    }
             
                    if (editor.id.indexOf("fb-source-mce") >= 0) {
                        if (tagName == 'h1') {
                            createIcon(pushIconID, offset.top, 22, '&#9655', '150%');
                        }
                        else if (tagName == 'h2') {
                            createIcon(pushIconID, offset.top, 30, '&#9655', '120%');
                        }
                    }
                }
            });

            //-----------------------------------------------------------------------------------------------
            // merge icons
            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                $(editor.getBody()).children().each(function (index) {
                    var node = $(this);
                    var classes = node.attr('class');
                    if (classes && classes.indexOf("fb-display-none") >= 0) return true; // continue

                    if (node.attr('data-merge-case') && node.attr('data-merge-case') > 0) {
                        var mcase = node.attr('data-merge-case');
                        // setup merge icon

                        var offset = node.offset(); // absolute position relative to the document
                        var height = node.height();
                        var top = offset.top - 22 + height / 2;
                        var width = $(editor.getBody()).width();

                        if (mcase == 1) {
                            var yesIconID = 'myes-' + node.attr('id');
                            var noIconID = 'mnon-' + node.attr('id');

                            createMergeIcon(yesIconID, top, width + 60, '&#10003', mcase, "Accept the change in source document");
                            createMergeIcon(noIconID, top, width + 105, '&#10007', mcase, "Ignore the change in source document");
                        }
                        else if (mcase == 3) {
                            var moreIconID = 'more-' + node.attr('id');
                            var mlesIconID = 'mles-' + node.attr('id');
                            var yesIconID = 'myes-' + node.attr('id');
                            var textID = 'mtxt-' + node.attr('id');
                            /*
                            if (flexibook.columns_of_editors == 2) {
                                createMergeIcon(moreIconID, top, width + 60, 'III', mcase, "Show previous source (three-column view)");
                            }
                            else if (flexibook.columns_of_editors == 3) {
                                createMergeIcon(mlesIconID, top, width + 60, 'II', mcase, "Hide previous source (two-column view)");
                            }
                            */

                            createMergeIcon(yesIconID, top, width + 60, '&#10003', mcase, "Accept this option");
                            //createMergeText(textID, offset.top, 'OPTION', mcase);
                        }
                        else if (mcase == 5) {
                            var yesIconID = 'myes-' + node.attr('id');
                            var noIconID = 'mnon-' + node.attr('id');

                            createMergeIcon(yesIconID, top, width + 60, '&#10003', mcase, "Accept this new paragraph");
                            createMergeIcon(noIconID, top, width + 105, '&#10007', mcase, "Ignore this new paragraph");
                        }
                        else if (mcase == 6) {
                            var yesIconID = 'myes-' + node.attr('id');
                            var noIconID = 'mnon-' + node.attr('id');

                            createMergeIcon(yesIconID, top, width + 60, '&#10003', mcase, "Accept the deletion in source document");
                            createMergeIcon(noIconID, top, width + 105, '&#10007', mcase, "Ignore the deletion in source document");
                        }
                    }
                });
            }

            on_icon_hover = false;
        }

        function setupIconEvents() {
            $(editor.getBody()).find('.fb_tinymce_left_column_icon').each(function () {
                var this_icon = $(this);

                // move icon
                if (this_icon.html().charCodeAt() == '9776') {
                    var id = this_icon.attr('id');
                    setupDraggableIconEvents(id);
                }
            });

            $(editor.getBody()).find('.fb_tinymce_left_column_icon').hover(
                // handlerIn
                function () {
                    var this_icon = $(this);
                    var targetID = this_icon.attr('id').substr(5);
                    if (targetID == null) return;

                    this_icon.css('cursor', 'pointer');
                    on_icon_hover = true;

                    if (this_icon.html().charCodeAt() == '8863' || this_icon.html().charCodeAt() == '8862') {
                        sectionHighlight(targetID, true);
                    }

                    if (isMergeIcons(this_icon) || isEditIcons(this_icon)) {
                    //if (isMergeIcons(this_icon)) {
                        this_icon.css('opacity', 1);
                    }
                    /*
                    if (isMergeIcons(this_icon)) {
                        this_icon.css('border-color', 'grey');
                        this_icon.css('background-color', '#dedede');
                    }
                    */
                },
                // handlerOut
                function () {
                    var this_icon = $(this);
                    var targetID = this_icon.attr('id').substr(5);
                    if (targetID == null) return;

                    this_icon.css('cursor', 'text');
                    on_icon_hover = false;

                    if (this_icon.html().charCodeAt() == '8863' || this_icon.html().charCodeAt() == '8862') {
                        sectionHighlight(targetID, false);
                    }

                    if (isMergeIcons(this_icon) || isEditIcons(this_icon)) {
                    //if (isMergeIcons(this_icon)) {
                        this_icon.css('opacity', 0.3);
                    }
                    /*
                    if (isMergeIcons(this_icon)) {
                        this_icon.css('border-color', 'white');
                        this_icon.css('background-color', 'white');
                    }
                    */
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
                    // click the delete button: delete this item
                else if (this_icon.html().charCodeAt() == '10005') {
                    var targetElement = editor.getDoc().getElementById(targetID);
                    $(targetElement).remove();
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
                        case "5":
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
                        /*
                        case "5":
                            var post_id = editor.post_id;
                            var source_item_id = this_icon.attr('id').substr(5);
                            var derive_item_id = null;

                            var callback = flexibook.mergeIconClickCallback;
                            if (callback) callback(this_icon.html().charCodeAt(), post_id, source_item_id, derive_item_id, mcase);

                            break;
                        */
                    }
                }

                update();
            });
        }

        function setupDraggableIconEvents(icon_id) {
            var icon = editor.getDoc().getElementById(icon_id);
            /*
            $(icon).hover(
                // handlerIn
                function () {
                    var this_icon = $(this);
                    this_icon.css('cursor', 'pointer');
                    this_icon.css('opacity', 1);
                },
                // handlerOut
                function () {
                    var this_icon = $(this);
                    this_icon.css('opacity', 0.3);
                }
            );
            */
            icon.addEventListener('dragstart', function (event) {
                _dragging = true;

                var targetID = icon.id.substr(5);
                if (targetID == null) return;

                $(this).css('opacity', 0); // hide the drag icon
                var deleteIconID = 'qdel-' + targetID;
                var delete_icon = editor.getDoc().getElementById(deleteIconID);
                $(delete_icon).css('opacity', 0); // hide the delete icon

                flexibook.dragged_item_id = targetID;
                var dragged_item = editor.getDoc().getElementById(flexibook.dragged_item_id);
                _dragged_item_copy = $(dragged_item).clone();

                if (editor.id.indexOf("fb-derived-mce") >= 0) {
                    $(dragged_item).addClass('fb_tinymce_dragging');
                    $(dragged_item).css('opacity', 0.5);
                }
                else if (editor.id.indexOf("fb-source-mce") >= 0) {
                    var post_id = editor.post_id;
                    $(_dragged_item_copy).attr("data-source-post-id", post_id);
                }
                //console.log('dragstart');
            });

            /*
            icon.addEventListener('drag', function (event) {
                $(editor.getBody()).css('cursor', 'crosshair');
            });
            */

            icon.addEventListener('dragend', function (event) {
                _dragging = false;

                if (editor.id.indexOf("fb-derived-mce") >= 0) {
                    var dragged_item = editor.getDoc().getElementById(flexibook.dragged_item_id);
                    $(dragged_item).removeClass('fb_tinymce_dragging');
                    $(dragged_item).css('opacity', 1);
                }
                else if (editor.id.indexOf("fb-source-mce") >= 0) {
                    var callback = flexibook.onDragEndCallback;
                    if (callback) callback();

                    setupDerivedElementID();
                }
                //console.log('dragend');
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

        function isEditIcons(this_icon) {
            if (this_icon.html().charCodeAt() == '9776' || 
               (this_icon.html().charCodeAt() == '10005')) {
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
                    if (isAdminElement(element)) continue;

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

            //var derived_mce = tinymce.get('fb-derived-mce');
            if (flexibook.active_derive_mce) {
                var derived_mce = flexibook.active_derive_mce;
                if (derived_mce) {
                    derived_mce.insertContent(content); // inserts content at cursor position
                }
            }
        }

        function isAdminElement(element) {
            return isAdminElementjQuery($(element));
        }

        function isAdminElementjQuery(element) {
            if (element.prop("tagName").toLowerCase() == 'svg') return true;
            if (element.hasClass("fb_tinymce_left_column") == true ||
                element.hasClass("fb_tinymce_left_column_icon") == true ||
                element.hasClass("fb_tinymce_left_column_svg") == true) return true;
            //if (element.tagName == 'svg') return true;
            //if (element.className.indexOf("fb_tinymce_left_column") >= 0) return true;
            return false;
        }

        function drawLinesMergeElements() {
            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                $(editor.getBody()).children().each(function (index) {
                    var node = $(this);
                    var id = node.attr('id');
                    var classes = node.attr('class');
                    if (classes && classes.indexOf("fb-display-none") >= 0) return true; // continue

                    if (node.attr('data-merge-case') && node.attr('data-merge-case') > 0) {
                        var mcase = node.attr('data-merge-case');

                        var offset = node.offset(); // absolute position relative to the document
                        var height = node.height();
                        var top = offset.top;
                        var width = $(editor.getBody()).width();

                        if (mcase == 3) {
                            if (id.indexOf('-option2') < 0) {
                                var op2 = editor.getDoc().getElementById(id + '-option2');
                                var op2_offset = $(op2).offset(); // absolute position relative to the document
                                var op2_height = $(op2).height();

                                // note: option 2 on top of option 1
                                var x1 = width + 53; // why 53? - because the body have margin-left = 50
                                var y1 = op2_offset.top;
                                var x2 = width + 53;
                                var y2 = offset.top + height;

                                var color = 'orange';
                                var svg_id = editor.id + '-svg';
                                var svg = editor.getDoc().getElementById(svg_id);

                                var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                                line.setAttribute('x1', x1);
                                line.setAttribute('y1', y1);
                                line.setAttribute('x2', x2);
                                line.setAttribute('y2', y2);
                                line.setAttribute('stroke', color);
                                line.setAttribute('stroke-width', 4);
                                //line.style.zIndex = 1;
                                if (svg) svg.appendChild(line);
                            }
                        }
                        else {
                            var x1 = width + 53; 
                            var y1 = offset.top;
                            var x2 = width + 53;
                            var y2 = offset.top + height;

                            var color = 'orange';
                            var svg_id = editor.id + '-svg';
                            var svg = editor.getDoc().getElementById(svg_id);

                            var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                            line.setAttribute('x1', x1);
                            line.setAttribute('y1', y1);
                            line.setAttribute('x2', x2);
                            line.setAttribute('y2', y2);
                            line.setAttribute('stroke', color);
                            line.setAttribute('stroke-width', 2);
                            //line.style.zIndex = 1;
                            if (svg) svg.appendChild(line);
                        }
                    }
                });
            }
        }

        function drawLines() {         
            $(editor.getBody()).find('.fb_tinymce_left_column_icon').each(function () {
                var this_icon = $(this);
                // for each minus icon: draw line 
                if (this_icon.html().charCodeAt() == '8863') {
                    var targetID = this_icon.attr('id').substr(5);
                    if (targetID == null) return true; // continue
                    var targetElement = editor.getDoc().getElementById(targetID);
                    if (!targetElement) return true; // continue
                    var tagName = $(targetElement).prop("tagName").toLowerCase();

                    var children = $(editor.getBody()).children();
                    if (children == null || children.length <= 0) return true; // continue

                    var start = false;
                    var targetLevel = 10000;
                    var lastElement;

                    // get the last element of the section
                    for (var i = 0; i < children.length; i++) {
                        var element = children[i];
                        if (isAdminElement(element)) continue;

                        if (start == false) {
                            if (element.id == targetID) {
                                start = true;
                                targetLevel = parseInt(element.tagName.substr(1));
                            }
                        }
                        else {
                            if ((element.tagName.toLowerCase() == 'h1') || (element.tagName.toLowerCase() == 'h2') || (element.tagName.toLowerCase() == 'h3')) {
                                var level = parseInt(element.tagName.substr(1));
                                if (level <= targetLevel) {
                                    break;
                                }
                                else {
                                    lastElement = element;
                                }
                            }
                            else {
                                lastElement = element;
                            }
                        }
                    }

                    if (!lastElement) return true; // continue

                    var t_offset = this_icon.offset(); // absolute position relative to the document
                    var b_offset = $(lastElement).offset(); // absolute position relative to the document

                    var x1 = t_offset.left + this_icon.width() / 2;
                    var y1 = t_offset.top + this_icon.height() / 2;
                    var x2 = x1;
                    var y2 = b_offset.top + $(lastElement).height();

                    y1 += 7; // test
                    if (tagName == 'h2') {
                        y2 -= 3;
                    }

                    var color = 'grey';
                    var svg_id = editor.id + '-svg';
                    var svg = editor.getDoc().getElementById(svg_id);

                    // line for events
                    var eline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    eline.setAttribute('x1', x1);
                    eline.setAttribute('y1', y1);
                    eline.setAttribute('x2', x2);
                    eline.setAttribute('y2', y2);
                    eline.setAttribute('stroke', 'white'); // should be invisible
                    eline.setAttribute('stroke-width', 7);
                    //eline.style.zIndex = -1;
                    //line.style.padding = '2px';
                    $(eline).hover(function () {
                        $(eline).css("cursor", "default");
                        //console.log('..............line hover..............');
                        sectionHighlight(targetID, true);
                    }, function () {
                        sectionHighlight(targetID, false);
                    });                                       
                    if (svg) svg.appendChild(eline);

                    // line for visualization
                    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', x1);
                    line.setAttribute('y1', y1);
                    line.setAttribute('x2', x2);
                    line.setAttribute('y2', y2);
                    line.setAttribute('stroke', color);
                    line.setAttribute('stroke-width', 1);
                    //line.style.zIndex = 1;
                    if (svg) svg.appendChild(line);

                    // short horizontal line in the end of the section
                    var hline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    hline.setAttribute('x1', x2);
                    hline.setAttribute('y1', y2);
                    hline.setAttribute('x2', x2 + 5);
                    hline.setAttribute('y2', y2);
                    hline.setAttribute('stroke', color);
                    hline.setAttribute('stroke-width', 1);
                    if (svg) svg.appendChild(hline);
                }

                
            });
        }

        function sectionHighlight(id, on) {
            var start = false;
            var targetLevel = 10000;
            var children = $(editor.getBody()).children();
            if (children != null && children.length > 0) {
                for (var i = 0; i < children.length; i++) {
                    var element = children[i];
                    if (isAdminElement(element)) continue;

                    if (start == false) {
                        if (element.id == id) {
                            start = true;
                            targetLevel = parseInt(element.tagName.substr(1));

                            if (on) {
                                $(element).addClass('fb-section-highlight');
                            }
                            else {
                                $(element).removeClass('fb-section-highlight');
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
                                if (on) {
                                    $(element).addClass('fb-section-highlight');
                                }
                                else {
                                    $(element).removeClass('fb-section-highlight');
                                }
                            }
                        }
                        else {
                            if (on) {
                                $(element).addClass('fb-section-highlight');
                            }
                            else {
                                $(element).removeClass('fb-section-highlight');
                            }
                        }
                    }
                }
            }

        }

        function collapseOrExpand(targetID, collapse) {
            var start = false;
            var targetLevel = 10000;
            var children = $(editor.getBody()).children();
            if (children != null && children.length > 0) {
                for (var i = 0; i < children.length; i++) {
                    var element = children[i];
                    if (isAdminElement(element)) continue;

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

        function createIcon(id, top, left, text, fontsize) {
            //text = typeof text !== 'undefined' ? text : '&#8863'; // default parameter

            var icon = document.createElement('div');
            icon.className = 'fb_tinymce_left_column_icon';
            icon.id = id;
            icon.innerHTML = text;
            icon.style.position = 'absolute';
            icon.style.top = top + 'px';
            icon.style.left = left + 'px';
            icon.style.fontSize = fontsize;
            //icon.style.width = '8px';
            //icon.style.height = '8px';
            //icon.style.backgroundColor = '#ffffff';

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
            //icon.style.borderColor = 'white';
            icon.style.borderRadius = '18px';

            icon.style.width = '36px';
            icon.style.textAlign = 'center';
            //icon.style.height = '8px';
            icon.style.backgroundColor = '#dedede';
            //icon.style.backgroundColor = '#ffffff';
            icon.style.opacity = 0.3;

            editor.getBody().appendChild(icon);
        }

        function createMergeText(id, top, text, mcase) {
            var t = document.createElement('div');
            t.className = 'fb_tinymce_left_column';
            t.id = id;
            t['data-mcase'] = mcase;
            t.innerHTML = text;
            t.style.position = 'absolute';
            t.style.top = top + 'px';
            t.style.left = '50px';

            editor.getBody().appendChild(t);
        }

        function createEditIcon(id, top, left, text, title, draggable) {
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
            if (draggable) icon.draggable = true;

            editor.getBody().appendChild(icon);
        }
    });
});
