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
            left_column.id = 'fb_tinymce_left_column';
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

            $(editor.getBody()).find('h1').each(function (index) {
                var iconID = 'icon-' + $(this).attr('id');
                var offset = $(this).offset(); // absolute position relative to the document
                var height = $(this).height();
                createFoldingIcon(iconID, offset.top);
            });

            $(editor.getBody()).find('h2').each(function (index) {
                var iconID = 'icon-' + $(this).attr('id');
                var offset = $(this).offset(); // absolute position relative to the document
                var height = $(this).height();
                createFoldingIcon(iconID, offset.top);
            });

            $(editor.getBody()).find('h3').each(function (index) {
                var iconID = 'icon-' + $(this).attr('id');
                var offset = $(this).offset(); // absolute position relative to the document
                var height = $(this).height();
                createFoldingIcon(iconID, offset.top);
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
                var targetID = $(this).id.substr(5);
                if (targetID == null) return;
                var targetLevel = 10000;

                // click the minus box: collapse
                if ($(this).innerHTML == '&#8863') {
                    var start = false;
                    var children = $(editor.getBody()).children();
                    if (children != null && children.length > 0) {
                        for (var i = 0; i < children.length; i++) {
                            var element = children[i];
                            if (element.className.indexOf("fb_tinymce_left_column") >= 0) continue;
                            if (element.className.indexOf("fb_tinymce_left_column_icon") >= 0) continue;

                            if (start == false) {
                                if (element.id == targetID) {
                                    start = true;
                                    targetLevel = parseInt(element.tagName.substr(1));
                                }
                            }
                            else {
                                if ((element.tagName == 'h1') || (element.tagName == 'h2') || (element.tagName == 'h3')) {
                                    var level = parseInt(element.tagName.substr(1));
                                    if (level <= targetLevel) {
                                        break;
                                    }
                                    else {
                                        element.className += (' fb-display-none-h' + targetLevel);
                                    }
                                }
                                else {
                                    element.className += (' fb-display-none-h' + targetLevel);
                                }
                            }
                        }
                    }

                    $(this).innerHTML = '&#8862' // switch to plus box
                }


                }
            );
        }

        function createFoldingIcon(id, top) {
            var icon = document.createElement('div');
            icon.className = 'fb_tinymce_left_column_icon';
            icon.id = id;
            icon.innerHTML = '&#8863'; // minus box; '&#8862' is plus box
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
