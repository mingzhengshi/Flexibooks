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
                    //alert("click() called.");

                    
                    // don't need a tree structure of the document;
                    // use $(editor.getBody()).find('*') to find all elements
                    // then reset Icons
                }
            );
        }

        function createFoldingIcon(id, top) {
            var icon = document.createElement('div');
            icon.className = 'fb_tinymce_left_column_icon';
            icon.id = id;
            icon.innerHTML = '&#8863'; // minus with box; '&#8862' is plus with box
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
