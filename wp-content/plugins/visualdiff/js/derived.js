jQuery(document).ready(function ($) {
    var selected_sources = [];
    var source_tabs = $('#fb-tabs-sources').tabs().css({
        'min-height': '850px'
    });

    var tab_counter = 0;
    var tab_template = "<li id='#{id}'><a href='#{href}'>#{label}</a><span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>";

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
                                var obj = JSON.parse(data);
                                addSourceTab(obj.title, obj.content);
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

    function addSourceTab(title, content) {
        var tab_id = "fb-tabs-source-" + tab_counter;
        var mce_id = 'fb-source-mce-' + tab_counter;
        var li_id = tab_id + "-selector";
        var li = $(tab_template.replace(/#\{href\}/g, "#" + tab_id).replace(/#\{label\}/g, title).replace(/#\{id\}/g, li_id));

        $("#fb-ul-source-tabs").append(li);
        source_tabs.append("<div id='" + tab_id + "' style='padding-left:5px;padding-right:5px'></div>");


        $("#" + tab_id).append("<div id='" + mce_id + "' style='height:600px'></div>");

        tinymce.execCommand('mceAddEditor', false, mce_id);
        tinymce.get(mce_id).setContent(content); // note: the get method does not work sometimes

        if (tab_counter == 0) {
            tinymce.get('fb-derived-mce').on('change', function (e) {
                updateSVG($(this.getDoc()));
            });

            source_tabs.removeClass('fb-tabs-sources-display-none');
        }

        source_tabs.tabs("refresh");
        source_tabs.tabs("option", "active", $('#' + li_id).index());
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

    function updateSVG(derived_doc) {
        // get active tab id
        var tab_id = $("#fb-tabs-sources .ui-tabs-panel:visible").attr("id");
        if (typeof tab_id == typeof undefined || tab_id == null) return;
        var source_mce_id = tab_id.replace("fb-tabs-source", "fb-source-mce");
        var source_mce = tinymce.get(source_mce_id);

        var source_iframe_container_top = getiFrameOffsetTop(source_mce.getDoc());
        var derived_iframe_container_top = getiFrameOffsetTop(derived_doc[0]);

        if (source_iframe_container_top < 0 || derived_iframe_container_top < 0) return;

        var svg_container_top = $('#fb-td-mid-column').offset().top;

        var x_left = 0;
        var x_right = $('#fb-svg-mid-column').width();
        $('#fb-svg-mid-column').find('.fb-svg-polygons').remove(); // clear all polygons

        $(derived_doc[0].body).children().each(function (index) {
            if ($(this).hasClass("fb_tinymce_left_column") == false && $(this).hasClass("fb_tinymce_left_column_icon") == false) {
                var source_id = $(this).attr('data-source-id');
                if (source_id && source_id != 'none') {
                    var source_element = source_mce.getDoc().getElementById(source_id);
                    if (source_element) {
                        var derived_height = $(this).height();
                        var derived_top = $(this).position().top;
                        derived_top += (derived_iframe_container_top - svg_container_top);

                        var source_height = $(source_element).height();
                        var source_outer_height = $(source_element).outerHeight();
                        var source_top = $(source_element).position().top;
                        source_top += (source_iframe_container_top - svg_container_top);

                        var y_top_left = source_top;
                        var y_bottom_left = source_top + source_height;
                        var y_bottom_right = derived_top + derived_height;
                        var y_top_right = derived_top;

                        var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        var points = "0," + y_top_left + " ";
                        points += "0," + y_bottom_left + " ";
                        points += x_right + "," + y_bottom_right + " ";
                        points += x_right + "," + y_top_right + " ";
                        polygon.setAttribute("points", points);
                        polygon.setAttribute("fill", "lightgreen");
                        polygon.setAttribute("class", "fb-svg-polygons");
                        document.getElementById('fb-svg-mid-column').appendChild(polygon);
                    }
                }
            }
        });
    }

    function getiFrameOffsetTop(doc) {
        var iframes = document.getElementsByTagName("iframe");
        for (var i = 0; i < iframes.length; i++) {
            var iframe_doc = iframes[i].contentDocument || iframes[i].contentWindow.document;
            if (iframe_doc == doc) {
                var containerDiv = iframes[i].parentNode;
                return $(containerDiv).offset().top;
            }
        }

        return -1;
    }
});

