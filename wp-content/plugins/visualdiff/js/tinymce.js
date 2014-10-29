jQuery(document).ready(function ($) {
    tinymce.PluginManager.add('fb_folding_editor', function (editor, url) {

        // events
        editor.on('init', function () {
            var left_column = document.createElement('div');
            left_column.style.position = 'absolute';
            left_column.style.top = 0;
            left_column.style.left = 0;
            left_column.style.width = '12px';
            left_column.style.height = '100%';
            left_column.style.backgroundColor = '#e8e8e8';
            left_column.className = 'fb_tinymce_left_column';
            editor.getBody().appendChild(left_column);

            resetFoldingIcons();
        });

        editor.on('change', function (e) {
            console.log('change event', e);
            resetFoldingIcons();
        });

        /*
        editor.on('LoadContent', function (e) {
            resetFoldingIcons();
        });
        */

        // functions
        function resetFoldingIcons() {
            $(editor.getBody()).find('.fb_tinymce_left_column_icon').remove(); // clear all existing icons

            $(editor.getBody()).find('h1, h2, h3').each(function (index) {
                var iconID = 'icon-' + $(this).attr('id');
                var offset = $(this).offset(); // absolute position relative to the document
                var height = $(this).height();
                var classes = $(this).attr('class');

                if (classes != null && classes.indexOf("fb-display-none") >= 0) {
                    var test = 1;
                }
                else if (classes != null && classes.indexOf("fb-collapse") >= 0) {
                    createFoldingIcon(iconID, offset.top, '&#8862');
                }
                else {
                    createFoldingIcon(iconID, offset.top);
                }
            });

            setupFoldingIconEvents();
        }

        function setupFoldingIconEvents() {
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
                    else if ($(this).html().charCodeAt() == '8862') {
                        collapseOrExpand(targetID, false);

                        $(this).html('&#8863');  // switch to minus box
                    }

                    resetFoldingIcons();
                }
            );
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
                                element.className = element.className.replace(/(?:^|\s)fb-collapse(?!\S)/g, ''); // remove class
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
                                    element.className = element.className.replace(re, ''); // remove class
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
                                element.className = element.className.replace(re, ''); // remove class
                            }
                        }
                    }
                }
            }

        }

        function createFoldingIcon(id, top, text) {
            text = typeof text !== 'undefined' ? text : '&#8863'; // default parameter

            var icon = document.createElement('div');
            icon.className = 'fb_tinymce_left_column_icon';
            icon.id = id;
            icon.innerHTML = text; // minus box; '&#8862' is plus box
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
