jQuery(document).ready(function ($) {
    var selected_sources = [];
    var source_tabs = $('#fb-tabs-sources').tabs().css({
        'min-height': '850px'
    });

    var tab_counter = 0;
    var tab_template = "<li id='#{id}'><a href='#{href}'>#{label}</a><span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>";

    //removeAllEditor();

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

        update();
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


        //$("#" + tab_id).append("<div id='" + mce_id + "' style='height:600px'></div>");
        $("#" + tab_id).append("<textarea id='" + mce_id + "' style='height:600px'></textarea>");
        tinymce.execCommand('mceAddEditor', false, mce_id);

        // test only
        /*
        for (var i = 0; i < tinymce.editors.length; i++){
            var content = tinymce.editors[i].getContent(); // get the content
        }
        */

        //content = html_diff('<p>this is some text book</p>', '<p>this is some more text</p>'); // test

        tinymce.get(mce_id).setContent(content); // note: the get method does not work sometimes; not because the editor is not initialized yet.
        tinymce.get(mce_id).on('change', function (e) {
            update();
        });

        if (tab_counter == 0) {
            tinymce.get('fb-derived-mce').on('change', function (e) {
                update();
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

    function update() {
        updateHTMLDiff();
        updateSVG();
    }

    function updateHTMLDiff() {
        var derived_doc = tinymce.get('fb-derived-mce').getDoc();

        // get active tab id
        var tab_id = $("#fb-tabs-sources .ui-tabs-panel:visible").attr("id");
        if (typeof tab_id == typeof undefined || tab_id == null) return;
        var source_mce_id = tab_id.replace("fb-tabs-source", "fb-source-mce");
        var source_mce = tinymce.get(source_mce_id);

        $(derived_doc.body).children().each(function (index) {
            if ($(this).hasClass("fb_tinymce_left_column") == false && $(this).hasClass("fb_tinymce_left_column_icon") == false) {
                var source_id = $(this).attr('data-source-id');


                // need to bookmark the cursor position before calling .html(content);


                if (source_id && source_id != 'none') {
                    var source_element = source_mce.getDoc().getElementById(source_id);
                    if (source_element) {
                        var source_html = $(source_element).html().replace(/<del>/g, "").replace(/<\/del>/g, "");
                        var derive_html = $(this).html().replace(/<ins>/g, "").replace(/<\/ins>/g, "");

                        if (source_html != derive_html) {
                            // derive element
                            derive_html = html_diff(source_html, derive_html, 'insert');
                            $(this).html(derive_html); // probably lose the cursor position in this set function; see http://blog.squadedit.com/tinymce-and-cursor-position/

                            // source element
                            source_html = html_diff(source_html, derive_html, 'delete');
                            $(source_element).html(source_html); // probably lose the cursor position in this set content function
                            console.log("tinymce set content...");
                        }
                        else if (source_html == derive_html) {
                            // derive element
                            $(this).html(derive_html);

                            // source element
                            $(source_element).html(source_html);
                            console.log("tinymce set content...");
                        }
                    }
                    else {
                        var newHtml = $(this).html().replace(/<ins>/g, "").replace(/<\/ins>/g, ""); // remove all ins tags
                        var newHtml = "<ins>" + newHtml + "</ins>";
                        $(this).html(newHtml);
                        console.log("tinymce set content...");
                    }
                }
                else {
                    var newHtml = $(this).html().replace(/<ins>/g, "").replace(/<\/ins>/g, ""); // remove all ins tags
                    var newHtml = "<ins>" + newHtml + "</ins>";
                    $(this).html(newHtml);
                    console.log("tinymce set content...");
                }


                // need to set the cursor back to the bookmark position after content had been updated.



            }
        });

        tinymce.get('fb-derived-mce').focus();
    }

    function updateSVG() {
        var derived_doc = tinymce.get('fb-derived-mce').getDoc();

        // get active tab id
        var tab_id = $("#fb-tabs-sources .ui-tabs-panel:visible").attr("id");
        if (typeof tab_id == typeof undefined || tab_id == null) return;
        var source_mce_id = tab_id.replace("fb-tabs-source", "fb-source-mce");
        var source_mce = tinymce.get(source_mce_id);

        var source_iframe_container_top = getiFrameOffsetTop(source_mce.getDoc());
        var derived_iframe_container_top = getiFrameOffsetTop(derived_doc);

        if (source_iframe_container_top < 0 || derived_iframe_container_top < 0) return;

        var svg_container_top = $('#fb-td-mid-column').offset().top;

        var x_left = 0;
        var x_right = $('#fb-svg-mid-column').width();

        // remove all polygons
        $('#fb-svg-mid-column').find('.fb-svg-polygons').remove(); 

        $(derived_doc.body).children().each(function (index) {
            if ($(this).hasClass("fb_tinymce_left_column") == false && $(this).hasClass("fb_tinymce_left_column_icon") == false) {
                var source_id = $(this).attr('data-source-id');
                if (source_id && source_id != 'none') {
                    var source_element = source_mce.getDoc().getElementById(source_id);
                    if (source_element) {
                        var y_bottom_right = -1;
                        var y_top_right = -1;
                        var y_top_left = -1;
                        var y_bottom_left = -1;

                        // calculate y_bottom_right and y_top_right
                        if ($(this).attr('class') && $(this).attr('class').indexOf("fb-display-none") >= 0) {
                            var derived_bottom = getParentOffsetBottom($(this).attr("id"), derived_doc.body);
                            if (derived_bottom >= 0) {
                                derived_bottom += (derived_iframe_container_top - svg_container_top);
                                y_bottom_right = derived_bottom;
                                y_top_right = derived_bottom;
                            }
                        }
                        else {
                            var derived_height = $(this).height();
                            var derived_outer_height = $(this).outerHeight(true);
                            var derived_top = $(this).position().top;
                            var derived_padding_top = parseInt($(this).css('padding-top'), 10);
                            var derived_margin_top = parseInt($(this).css('margin-top'), 10);
                            derived_top += (derived_iframe_container_top - svg_container_top);
                            derived_top -= (derived_padding_top + derived_margin_top);

                            y_bottom_right = derived_top + derived_outer_height;
                            y_top_right = derived_top;
                        }

                        // calcuate y_top_left and y_bottom_left
                        if ($(source_element).attr('class') && $(source_element).attr('class').indexOf("fb-display-none") >= 0) {
                            var source_bottom = getParentOffsetBottom($(source_element).attr("id"), source_mce.getDoc().body);
                            if (source_bottom >= 0) {
                                source_bottom += (source_iframe_container_top - svg_container_top);
                                y_top_left = source_bottom;
                                y_bottom_left = source_bottom;
                            }
                        }
                        else {
                            var source_height = $(source_element).height();
                            var source_outer_height = $(source_element).outerHeight(true);
                            var source_top = $(source_element).position().top;
                            var source_padding_top = parseInt($(source_element).css('padding-top'), 10);
                            var source_margin_top = parseInt($(source_element).css('margin-top'), 10);
                            source_top += (source_iframe_container_top - svg_container_top);
                            source_top -= (source_padding_top + source_margin_top);
                            console.log($(source_element).attr('id') + ": " + source_outer_height);

                            y_top_left = source_top;
                            y_bottom_left = source_top + source_outer_height;
                        }

                        // update SVG 
                        if (y_bottom_right >= 0 && y_top_right >= 0 && y_top_left >= 0 && y_bottom_left >= 0) {
                            var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                            var points = "0," + y_top_left + " ";
                            points += "0," + y_bottom_left + " ";
                            points += x_right + "," + y_bottom_right + " ";
                            points += x_right + "," + y_top_right + " ";
                            polygon.setAttribute("points", points);
                            var x = source_element.innerHTML;
                            var y = $(this).html();
                            if (source_element.innerHTML == $(this).html()) {
                                polygon.setAttribute("fill", "lightgreen");
                            }
                            else {
                                polygon.setAttribute("fill", "lightpink");
                            }
                            polygon.setAttribute("class", "fb-svg-polygons");
                            document.getElementById('fb-svg-mid-column').appendChild(polygon);
                        }
                    }
                }
            }
        });
    }

    function getParentOffsetBottom(target_id, body) {
        var start = false;
        var bottom = -1;
        $($(body).children().get().reverse()).each(function () {
            if (start == false) {
                if ($(this).attr("id") && $(this).attr("id") == target_id) {
                    start = true;
                }
            }
            else {
                if ($(this).prop("tagName").toLowerCase() == 'h1' ||
                    $(this).prop("tagName").toLowerCase() == 'h2' ||
                    $(this).prop("tagName").toLowerCase() == 'h3') {
                    if (($(this).attr('class') && $(this).attr('class').indexOf("fb-display-none") < 0) ||
                        (!$(this).attr('class'))) {
                        var height = $(this).height();
                        var top = $(this).position().top;
                        var padding_bottom = parseInt($(this).css('padding-bottom'), 10);
                        var margin_bottom = parseInt($(this).css('margin-bottom'), 10);

                        bottom = top + height + padding_bottom + margin_bottom;
                        return false; // break 
                    }
                }
            }
        });

        return bottom;
    }

    function getiFrameOffsetTop(doc) {
        var iframes = document.getElementsByTagName("iframe");
        for (var i = 0; i < iframes.length; i++) {
            var iframe_doc = iframes[i].contentDocument || iframes[i].contentWindow.document;
            if (iframe_doc == doc) {
                //var containerDiv = iframes[i].parentNode;
                //return $(containerDiv).offset().top;
                return $(iframes[i]).offset().top;
            }
        }

        return -1;
    }

    function removeAllEditor() {
        var length = tinymce.editors.length;
        for (var i = length; i > 0; i--) {
            tinymce.execCommand('mceRemoveEditor', false, tinymce.editors[i-1].id);
        };
    }
});

