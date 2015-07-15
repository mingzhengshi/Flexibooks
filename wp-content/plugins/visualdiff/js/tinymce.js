//----------------------------------------------------------------------------------------
// Plugin for tinymce editor in wordpress
//
// 
//
//
//----------------------------------------------------------------------------------------

jQuery(document).ready(function ($) {
    // global variables
    var FB_LEVEL_1_POST = 'source';
    var FB_LEVEL_2_POST = 'master';
    var FB_LEVEL_3_POST = 'derived';
    var fb_post_type = null;

    var FB_DATA_LEVEL1_MERGE_CASE = 'data-source-merge-case';
    var FB_DATA_LEVEL2_MERGE_CASE = 'data-master-merge-case';
    var fb_data_merge_case = null;

    var FB_DATA_LEVEL1_POST_ID = 'data-source-post-id';
    var FB_DATA_LEVEL2_POST_ID = 'data-master-post-id';
    var fb_data_post_id = null;

    var FB_DATA_LEVEL1_ELEMENT_ID = 'data-source-element-id';
    var FB_DATA_LEVEL2_ELEMENT_ID = 'data-master-element-id';
    var fb_data_element_id = null;

    // record the latest copy event
    var copied_from_editor_id = "";
    var copied_content = "";
    var copied_node = null;
    var copied_mode = "";

    var fb_on_icon_hover = false;
    var fb_dragging = false;
    var fb_dragged_item_copy = null;
    var fb_screen_dpi = -1;
    var FB_TOC_ID = "table_of_content";

    var fb_all_custom_style_classes = 'main-heading-1 main-heading-2 activity c-head-sm d-head-sm';
    fb_all_custom_style_classes += ' bodytext bodytextHI body-text-italic';
    fb_all_custom_style_classes += ' exercise assessed diagram diagram2 question-sm';
    fb_all_custom_style_classes += ' subtitle title';
    fb_all_custom_style_classes += ' TNAnswers-Hide TNAnswers-Show';

    // performance 
    var fb_performance_global_time_step = null;

    tinymce.PluginManager.add('fb_folding_editor', function (editor, url) {
        // public members of the fb_folding_editor object
        this.updatePublic = updatePublic; 
        this.updateMasterTOC = updateMasterTableOfContent; 
        this.setupPostType = setupPostType; 
        this.approveAll = approveAllMerges; 
        this.switchEditorCSS = switchStyleSheets; 

        // private members
        var page_boundary_on = false;
        var page_boundary_on_body_background_color = '#ebebeb';
        var on_mouse_up = false;
        var mouse_wheel_timer = null;
        var performance_previous_scroll_top = null;

        //----------------------------------------------------------------------------------------
        // Events
        //----------------------------------------------------------------------------------------

        ////
        // On init of the tinymce editor 
        //
        editor.on('init', function () {
            if ((editor.id.indexOf("fb-derived-mce") >= 0) || (editor.id.indexOf("fb-source-mce") >= 0)) {
                // The Element.scrollTop property gets or sets the number of pixels that the content of an element is scrolled upward
                $(editor.getBody()).on('mousewheel', function (e) {
                    var w = $(this).get(0);
                    var delta = e.originalEvent.wheelDelta;
                    var editor_height = editor.getContentAreaContainer().offsetHeight;
                    if (delta > 0 && w.scrollTop === 0) {
                        e.preventDefault();
                    }
                    else if (delta < 0 && w.scrollHeight - w.scrollTop === editor_height) {
                        e.preventDefault();
                    }

                    if (mouse_wheel_timer !== null) {
                        clearTimeout(mouse_wheel_timer);
                    }
                    mouse_wheel_timer = setTimeout(onMouseWheelEnd, 250);
                });

                $(editor.getDoc()).on("scrollstop", function () {
                    console.log("scrollstop: ");
                });
            }

            // test screen dpi
            $(editor.getBody()).append('<div id="div_dpi" class="dpi_test" style="width:1in;visible:hidden;padding:0px"></div>');
            fb_screen_dpi = editor.getDoc().getElementById('div_dpi').offsetWidth;
            $(editor.getDoc()).find('.dpi_test').remove();

            $(editor.getDoc()).css('overflow-y', 'scroll');
            $(editor.getBody()).css('margin-left', 50); // for all editors
            $(editor.getBody()).css('margin-right', 100); // for all editors

            if (editor.id.indexOf("fb-invisible-editor") >= 0) {
                // when the derived mce is inited; we can load the source mce
                var callback = flexibook.deriveMceInitCallback;
                if (callback) callback();
            }

            if (editor.id === 'content') {
                // level 1 document editor
                fb_post_type = FB_LEVEL_1_POST;
                fb_data_merge_case = 'data-temp-merge-case';
                fb_data_post_id = 'data-temp-post-id';
                fb_data_element_id = 'data-temp-element-id';
            }

            update();
        });

        // disable to improve performance
        /*
        editor.on('SetContent', function () {
            console.log('on set content');
            //update();
        });
        */

        ////
        // On the change of content within tinymce editor.
        // Update the views and controls in the editor
        //
        editor.on('change', function (e) {
            //console.log('on change');
            update('fb_on_change'); // disable to improve performance
        });

        ////
        // Fires before a execCommand call is made. 
        //
        editor.on('BeforeExecCommand', function (e) {
            if (e.command === 'mceToggleFormat') {
                //console.log('ExecCommand event: mceToggleFormat');

                // check the selected node 
                var node = editor.selection.getNode();
                if (!node) return;
                if (isAdminElement(node)) return;

                // by default, user can select one or more styles in the Format dropdown list for a html element.
                // clear all (selected) classes to ensure that only one style can be selected for each html element.
                $(node).removeClass(fb_all_custom_style_classes);
            }
        });

        editor.on('PostProcess', function (e) {
            //update('fb_on_post_process'); // disable to improve performance
        });

        ////
        // Fires when the focus is moved from one editor to another editor.
        //
        editor.on('activate', function (e) {
            update('fb_on_activate');
        });

        ////
        // This method is called when the editor gets focused, e.g., when the user places cursor in the content of the editor.
        //
        editor.on('focus', function (e) {
            update('fb_on_focus');
        });

        ////
        // Fire when content is cut in the editor
        //
        editor.on('cut', function (e) {
            onCutOrCopy(e);
        });

        ////
        // Fire when content is copied in the editor
        //
        editor.on('copy', function (e) {
            onCutOrCopy(e);
        });

        ////
        // Fire when keydown
        //
        editor.on('keydown', function (e) {
            if (editor.id.indexOf("fb-derived-mce") < 0) return; // only for derived editor

            // set the postpone update flag to true
            // postpone the update method while user is editing
            flexibook.postpone_update = true;
        });

        ////
        // Fire when keyup
        //
        editor.on('keyup', function (e) {
            if (editor.id.indexOf("fb-derived-mce") < 0) return; // only for derived editor

            // set the postpone update flag to false
            // the editor can be updated now
            flexibook.postpone_update = false;
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

        ////
        // Enables you to modify the pasted content before it gets inserted into the editor.
        //
        editor.on('PastePreProcess', function (e) {
            if (editor.id.indexOf("fb-derived-mce") < 0) return; // only for derived editor

            pastePreProcess(e);
        });

        ////
        // On mouse up
        //
        editor.on('mouseup', function (e) {
            if (fb_on_icon_hover) return;          

            // check the selected node 
            var node = editor.selection.getNode();
            if (!node) return;
            if (node.tagName.toLowerCase() === 'body') return; // do not consider the case when multiple paragraphs have been selected
            //if (editor.id.indexOf("fb-source-mce") < 0 && editor.id.indexOf("fb-derived-mce") < 0) return;

            var id = $(node).attr('id');
            while ((id === null) || (typeof id === 'undefined')) {
                if (!$(node).parent()[0]) { break; }
                node = $(node).parent()[0]; // only consider that case when one paragraph has been selected
                id = $(node).attr('id');
            }

            if (!id) return;
            if (node.tagName.toLowerCase() === 'body') return; // if the node is the body again, then return
            if (isAdminElement(node)) return;

            // if it passes all the conditions above:
            // set the on mouse up flag to true and update the editor. An mouse up event will be called within the update method.
            on_mouse_up = true;
            update('fb_on_mouse_up');
        });

        ////
        // Add a custom button in the editor toolbar to create and update the table of content of the document
        //
        editor.addButton('fb_custom_button_table_of_content', {
            title: 'Update Table of Content',
            icon: 'icon dashicons-media-spreadsheet',
            onclick: function () {
                //console.log('Test button on click');
                updateTableOfContent();
            }
        });

        ////
        // Add a custom button in the editor toolbar to toggle the page boundary in the editor
        //
        editor.addButton('fb_custom_button_page_boundary', {
            title: 'Toggle Page Boundary',
            icon: 'icon dashicons-tablet',
            onclick: function () {
                togglePageBoundary();
            }
        });

        ////
        // Add a custom button in the editor toolbar to create a new comment bubble
        //
        editor.addButton('fb_custom_button_comment_bubble', {
            title: 'New Comment',
            icon: 'icon dashicons-testimonial',
            onclick: function () {
                addComment();
            }
        });

        ////
        // Add a custom button in the editor toolbar to delete the selected comment bubble
        //
        editor.addButton('fb_custom_button_comment_delete', {
            title: 'Delete Comment',
            icon: 'icon dashicons-dismiss',
            onclick: function () {
                deleteComment();
            }
        });

        ////
        // Switch among different style sheets
        // This method will be called by derive.js
        //
        function switchStyleSheets(href) {
            if (!href) return;

            var link = document.createElement("link")
            link.className = "fb-tinymce-stylesheet";
            link.href = href;
            link.rel = "stylesheet";
            link.type = "text/css";
            $(editor.getDoc()).find('.fb-tinymce-stylesheet').remove();
            editor.getDoc().head.appendChild(link);
        }

        ////
        // Update the editor when mouse wheel end
        //
        function onMouseWheelEnd() {
            update('fb_on_mouse_wheel_end');
        }

        ////
        // delete the selected comment bubble
        //
        function deleteComment() {
            var node = editor.selection.getNode();
            if (!node) {
                alert('Please select a comment to delete.');
                return;
            }

            var id = $(node).attr('id');

            var count = 0;
            while (!id) {
                if (count > 10) break;
                if (!$(node).parent()[0]) break; 
                node = $(node).parent()[0]; 
                id = $(node).attr('id');
                count++;
            }

            if (!id) {
                alert('Please select a comment to delete.');
                return;
            }

            if ($(node).hasClass('fb-comment-bubble')) {
                $(editor.getBody()).find('.fb-comment-content').each(function (index) {
                    var selected_content = $(this);
                    if (selected_content.attr('data-comment-id') === id) {
                        selected_content.contents().unwrap();
                    }
                });

                $(editor.getBody()).find('#' + id + '-svg').remove(); // remove svg lines
                $(node).remove();
                update('fb_on_delete_comment');
            }
            else { 
                alert('Please select a comment to delete.');
                return;
            }
        }

        ////
        // Add an empty comment bubble
        //
        function addComment() {
            // add the comment bubbles without considering overlapping.
            // resolve overlapping after all comment bubbles have been added.

            var node = editor.selection.getNode();
            if (!node) return;
            if (node.tagName.toLowerCase() === 'body') { // do not consider the case when multiple paragraphs have been selected
                alert('Please select content within a paragraph.');
                return;
            }

            var content = editor.selection.getContent();
            /*
            if ((!content) || (content.trim().length === 0)) {
                alert('Please select some content.');
                return;
            }
            */
            if (!content) {
                alert('Please select some content.');
                return;
            }

            var body_width = $(editor.getBody()).width();
            var body_margin_left = parseInt($(editor.getBody()).css('margin-left'), 10);
            var bubble_left = body_width + body_margin_left + 10;
            var id = generateUUID();
            editor.selection.setContent("<span class='fb-comment fb-comment-content' data-comment-id='" + id + "'>" + content + "</span>");
            
            $(editor.getBody()).find('.fb-comment-content').each(function (index) {
                var selected_content = $(this);
                if (selected_content.attr('data-comment-id') === id) {
                    //$(this).addClass('fb-comments-selected');
                    var offset = selected_content.offset(); // absolute position relative to the document
                    var top = offset.top;
                    var left = offset.left;
                    
                    //var text = "<span class='fb-comment-bubble-dummy-text'>comment:</span>";
                    //var text = "<span class='fb-comment-bubble-dummy-text'></span>";
                    var text = "";
                    createCommentBubble(id, top, bubble_left, text);
                    drawCommentLine(id, left, top, bubble_left, top);
                    return false; // break;   
                }
            });
        }

        ////
        // Toggle page boundary on and off
        //
        function togglePageBoundary() {
            page_boundary_on = !page_boundary_on;
            updatePageBoundary();
            update('fb_on_toggle_page_boundary');
        }

        ////
        // Update page boundary
        //
        function updatePageBoundary() {
            $(editor.getBody()).find('.fb_tinymce_left_column_page').remove();

            //var body_margin_left = parseInt($(editor.getBody()).css('margin-left'), 10);
            //var body_margin_right = parseInt($(editor.getBody()).css('margin-right'), 10);
            //var body_margin_top = parseInt($(editor.getBody()).css('margin-top'), 10);

            var body_offset = $(editor.getBody()).offset();
            var body_width = $(editor.getBody()).width();
            var body_height = $(editor.getBody()).height();

            var page_height_in_pixel = fb_screen_dpi * 10.89; // 10.89 inch

            var total_page_height = 0;
            var page_count = 0;

            while (body_height > total_page_height) {
                // cm
                /*
                var page_id = 'page-boundary-' + page_count;
                createPageBoundary(page_id, total_page_height, body_offset.left - 10, body_width + 20, 29.7);
                var page = editor.getDoc().getElementById(page_id);
                var page_height = $(page).height();
                total_page_height += page_height;

                page_count++;
                */

                // pixels                
                createPageBoundary('page-boundary-' + page_count, page_count, total_page_height + 1, body_offset.left - 10, body_width + 20, page_height_in_pixel - 1);
                total_page_height += page_height_in_pixel;
                page_count++;
            }

            if (page_boundary_on) {
                $(editor.getBody()).css('background-color', page_boundary_on_body_background_color);
                $(editor.getBody()).find('.fb_tinymce_left_column_page').css('visibility', 'visible');
            }
            else {
                $(editor.getBody()).css('background-color', '#ffffff');
                $(editor.getBody()).find('.fb_tinymce_left_column_page').css('visibility', 'hidden');
            }
        }

        ////
        // This method is called by derived.js when a new editor has been created.
        // The plugin is used in all post types. This method set the fb_post_type variable so that the editor knows which post type it is working on.
        //
        function setupPostType(post_type) {
            fb_post_type = post_type;
            if (fb_post_type == FB_LEVEL_2_POST) {
                fb_data_merge_case = FB_DATA_LEVEL1_MERGE_CASE;
                fb_data_post_id = FB_DATA_LEVEL1_POST_ID;
                fb_data_element_id = FB_DATA_LEVEL1_ELEMENT_ID;
            }
            else if (fb_post_type == FB_LEVEL_3_POST) {
                fb_data_merge_case = FB_DATA_LEVEL2_MERGE_CASE;
                fb_data_post_id = FB_DATA_LEVEL2_POST_ID;
                fb_data_element_id = FB_DATA_LEVEL2_ELEMENT_ID;
            }
        }

        ////
        // This method is called by derived.js when the 'approve all' button is clicked outside the editor.
        // Approve all changes (or merge requests) in the derive document that are descended/cascaded from the source document
        //
        function approveAllMerges() {
            $(editor.getBody()).find('.fb_tinymce_left_column_icon').each(function () {
                var icon = $(this);
                if (icon.html().charCodeAt() == '10003') {
                    var mcase = icon.prop('data-mcase');
                    if (mcase != '3') {
                        iconOnClick(icon);
                    }
                }             
            });
        }

        ////
        // This method is called by derived.js when the 'update master table of content' button is clicked outside the editor.
        // The master table of content will be updated
        //      - the master table of content is in a separate tab.
        //      - the master table of content lists all units/tabs in the document
        //
        function updateMasterTableOfContent(title, post_names) {
            // firstly remove the toc if it already exists
            $(editor.getBody()).find('.toc-page').remove();

            $(editor.getBody()).prepend('<div id="table_of_content_page" class="toc-page"><div id="' + FB_TOC_ID + '" class="toc"></div></div>');
            toc = editor.getDoc().getElementById(FB_TOC_ID);

            //$(toc).prepend('<div class="toc-title">' + title + '</div>');
            $(toc).prepend('<div class="master-toc-title">Contents</div>');

            /*
            var height = $(toc).height();
            height = (1015 - height) / 2;
            $(toc).prepend('<div style="height:' + height + 'px"></div>'); // prepend a dummy div
            */

            if (!post_names) return;
            for (var i = 0; i < post_names.length; i++) {
                $(toc).append('<p class="master-toc-main-heading">' + post_names[i] + '</p>');
            }
        }

        ////
        // This method is fired when the 'update table of content' button within the editor is clicked.
        //      - you can create and update a table of content for each unit/tab in the document.
        function updateTableOfContent() {
            // firstly remove the toc if it already exists
            $(editor.getBody()).find('.toc-page').remove();

            $(editor.getBody()).prepend('<div id="table_of_content_page" class="toc-page"><div id="' + FB_TOC_ID + '" class="toc"></div></div>');
            toc = editor.getDoc().getElementById(FB_TOC_ID);

            updatePageBoundary();

            var ul = null;

            $(editor.getBody()).children().each(function (index) {
                var element = $(this);
                if (isAdminElementjQuery(element)) return true; // continue

                var page_number = -1;
                if ((element.hasClass("main-heading-1") === true) || (element.hasClass("main-heading-2") === true)) {
                    $(editor.getBody()).find('.fb_tinymce_left_column_page').each(function (index) {
                        var id1 = element.attr('id');
                        var id2 = $(this).attr('id');
                        if (isOverlap(id1, id2)) {
                            var page_count = $(this).prop('data-page-count');
                            //page_number = parseInt(id2.substr(id2.length - 1), 10);
                            page_number = page_count;
                            return false; // break 
                        }
                    });
                }

                if (!page_number || page_number < 0) return;
                page_number += 1; // page_number starts from 0;

                if (element.hasClass("main-heading-1") === true) {
                    var clone = element.clone();
                    $(clone).find('img').remove();
                    var inner = $(clone).html();
                    $(toc).append('<p class="toc-main-heading-1"><span class="toc-heading-span">' + $(clone).html() + '</span><span class="toc-page-number-span">' + page_number + '</span></p>');
                    ul = $('<ul class="toc-ul"></ul>');
                    $(toc).append(ul);
                }

                if (element.hasClass("main-heading-2") === true) {
                    if (ul != null) {
                        var clone = element.clone();
                        $(clone).find('img').remove();
                        var inner = $(clone).html();
                        ul.append('<li class="toc-main-heading-2"><span class="toc-heading-span">' + $(clone).html() + '</span><span class="toc-page-number-span">' + page_number + '</span></li>');
                    }
                }
            });

            //var post_name = editor.post_name;

            var callback = flexibook.tableOfContentCallback;
            if (callback) callback(editor.id);           
        }

        ////
        // Check if the bounding boxes of two html elements are overlapped. 
        //
        function isOverlap(id1, id2) {
            var r1 = editor.getDoc().getElementById(id1).getBoundingClientRect();
            var r2 = editor.getDoc().getElementById(id2).getBoundingClientRect();

            var overlap = !(r1.right < r2.left ||
                            r1.left > r2.right ||
                            r1.bottom < r2.top ||
                            r1.top > r2.bottom)

            return overlap;
        }

        ////
        // The mouse up event will be called in the 'update' method.
        //
        function onMouseUp() {
            console.log("tinymce mouse up event");

            // the selected node can be an insert or delete tags or other inline tags
            var node = editor.selection.getNode();

            if (!node) return;
            if (node.tagName.toLowerCase() === 'body') return; // do not consider the case when multiple paragraphs have been selected
            if (editor.id.indexOf("fb-source-mce") < 0 && editor.id.indexOf("fb-derived-mce") < 0) return;

            var id = $(node).attr('id');

            while ((id === null) || (typeof id === 'undefined')) {
                if (!$(node).parent()[0]) { break; }
                node = $(node).parent()[0]; // only consider that case when one paragraph has been selected
                id = $(node).attr('id');
            }

            if (!id) return;
            // a special case: toc
            if (id === FB_TOC_ID) {
                node = $(node).parent()[0]; 
                id = $(node).attr('id');
            }
            if (node.tagName.toLowerCase() === 'body') return; // if the node is the body again, then return
            if (isAdminElement(node)) return; 

            //-----------------------------------------------------------------------------------------------
            // edit icons
            // 1. quick delete paragraph - derived editor only 
            // 2. drag and drop paragraphs

            if (editor.id.indexOf("fb-derived-mce") >= 0 ||
                editor.id.indexOf("fb-source-mce") >= 0) {
                if (!$(node).attr(fb_data_merge_case)) {
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
        }

        ////
        // Fire when the enter key is up
        //
        function onEnterKeyUp(e) {
            var content = editor.selection.getContent();
            var node = editor.selection.getNode();
            //console.log(node);

            if (!node) return;

            // only consider derive document; assume source document is not editable
            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                // if no content has been selected
                if (isEmptyContent(content) == true) {
                    // only consider the paragraph that derives from the source document
                    if (!$(node).attr(fb_data_element_id)) {

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

        ////
        // Called when content in the editor has been cut or copied
        //
        function onCutOrCopy(e) {
            if (!editor.hasOwnProperty("post_id")) return;
            var post_id = editor.post_id;

            copied_from_editor_id = editor.id;
            copied_content = editor.selection.getContent();
            copied_node = null;

            if (copied_content == null || copied_content.length == 0) return;

            var copied_node = editor.selection.getNode(); // returns the currently selected element or the common ancestor element for both start and end of the selection
            if (!copied_node) return;

            if (editor.id.indexOf("fb-source-mce") >= 0 ||
                editor.id.indexOf("fb-derived-mce") >= 0) {
                // usually, multiple paragraphs or parts of multiple paragraphs have been selected
                if (copied_node.tagName.toLowerCase() == 'body') {
                    copied_mode = "multiple";
                    copied_node = null; // we don't need the node

                    var cont = "";
                    $(copied_content).each(function (index) {
                        var node = $(this).clone();
                        $(node).attr(fb_data_post_id, post_id);
                        cont += $(node).prop('outerHTML');
                    });
                    copied_content = cont;
                }
                    // one paragraphs or part of one paragraph has been selected
                else {
                    copied_mode = "single";
                    var node = $(copied_node).clone();
                    $(node).attr(fb_data_post_id, post_id);
                    $(node).html(copied_content);
                    copied_content = $(node).prop('outerHTML');
                }
            }
        }

        ////
        // Content may be pasted into the editor from external documents. this function only processes content copied from source or derived editors within wordpress.
        //
        function pastePreProcess(e) {
            if (e.content == null || e.content.length <= 0) return;

            // COPY: (assume that) all content copies from source or derived editors are html elements; 
            // CUT: single paragraph content cut from source or derived editors are NOT html elements;

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

                    if (copied_content && copied_content.length > 0) {
                        var copied_text = $(copied_content).html().trim();

                        // it is possible that the paste content comes from other sources such as word or notepad, etc.
                        if (paste_text == copied_text) {
                            e.content = copied_content;
                        }
                    }
                }
                else if (copied_mode == "multiple") {
                    var paste_text = "";

                    paste_text = e.content.trim();
                    var copied_text = copied_content.trim();

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

        ////
        // Check if the content is empty.
        //
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

        ////
        // Check if the text is html or not.
        //
        function isHTML(text) {
            var a = document.createElement('div');
            a.innerHTML = text;
            for (var c = a.childNodes, i = c.length; i--;) {
                if (c[i].nodeType == 1) return true;
            }
            return false;
        }

        ////
        // Debounce: grouping multiple events in one event.
        // Using debounce significantly increases the performance of the application.
        // If the update method is called multiple times within very short period, e.g., a few hundreds milliseconds, then fire the update method only once using debounce from underscore.js
        //
        var debounce_update = null; // debounce version of the update method
        //if (debounce_update === null) debounce_update = _.debounce(updatePublic, 300); // this function causes cursor jumping
        if (debounce_update === null) debounce_update = _.debounce(updatePublic, 500, true);

        function update(caller_function) {
            if (fb_post_type === null) return;
            
            if (fb_performance_global_time_step != null) {
                var interval = performance.now() - fb_performance_global_time_step;
                console.log('update call interval: ' + interval + "; caller_function: " + caller_function + "; editor_id: " + editor.id);
            }
            fb_performance_global_time_step = performance.now();
            
            caller_function = caller_function || '';
            debounce_update(true, caller_function); 
            //updatePublic(true, caller_function);
        }

        ////
        // The update method can be called by derived.js when events occurred outside the tinymce editor
        //
        function updatePublic(derived_callback, caller_function) {
            derived_callback = derived_callback || false;
            caller_function = caller_function || '';

            var t0 = performance.now(); // measure the performance of each method in this function
            setupNewElements();
            var t1 = performance.now();
            setupDerivedElementID();
            var t2 = performance.now();
            updateComments();
            var t3 = performance.now();
            if (derived_callback) {
                if (editor.id.indexOf("fb-derived-mce") >= 0) { 
                    var callback = flexibook.deriveUpdateCallback;
                    if (callback) callback(caller_function);
                }

                // if the tinymce event comes from the source editor, then derive.js update is not necessary
                if (editor.id.indexOf("fb-source-mce") >= 0) {
                    if (performance_previous_scroll_top === null) {
                        performance_previous_scroll_top = editor.getBody().scrollTop;
                    }
                    else {
                        if (performance_previous_scroll_top != editor.getBody().scrollTop) {
                            performance_previous_scroll_top = editor.getBody().scrollTop;
                            var callback = flexibook.deriveUpdateCallback;
                            if (callback) callback(caller_function);
                        }
                    }
                }
            }
            var t4 = performance.now();
            // setup drag event for derive elements
            if (editor.id.indexOf("fb-derived-mce") >= 0) {
                $(editor.getBody()).children().on('dragenter', function () {
                    if (fb_dragging == false) return;

                    var item = $(this);
                    if (item.attr('id') == flexibook.dragged_item_id) return;

                    $(editor.getBody()).find('.fb_tinymce_dragging').remove();

                    if (item.hasClass("fb_tinymce_left_column") == false && item.hasClass("fb_tinymce_left_column_icon") == false && item.hasClass("fb_tinymce_dragging") == false) {                                                                     
                        var clone = $(fb_dragged_item_copy).clone();
                        $(clone).addClass('fb_tinymce_dragging');
                        $(clone).css('opacity', 0.5);

                        $(clone).insertAfter(item);
                    }
                });
            }
            var t5 = performance.now();
            resetIcons();
            if (on_mouse_up) {
                onMouseUp();
                on_mouse_up = false;
            }
            setupIconEvents();
            var t6 = performance.now();
            drawLines();
            drawLinesMergeElements();
            var t7 = performance.now();
            var p1 = t1 - t0;
            var p2 = t2 - t1;
            var p3 = t3 - t2;
            var p4 = t4 - t3;
            var p5 = t5 - t4;
            var p6 = t6 - t5;
            var p7 = t7 - t6;
            console.log(".........................................................................");
            console.log("tinymce.js update; caller: " + caller_function + "; editor_id: " + editor.id);
            console.log("performance (setupNewElements): " + p1);
            console.log("performance (setupDerivedElementID): " + p2);
            console.log("performance (updateComments): " + p3);
            console.log("performance (deriveUpdateCallback): " + p4);
            console.log("performance (setup drag even): " + p5);
            console.log("performance (setup icons): " + p6);
            console.log("performance (draw lines): " + p7);
            console.log(".........................................................................");
        }

        ////
        // Update the comment bubbles
        //
        function updateComments() {
            // if the comment bubble have not longer existed, remove the comment span tag of the related content
            $(editor.getBody()).find('.fb-comment-content').each(function (index) {
                var content = $(this);
                var id = content.attr('data-comment-id');
                var bubbles = $(editor.getBody()).find('#' + id);
                if (bubbles.length <= 0) {
                    content.contents().unwrap();
                }
            });

            // if the comment content have not longer existed, remove the related comment bubble
            $(editor.getBody()).find('.fb-comment-bubble').each(function (index) {
                var bubble = $(this);
                var id = bubble.attr('id');
                var exist = false;
                $(editor.getBody()).find('.fb-comment-content').each(function (index) {
                    var content = $(this);
                    if (content.attr('data-comment-id') == id) {
                        exist = true;
                        return false;
                    }
                });

                if (!exist) {
                    bubble.remove();
                }
            });

            updateBubblePosition();
            redrawCommentLines(); // have to redraw the comment lines after the bubble position is updated.
        }

        ////
        // Update the comment bubble positions
        //
        function updateBubblePosition() {
            var body_width = $(editor.getBody()).width();
            var body_margin_left = parseInt($(editor.getBody()).css('margin-left'), 10);
            var bubble_left = body_width + body_margin_left + 10;

            // 1. update bubble position
            $(editor.getBody()).find('.fb-comment-content').each(function (index) {
                var content = $(this);
                var id = content.attr('data-comment-id');
                var bubbles = $(editor.getBody()).find('#' + id);
                if (bubbles.length <= 0) return true;

                var bubble = bubbles[0];
                var offset = $(content).offset(); // absolute position relative to the document
                var t = offset.top;
                var bubble_min_height = 60;
                var t = t - bubble_min_height / 2;
                $(bubble).css({ top: t });
                $(bubble).css({ left: bubble_left });
                if (fb_post_type == FB_LEVEL_1_POST) {
                    $(bubble).css({ width: '250px' });
                }
                else {
                    $(bubble).css({ width: '100px' });
                }
            });

            // 2. avoid overlap
            var margin_between_bubbles = 10;
            var bottom = null;
            $(editor.getBody()).find('.fb-comment-content').each(function (index) {
                var content = $(this);
                var id = content.attr('data-comment-id');
                var bubbles = $(editor.getBody()).find('#' + id);
                if (bubbles.length <= 0) return true;

                var bubble = bubbles[0];
                var bubble_top = parseInt($(bubble).css('top'), 10);
                var bubble_height = $(bubble).height();
                if (bottom !== null) {
                    if (bubble_top < bottom + margin_between_bubbles) {
                        bubble_top = bottom + margin_between_bubbles;
                        $(bubble).css({ top: bubble_top });
                    }
                }
                bottom = bubble_top + bubble_height;
            });
        }

        ////
        // Redraw the lines that link between comment bubbles and comment texts in the html content
        //
        function redrawCommentLines() {
            $(editor.getBody()).find('.fb-comment-line-svg').remove();

            var body_width = $(editor.getBody()).width();
            var body_margin_left = parseInt($(editor.getBody()).css('margin-left'), 10);
            var body_right = body_width + body_margin_left;
            var bubble_left = body_right + 10;

            var bubble_min_height = 60;

            $(editor.getBody()).find('.fb-comment-content').each(function (index) {
                var content = $(this);
                var id = content.attr('data-comment-id');
                var bubbles = $(editor.getBody()).find('#' + id);
                if (bubbles.length <= 0) return true;

                var bubble = bubbles[0];
                if (bubble.className.indexOf('fb-display-none-h') >= 0) return true; // continue
                var bubble_top = parseInt($(bubble).css('top'), 10);

                var offset = content.offset(); // absolute position relative to the document
                var content_top = offset.top;
                var content_left = offset.left;

                if (Math.abs((bubble_top + (bubble_min_height / 2)) - content_top) > (bubble_min_height / 2)) {
                    drawCommentLine(id, content_left, content_top, body_right, content_top);
                    drawCommentLine(id + '-2', body_right, content_top, bubble_left, bubble_top + (bubble_min_height / 2));
                }
                else {
                    drawCommentLine(id, content_left, content_top, bubble_left, content_top);
                }
            });
        }

        ////
        // Draw a comment line
        //
        function drawCommentLine(id, x1, y1, x2, y2) {
            var svg_top = (y1 < y2) ? y1 : y2;
            var svg_height = (y1 <= y2) ? (y2 - y1) : (y1 - y2);
            if (svg_height === 0) svg_height = 1;
            var svg_left = x1; // x1 is always smaller than x2
            var svg_width = x2 - x1;
            var svg_id = id + '-svg';
            $(editor.getBody()).append('<svg id="' + svg_id + '" class="fb-comment-line-svg" style="position:absolute; top:' + svg_top + 'px; left:' + svg_left + 'px; height:' + svg_height + 'px; width:' + svg_width + 'px; z-index: 1;" xmlns="http://www.w3.org/2000/svg"/></svg>');

            //var id = editor.id + '-svg';
            var svg = editor.getDoc().getElementById(svg_id);

            // line for visualization
            var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1 - svg_left);
            line.setAttribute('y1', y1 - svg_top);
            line.setAttribute('x2', x2 - svg_left);
            line.setAttribute('y2', y2 - svg_top);
            line.setAttribute('stroke', '#f49965');
            line.setAttribute('stroke-width', 1);
            line.style.zIndex = 100;
            if (svg) svg.appendChild(line);
        }

        ////
        // Reset all the icons/buttons in the tinymce html body
        //
        function resetIcons() {
            $(editor.getBody()).find('.fb_tinymce_left_column').remove();

            // add svg element
            $(editor.getBody()).find('.fb_tinymce_left_column_svg').remove();
            var id = editor.id + '-svg';
            var body_height = editor.getBody().offsetHeight; // the actual html body height
            var editor_height = editor.getContentAreaContainer().offsetHeight;
            var percent = body_height * 105 / editor_height;
            if (percent < 100) percent = 100;
            percent = percent + '%';

            $(editor.getBody()).append('<svg id="' + id + '" class="fb_tinymce_left_column_svg" style="position:absolute; top:0px; left:0px; height:' + percent + '; width:100%; z-index: -1;" xmlns="http://www.w3.org/2000/svg"/></svg>'); // ms - test
 
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

                    if (node.attr(fb_data_merge_case) && node.attr(fb_data_merge_case) > 0) {
                        var mcase = node.attr(fb_data_merge_case);
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

            fb_on_icon_hover = false;
        }

        ////
        // Setup icon events for icons in the tinymce html body
        //
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
                    fb_on_icon_hover = true;

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
                    fb_on_icon_hover = false;

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
                iconOnClick($(this));
            });
        }

        ////
        // Called when an icon is clicked
        //
        function iconOnClick(icon) {
            var this_icon = icon;
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
                            post_id = $(this).attr(fb_data_post_id);
                            source_item_id = $(this).attr(fb_data_element_id);
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

            update('fb_on_icon_click');
        }

        ////
        // Setup draggable icon events
        // The user can use the draggable icon to move an element from a source unit to a derive unit, or move an element up or down within the derive unit.
        //
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
                fb_dragging = true;

                var targetID = icon.id.substr(5);
                if (targetID == null) return;

                $(this).css('opacity', 0); // hide the drag icon
                var deleteIconID = 'qdel-' + targetID;
                var delete_icon = editor.getDoc().getElementById(deleteIconID);
                $(delete_icon).css('opacity', 0); // hide the delete icon

                flexibook.dragged_item_id = targetID;
                var dragged_item = editor.getDoc().getElementById(flexibook.dragged_item_id);
                fb_dragged_item_copy = $(dragged_item).clone();

                if (editor.id.indexOf("fb-derived-mce") >= 0) {
                    $(dragged_item).addClass('fb_tinymce_dragging');
                    $(dragged_item).css('opacity', 0.5);
                }
                else if (editor.id.indexOf("fb-source-mce") >= 0) {
                    var post_id = editor.post_id;
                    $(fb_dragged_item_copy).attr(fb_data_post_id, post_id);
                }
            });

            /*
            icon.addEventListener('drag', function (event) {
                $(editor.getBody()).css('cursor', 'crosshair');
            });
            */

            icon.addEventListener('dragend', function (event) {
                fb_dragging = false;

                if (editor.id.indexOf("fb-derived-mce") >= 0) {
                    var dragged_item = editor.getDoc().getElementById(flexibook.dragged_item_id);
                    $(dragged_item).removeClass('fb_tinymce_dragging');
                    $(dragged_item).css('opacity', 1);
                }
                else if (editor.id.indexOf("fb-source-mce") >= 0) {
                    // set drag item attributes
                    var callback = flexibook.onDragEndCallback;
                    if (callback) callback();

                    // add comment bubbles
                    var original_dragged_item_in_source = editor.getDoc().getElementById(flexibook.dragged_item_id);
                    var bubble = getCommentsBubbleOuterHtml(editor, original_dragged_item_in_source);
                    if (bubble !== '') {
                        if (flexibook.active_derive_mce) {
                            var derived_mce = flexibook.active_derive_mce;
                            if (derived_mce) {
                                $(derived_mce.getBody()).append(bubble);
                            }
                        }
                    }

                    // setup derive element id 
                    setupDerivedElementID();
                }
                //console.log('dragend');
            });
        }

        ////
        // Checked if the icon is for approving or rejecting changes in a derive unit
        //
        function isMergeIcons(this_icon) {
            if ((this_icon.html().charCodeAt() == '10003') ||
                (this_icon.html().charCodeAt() == '10007') ||
                (this_icon.html().charCodeAt() == '8680')) {
                return true;
            }
            return false;
        }

        ////
        // Checked if the icon is a move icon or a delete icon
        //
        function isEditIcons(this_icon) {
            if (this_icon.html().charCodeAt() == '9776' || 
               (this_icon.html().charCodeAt() == '10005')) {
                return true;
            }
            return false;
        }

        ////
        // When new elements are inserted into the editor, create a unique id for each of the new elements
        //
        function setupNewElements() {
            $(editor.getBody()).children().each(function (index) {
                var element = $(this);
                if (!isAdminElementjQuery(element)) {
                    if (element.prop("tagName").toLowerCase() == 'table' && !$(this).attr('id')) {

                    }

                    // derive document
                    if (editor.id.indexOf("fb-derived-mce") >= 0) {

                    }
                    // source document
                    else {
                        if (!$(this).attr('id')) {
                            // new element created by the user
                            $(this).attr("id", generateUUID());
                        }

                    }
                }
            });

            $(editor.getBody()).find('table').each(function () {
                var table = $(this);
                if (table.hasClass("no-border") == false && table.hasClass("fb-table") == false) {
                    table.addClass('fb-table');
                }

            });
        }

        ////
        // This method is for derive editor only
        // Create a unique id for each new elements in the derive editor
        // If a derive element is descended from a source element, then save this dependency in the derive element as well
        //
        function setupDerivedElementID() {
            if (editor.id.indexOf("fb-derived-mce") < 0) return; // only for derived editor

            $(editor.getBody()).children().each(function (index) {
                var element = $(this);
                if (!isAdminElementjQuery(element)) {
                    if (!element.attr(fb_data_element_id)) {
                        if (!element.attr('id')) {
                            // new element created by the user
                            element.attr(fb_data_element_id, "none");
                            element.attr("id", generateUUID());
                        }
                        else {
                            // element from source document
                            var source_id = element.attr("id");
                            element.attr(fb_data_element_id, source_id);
                            element.attr("id", generateUUID());
                        }
                    }
                    else {
                        if (!element.attr('id')) {
                            // new element created by the user
                            element.attr(fb_data_element_id, "none");
                            element.attr("id", generateUUID());
                        }
                    }
                }
            });
        }

        ////
        // Generate a global unique id
        //
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

                            var element_copy = $(element).clone(); // the children of the element should be cloned as well

                            $(element_copy).attr(fb_data_post_id, post_id);
                            content += $(element_copy).prop('outerHTML');
                            var bubble = getCommentsBubbleOuterHtml(editor, element);
                            if (bubble !== '') {
                                content += bubble;
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
                                var element_copy = $(element).clone();
                                $(element_copy).attr(fb_data_post_id, post_id);
                                content += $(element_copy).prop('outerHTML');
                                var bubble = getCommentsBubbleOuterHtml(editor, element);
                                if (bubble !== '') {
                                    content += bubble;
                                }
                            }
                        }
                        else {
                            var element_copy = $(element).clone();
                            $(element_copy).attr(fb_data_post_id, post_id);
                            content += $(element_copy).prop('outerHTML');
                            var bubble = getCommentsBubbleOuterHtml(editor, element);
                            if (bubble !== '') {
                                content += bubble;
                            }
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

        function getCommentsBubbleOuterHtml(targetEditor, element) {
            var outer = '';
            $(element).find('.fb-comment-content').each(function (index) {
                var content = $(this);
                var id = content.attr('data-comment-id');
                var bubbles = $(targetEditor.getBody()).find('#' + id);
                if (bubbles.length === 1) {
                    var b = bubbles[0];
                    outer += $(b).prop('outerHTML');
                    /*
                    if (flexibook.active_derive_mce) {
                        var derived_mce = flexibook.active_derive_mce;
                        if (derived_mce) {
                            $(derived_mce.getBody()).append($(b).prop('outerHTML'));
                        }
                    }
                    */
                }
            });

            return outer;
        }

        function isAdminElement(element) {
            return isAdminElementjQuery($(element));
        }

        function isAdminElementjQuery(element) {
            if (element.prop("tagName").toLowerCase() == 'svg') return true;
            if (element.hasClass("fb_tinymce_left_column") == true ||
                element.hasClass("fb_tinymce_left_column_icon") == true ||
                element.hasClass("fb_tinymce_left_column_svg") == true ||
                element.hasClass("fb_tinymce_left_column_page") == true ||
                element.hasClass("fb-comment") == true ||
                element.hasClass("toc-page") == true ||
                element.hasClass("mce-resizehandle") == true ||
                element['data-mce-bogus']) return true;
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

                    if (node.attr(fb_data_merge_case) && node.attr(fb_data_merge_case) > 0) {
                        var mcase = node.attr(fb_data_merge_case);

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
                        if (element.className.indexOf('fb-display-none-h') >= 0) continue;

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

                    var line_color = 'lightgrey';
                    var event_line_color = 'white'; // should be invisible

                    // change the line color if page boundary is on
                    if (page_boundary_on) {
                        line_color = 'grey';
                        event_line_color = page_boundary_on_body_background_color;
                    }

                    var svg_id = editor.id + '-svg';
                    var svg = editor.getDoc().getElementById(svg_id);

                    // line for events
                    var eline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    eline.setAttribute('x1', x1);
                    eline.setAttribute('y1', y1);
                    eline.setAttribute('x2', x2);
                    eline.setAttribute('y2', y2);
                    eline.setAttribute('stroke', event_line_color); 
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
                    line.setAttribute('stroke', line_color);
                    line.setAttribute('stroke-width', 1);
                    //line.style.zIndex = 1;
                    if (svg) svg.appendChild(line);

                    // short horizontal line in the end of the section
                    var hline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    hline.setAttribute('x1', x2);
                    hline.setAttribute('y1', y2);
                    hline.setAttribute('x2', x2 + 5);
                    hline.setAttribute('y2', y2);
                    hline.setAttribute('stroke', line_color);
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
            // when expanding, move the hidden elements first
            if (!collapse) {
                var targetElement = $(editor.getBody()).find('#' + targetID);
                var id = targetID.replace(/[-.]/g, "");
                $($(editor.getBody()).find('.fb-collapse-' + id).get().reverse()).each(function (index) {
                    $(this).removeClass('fb-collapse-' + id);
                    $(this).insertAfter(targetElement); // jQuery: if an element is inserted into a single location elsewhere in the DOM, it will be moved after the target (not cloned).
                });
            }

            // collapse or expand
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
                                    var id = targetID.replace(/[-.]/g, "");
                                    element.className += (' fb-collapse-' + id);
                                }
                                else {
                                    //$('#' + element.id).removeClass('fb-display-none-h' + targetLevel);
                                    var input = 'fb-display-none-h' + targetLevel;
                                    var re = new RegExp(input, "g");
                                    element.className = element.className.replace(re, '').trim(); // remove class
                                }
                                collapseOrExpandComments(collapse, element, targetLevel);
                            }
                        }
                        else {
                            if (collapse) {
                                element.className += (' fb-display-none-h' + targetLevel);
                                var id = targetID.replace(/[-.]/g, "");
                                element.className += (' fb-collapse-' + id);
                            }
                            else {
                                //$('#' + element.id).removeClass('fb-display-none-h' + targetLevel);
                                var input = 'fb-display-none-h' + targetLevel;
                                var re = new RegExp(input, "g");
                                element.className = element.className.replace(re, '').trim(); // remove class
                            }
                            collapseOrExpandComments(collapse, element, targetLevel);
                        }
                    }
                }
            }
        }

        function collapseOrExpandComments(collapse, element, targetLevel) {
            $(element).find('.fb-comment-content').each(function (index) {
                var content = $(this);
                var id = content.attr('data-comment-id');
                var bubbles = $(editor.getBody()).find('#' + id);
                if (bubbles.length === 1) {
                    var b = bubbles[0];
                    if (collapse) {
                        b.className += (' fb-display-none-h' + targetLevel);
                    }
                    else {
                        var input = 'fb-display-none-h' + targetLevel;
                        var re = new RegExp(input, "g");
                        b.className = b.className.replace(re, '').trim(); // remove class
                    }
                }
            });
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

        function createCommentBubble(id, top, left, text) {
            var bubble_height = 60;
            var bubble_top = top - bubble_height / 2;

            var bubble = document.createElement('div');
            bubble.className = 'fb-comment fb-comment-bubble fb-teacher-bubble';
            bubble.id = id;
            bubble.innerHTML = text;
            bubble.style.position = 'absolute';
            bubble.style.top = bubble_top + 'px';
            bubble.style.left = left + 'px';
            //bubble.style.fontSize = '150%';

            //bubble.style.border = 'solid';
            //bubble.style.borderWidth = '1px';
            //bubble.style.borderColor = 'grey';

            bubble.style.width = '100px';
            bubble.style.minHeight = bubble_height + 'px';
            //bubble.style.opacity = 0.3;

            editor.getBody().appendChild(bubble);
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

        // the size of A4: 210mm x 297mm or 8.27in x 11.69in
        // 1 inch = 25.4 millimetres
        function createPageBoundary(id, page_count, top, left, width, height) {
            var page = document.createElement('div');
            page.className = 'fb_tinymce_left_column_page';
            page.id = id;
            page['data-page-count'] = page_count;
            page.style.position = 'absolute';
            page.style.top = top + 'px';
            page.style.left = left + 'px';
            page.style.width = width + 'px';
            page.style.height = height + 'px';
            //page.style.height = height + 'cm';
            page.style.zIndex = -1;
            page.style.backgroundColor = '#ffffff';
            page.style.borderStyle = 'solid';
            //page.style.borderStyle = 'dotted';
            page.style.borderWidth = '1px';
            page.style.borderColor = 'lightgrey';

            editor.getBody().appendChild(page);
        }
    });
});
