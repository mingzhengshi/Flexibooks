jQuery(document).ready(function ($) {
    tinymce.PluginManager.add('fb_folding_editor', function (editor, url) {        
        editor.on('init', function () {
            var left_column = document.createElement('div');
            left_column.style.position = 'absolute';
            left_column.style.top = 0;
            left_column.style.left = 0;
            left_column.style.width = '15px';
            left_column.style.height = '100%';
            left_column.style.backgroundColor = '#e8e8e8';
            left_column.id = 'fb_tinymce_left_column';
            editor.getBody().appendChild(left_column);

            setupIcons();
        });

        /*
        editor.on('LoadContent', function (e) {
            setupIcons();
        });
        */

        function setupIcons() {
            /*
            $("h1").each(function (index) {
                console.log(index + ": " + $(this).text());
                var icon_id = 'icon-' + $(this).id;
                var position = $(this).position;
            });
            */
            
            var h1s = editor.getBody().getElementsByTagName('h1');
            if (h1s != null && h1s.length > 0) {
                for (var i = 0; i < h1s.length; i++) {
                    var icon_id = 'icon-' + h1s[i].id;
                    var rect = h1s[i].getBoundingClientRect();

                    var jid = '#' + h1s[i].id;
                    var pos = $(jid).position();
                }
            }
            
        }

    });


});
