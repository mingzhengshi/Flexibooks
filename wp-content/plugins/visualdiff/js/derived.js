jQuery(document).ready(function ($) {
    var x = 1;

    $("#fb-div-derived-sortables").sortable({
        //cursor: 'move'
    });

    $("#fb-button-add-new-derived-item").click(function () {
        var val = 1;
        $("#div-derived-sortables").append('<div class="div-derived-item"><span>new item ' + x + '</span></div>');
        x++;
    });

    var ajax_request;

    $('#fb-div-jstree')
        .on('changed.jstree', function (e, data) {
            if (data.selected && data.selected.length == 1) {
                var select_node = data.instance.get_node(data.selected[0]);
                var node_id = select_node.id;
                var url = source_query_url;

                /*
                ajax_request = $.ajax({
                    url: source_query_url,
                    type: "post",
                    data: node_id
                });
                */

                $.post(ajaxurl,
                    {
                        'action': 'fb_source_query',
                        'id': node_id
                    },
                    function (data, status) {
                        if (status.toLowerCase() == "success") {
                            //var outer_text = data.htmltext;
                            $('#fb-div-show-jstree-selection').empty();
                            $('#fb-div-show-jstree-selection').append(data);
                        }
                        else {
                            //alert("Loading is: " + status + "\nData: " + data);
                        }
                });
            }
        })
        .jstree();






});

