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

            setupIcons();
        });

        editor.on('change', function (e) {
            console.log('change event', e);
            setupIcons();
        });

        /*
        editor.on('LoadContent', function (e) {
            setupIcons();
        });
        */



        // functions
        function setupIcons() {
            $(editor.getBody()).find('.fb_tinymce_left_column_icon').remove(); // clear all exisint icons

            $(editor.getBody()).find('h1').each(function (index) {
                console.log(index + ": " + $(this).text());
                var iconID = 'icon-' + $(this).attr('id');
                var offset = $(this).offset(); // absolute position relative to the document
                var height = $(this).height();
                createIcon(iconID, offset.top);
            });

            $(editor.getBody()).find('h2').each(function (index) {
                console.log(index + ": " + $(this).text());
                var iconID = 'icon-' + $(this).attr('id');
                var offset = $(this).offset(); // absolute position relative to the document
                var height = $(this).height();
                createIcon(iconID, offset.top);
            });

            $(editor.getBody()).find('h3').each(function (index) {
                console.log(index + ": " + $(this).text());
                var iconID = 'icon-' + $(this).attr('id');
                var offset = $(this).offset(); // absolute position relative to the document
                var height = $(this).height();
                createIcon(iconID, offset.top);
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
        }

        function createIcon(id, top) {
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
