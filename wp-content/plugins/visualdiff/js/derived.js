jQuery(document).ready(function ($) {
    var selected_sources = [];
    var source_tabs = $('#fb-tabs-sources').tabs();
    var tab_counter = 0;
    var tab_template = "<li><a href='#{href}'>#{label}</a><span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>";

    var div_mce_editor = $('#fb-div-source-editor').contents();

    // close icon: removing the tab on click
    source_tabs.delegate("span.ui-icon-close", "click", function () {
        var panelId = $(this).closest("li").remove().attr("aria-controls");
        $("#" + panelId).remove();
        source_tabs.tabs("refresh");
    });

    source_tabs.on("tabsactivate", function (event, ui) {
        console.log("tab activate...");
        //var active_tab_id = $(".ui-state-active").attr("id");
        $tabIndex = $('#fb-tabs-sources').tabs('option', 'active');

        var $selected = $("#fb-tabs-sources ul>li a").eq($tabIndex).attr('href');
    });

    var fb_source_selection_dialog = $("#fb-source-selection-dialog").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            Open: function () {
                //addTab();
                for (var i = 0; i < selected_sources.length; i++) {
                    var post_id = selected_sources[i];

                    $.post(ajaxurl,
                        {
                            'action': 'fb_source_query',
                            'id': post_id
                        },
                        function (data, status) {
                            if (status.toLowerCase() == "success") {
                                //var outer_text = data.htmltext;
                                var test = data;
                                addSourceTab(data);
                            }
                            else {
                            }
                        });
                }
                $('#fb-selectable-source-list .ui-selected').removeClass('ui-selected');
                $(this).dialog("close");
            },
            /*
            Clear: function () {
                selected_sources.splice(0);
                $('#fb-selectable-source-list .ui-selected').removeClass('ui-selected');
            },
            */
            Cancel: function () {
                selected_sources.splice(0);
                $('#fb-selectable-source-list .ui-selected').removeClass('ui-selected');
                $(this).dialog("close");
            },
        },
        close: function () {
            selected_sources.splice(0);
            $('#fb-selectable-source-list .ui-selected').removeClass('ui-selected');
        }
    });

    // source selection dialog
    $("#fb-button-open-source-document").button().click(function () {
        selected_sources.splice(0);
        $('#fb-selectable-source-list .ui-selected').removeClass('ui-selected');
        fb_source_selection_dialog.dialog("open");
    });

    function addSourceTab(data) {
        var label = "label";
        var id = "fb-tabs-source-" + tab_counter;
        var li = $(tab_template.replace(/#\{href\}/g, "#" + id).replace(/#\{label\}/g, label));
        var tabContentHtml = data;

        $("#fb-ul-source-tabs").append(li);
        //source_tabs.append("<div id='" + id + "'><p>" + tabContentHtml + "</p></div>");
        source_tabs.append("<div id='" + id + "'></div>");
        $("#" + id).append(div_mce_editor);

        //tinymce.execCommand('mceRemoveEditor', false, 'fb_left_editor_source');
        //tinymce.execCommand('mceAddEditor', false, 'fb_left_editor_source');
        //tinyMCE.get('fb_left_editor_source').setContent(data);

        source_tabs.tabs("refresh");
        tab_counter++;
    }

    // selectable in the dialog
    $("#fb-selectable-source-list").selectable({
        stop: function () {
            selected_sources.splice(0);
            $(".ui-selected", this).each(function () {
                var post_id = $(this).attr("source-post-id");
                selected_sources.push(post_id);
            });           
        }
    });

    /*
    $("#fb-div-derived-sortables").sortable({
        //cursor: 'move'
    });

    var x = 1;
    $("#fb-button-add-new-derived-item").click(function () {
        var val = 1;
        $("#fb-div-derived-sortables").append('<div class="div-derived-item"><span>new item ' + x + '</span></div>');
        x++;
    });


    var ajax_request;

    $('#fb-div-jstree')
        .on('changed.jstree', function (e, data) {
            if (data.selected && data.selected.length == 1) {
                var select_node = data.instance.get_node(data.selected[0]);
                var node_id = select_node.id;
                var url = source_query_url;

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
     */
});

