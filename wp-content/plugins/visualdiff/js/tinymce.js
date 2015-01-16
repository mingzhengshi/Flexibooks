jQuery(document).ready(function ($) {
    // record the latest copy event
    var copied_from_editor_id = "";
    var copied_content = "";
    var copied_node = null;
    var copied_mode = "";


    tinymce.PluginManager.add('fb_folding_editor', function (editor, url) {

        // events
        editor.on('init', function () {
            resetIcons();
        });

        editor.on('change', function (e) {
            //console.log('change event', e);
            setupDerivedElementID();
            resetIcons();
        });

        editor.on('PostProcess', function (e) {
            resetIcons();
        });

        editor.on('activate', function (e) {
            resetIcons();
        });

        editor.on('focus', function (e) {
            resetIcons();
        });

        editor.on('cut', function (e) {
            onCutOrCopy(e);
        });

        editor.on('copy', function (e) {
            onCutOrCopy(e);
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

        function onCutOrCopy(e) {
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
                }
                // one paragraphs or part of one paragraph has been selected
                else {
                    copied_mode = "single";
                    var node = $(copied_node).clone();
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

            // COPY: assume that all content copies from source or derived editors are html elements; 
            // CUT: single paragraph content cut from source or derived editors are not html elements;
            if (isHTML(e.content) == false) return;

            // if the content comes from the source document
            if (copied_from_editor_id.indexOf("fb-source-mce") >= 0) {
                if (copied_mode == "single") {
                    var paste_text = $(e.content).html().trim();
                    var copied_text = $(copied_content).html().trim();
                    console.log("e.content inner:" + paste_text);

                    // it is possible that the paste content comes from other sources such as word or notepad, etc.
                    if (paste_text == copied_text) {
                        e.content = copied_content;
                    }
                }
                else if (copied_mode == "multiple") {

                }
            }
            // if the content comes from the derive document
            else if (copied_from_editor_id.indexOf("fb-derived-mce") >= 0) {

            }
        }

        function isHTML(str) {
            var a = document.createElement('div');
            a.innerHTML = str;
            for (var c = a.childNodes, i = c.length; i--;) {
                if (c[i].nodeType == 1) return true;
            }
            return false;
        }

        // functions
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
                    createIcon(foldingIconID, offset.top, '&#8862'); // folding icon: plus 
                    if (editor.id.indexOf("fb-source-mce") >= 0) {
                        createIcon(pushIconID, offset.top + 15, '&#9655');
                    }
                }
                else {
                    createIcon(foldingIconID, offset.top, '&#8863'); // folding icon: minus 
                    if (editor.id.indexOf("fb-source-mce") >= 0) {
                        createIcon(pushIconID, offset.top + 15, '&#9655');
                    }
                }
            });

            setupIconEvents();
        }

        function setupIconEvents() {
            $(editor.getBody()).find('.fb_tinymce_left_column_icon').hover(
                // handlerIn
                function () {
                    $(this).css('cursor', 'pointer');
                },
                // handlerOut
                function () {
                    $(this).css('cursor', 'text');
                }
            );

            $(editor.getBody()).find('.fb_tinymce_left_column_icon').click(function () {
                    var targetID = $(this).attr('id').substr(5);
                    if (targetID == null) return;

                    // click the minus box: collapse
                    if ($(this).html().charCodeAt() == '8863') {
                        collapseOrExpand(targetID, true);

                        $(this).html('&#8862');  // switch to plus box
                    }
                    // click the plug box: expand
                    else if ($(this).html().charCodeAt() == '8862') {
                        collapseOrExpand(targetID, false);

                        $(this).html('&#8863');  // switch to minus box
                    }
                    // click the push button: add content
                    else if ($(this).html().charCodeAt() == '9655') {
                        insertContent(targetID);
                    }

                    resetIcons();
                }
            );
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

                            content += element.outerHTML;
                        }
                    }
                    else {
                        if ((element.tagName.toLowerCase() == 'h1') || (element.tagName.toLowerCase() == 'h2') || (element.tagName.toLowerCase() == 'h3')) {
                            var level = parseInt(element.tagName.substr(1));
                            if (level <= targetLevel) {
                                break;
                            }
                            else {
                                content += element.outerHTML;
                            }
                        }
                        else {
                            content += element.outerHTML;
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
                    //if (element.className.indexOf("fb_tinymce_left_column_icon") >= 0) continue;

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

        function createIcon(id, top, text) {
            //text = typeof text !== 'undefined' ? text : '&#8863'; // default parameter

            var icon = document.createElement('div');
            icon.className = 'fb_tinymce_left_column_icon';
            icon.id = id;
            icon.innerHTML = text; 
            icon.style.position = 'absolute';
            icon.style.top = top + 'px';
            icon.style.left = '-0.5px';
            //icon.style.width = '8px';
            //icon.style.height = '8px';
            //icon.style.backgroundColor = '#ff0000';

            editor.getBody().appendChild(icon);
        }

    });


});
