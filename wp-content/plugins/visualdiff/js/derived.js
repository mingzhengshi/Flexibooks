jQuery(document).ready(function ($) {
    var derived_mce_init_done = false;
    var source_mce_init_count = 0;

    var meta_source_tabs_post_ids = [];
    var meta_source_versions = []; // list of objects
    var previous_source_revisions = []; // list of previous source revisions for merge

    var floating_sources = true;
    var highlighting_source = false;  
    var source_tab_original_margin_top = -1;

    // source tabs
    var selected_sources = [];
    var source_tabs = $('#fb-tabs-sources').tabs().css({
        'min-height': '850px'
    });
    var tab_counter = 0;
    var tab_template = "<li id='#{id}'><a href='#{href}'>#{label}</a><span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>";

    //----------------------------------------------------------------------------------------
    // source tabs

    // close icon: removing the tab on click
    source_tabs.delegate("span.ui-icon-close", "click", function () {
        var panelId = $(this).closest("li").remove().attr("aria-controls");
        $("#" + panelId).remove();
        source_tabs.tabs("refresh");

        var post_id = meta_source_tabs_post_ids[panelId];
        var index = meta_source_tabs_post_ids.indexOf(post_id);
        if (index >= 0) meta_source_tabs_post_ids.splice(index, 1);
        delete meta_source_tabs_post_ids[panelId]; // also remove the property

        updateSourceTabsInput();
    });

    source_tabs.on("tabsactivate", function (event, ui) {
        console.log("tab activate...");
        //var active_tab_id = $(".ui-state-active").attr("id");
        $tabIndex = $('#fb-tabs-sources').tabs('option', 'active');
        var $selected = $("#fb-tabs-sources ul>li a").eq($tabIndex).attr('href');

        setupOldSourceMce();
        update();
    });

    //----------------------------------------------------------------------------------------
    // init

    flexibook.regDerivedElementMouseUpCallback(function (post_id, d_id) {
        var index = meta_source_tabs_post_ids.indexOf(post_id);
        if (index >= 0) {
            //$('#fb-tabs-sources').tabs('select', index);
            $('#fb-tabs-sources').tabs("option", "active", index);
        }

        setupOldSourceMce();

        if (floating_sources) {
            updateSourcePosition(d_id);
        }

        update();
    });

    flexibook.regDeriveUpdateCallback(function () {
        update();
    });

    flexibook.regOnDragEndCallback(function () {
        var derived_doc = tinymce.get('fb-derived-mce').getDoc();
        var dragged_item = derived_doc.getElementById(flexibook.dragged_item_id);
        $(dragged_item).removeClass('fb_tinymce_dragging');
        $(dragged_item).css('opacity', 1);

        //update();
    });


    flexibook.regDeriveMceInitCallback(function () {
        if (derived_mce_init_done == true) return;

        $("#fb-button-open-source-document").prop('disabled', false);

        // meta: opened source tabs 
        var opened_source_tabs_ids = $("#fb-input-source-tabs").val();
        $("#fb-input-source-tabs").val(""); // reset

        if (opened_source_tabs_ids != null && opened_source_tabs_ids.trim().length > 0) {
            var ids = opened_source_tabs_ids.split(";");
            for (var i = 0; i < ids.length - 1; i++) {
                getSourcePostInit(ids[i].trim(), ids.length - 1);
            }
        }

        // meta: derived document
        var derived_meta_string = $("#fb-input-derived-meta").val();
        if (derived_meta_string != null && derived_meta_string.trim().length > 0) {
            meta_source_versions = JSON.parse(derived_meta_string);
        }

        // get previous source version for merge
        //getPreviousSourceVersions();

        derived_mce_init_done = true;
    });

    flexibook.regMergeIconClickCallback(function (icon, post_id, s_id, d_id, mcase) {
        var new_doc = null;
        for (var i = 0; i < tinymce.editors.length; i++) {
            if (tinymce.editors[i].post_id == post_id) {
                new_doc = tinymce.editors[i].getDoc();
                break;
            }
        }
        if (!new_doc) return;
        if (!mcase) return;

        var old_content = getSourceRevisionContent(post_id);
        if (!old_content) return;

        var old_mce = tinymce.get("fb-invisible-editor");
        old_mce.setContent(old_content);
        var old_doc = old_mce.getDoc();

        var derived_doc = tinymce.get('fb-derived-mce').getDoc();

        switch (mcase) {
            // case 1:
            // source documen is modified; derive document is unchanged
            case "1":
                // accept the changes in the new source document
                if (icon == '10003') {
                    var source = new_doc.getElementById(s_id);
                    var derive = derived_doc.getElementById(d_id);
                    $(source).find('.delete-merge').remove();
                    var clean = unwrapDeleteInsertTag(source);

                    $(source).html(clean);
                    $(derive).html(clean);
                    $(derive).css('border-style', 'none');

                    if ($(source).attr('data-merge-case')) $(source).removeAttr('data-merge-case');
                    if ($(derive).attr('data-merge-case')) $(derive).removeAttr('data-merge-case');

                    setNumberOfMergeRequests(post_id, -1);
                }
                // ignore the changes in the new source document
                else if (icon == '10007') {
                    // ms - does not consider multiple ids in one paragraph
                    var source = new_doc.getElementById(s_id);
                    var derive = derived_doc.getElementById(d_id);
                    var old_source = old_doc.getElementById(s_id);

                    $(source).find('.delete-merge').remove();
                    var clean = unwrapDeleteInsertTag(source);
                    $(source).html(clean);

                    var old_clean = unwrapDeleteInsertTag(old_source);
                    $(derive).html(old_clean);
                    $(derive).css('border-style', 'none');

                    if ($(source).attr('data-merge-case')) $(source).removeAttr('data-merge-case');
                    if ($(derive).attr('data-merge-case')) $(derive).removeAttr('data-merge-case');

                    setNumberOfMergeRequests(post_id, -1);
                }

                update();
                break;
                // case 3:
                // source documen is modified; derive document is modified
            case "3":
                // show more options 
                if (icon == '8681') {
                    // derive document
                    /*
                    var derive_element = derived_doc.getElementById(d_id);
                    if (derive_element) {

                        var clone = $(derive_element).clone();
                        var clean_html = unwrapDeleteInsertTag(clone);
                        var cid = $(clone).attr('id');

                        $(clone).html(clean_html);
                        $(clone).css('background-color', '#e8e8e8');
                        $(clone).attr('id', 'mcase-' + cid);
                        $(clone).addClass('fb_tinymce_left_column_text');

                        var outer = $(derive_element).prop('outerHTML') + $(clone).prop('outerHTML');
                        $(derive_element).prop('outerHTML', outer);

                    }
                    */


                }
                else if (icon == '10003') {
                    // derive document
                    // ms - does not consider multiple ids in one paragraph

                    // note: always remove option 2 
                    if (d_id.indexOf('-option2') >= 0) {
                        var op1_id = d_id.substr(0, d_id.length - 8);

                        var source = new_doc.getElementById(s_id);
                        var derive_op1 = derived_doc.getElementById(op1_id);
                        var derive_op2 = derived_doc.getElementById(d_id);

                        $(source).find('.delete-merge').remove();
                        var clean = unwrapDeleteInsertTag(source);
                        $(source).html(clean);

                        $(derive_op2).find('.delete-merge').remove();
                        clean = unwrapDeleteInsertTag(derive_op2);
                        $(derive_op1).html(clean);

                        $(derive_op1).css('border-style', 'none');
                        //$(derive_op1).css('margin-left', '0px');

                        if ($(source).attr('data-merge-case')) $(source).removeAttr('data-merge-case');
                        if ($(derive_op1).attr('data-merge-case')) $(derive_op1).removeAttr('data-merge-case');

                        $(derive_op2).remove();
                    }
                    else {
                        var source = new_doc.getElementById(s_id);
                        var derive = derived_doc.getElementById(d_id);

                        $(source).find('.delete-merge').remove();
                        var clean = unwrapDeleteInsertTag(source);
                        $(source).html(clean);

                        $(derive).find('.delete-merge').remove();
                        clean = unwrapDeleteInsertTag(derive);
                        $(derive).html(clean);

                        $(derive).css('border-style', 'none');
                        //$(derive).css('margin-left', '0px');

                        if ($(source).attr('data-merge-case')) $(source).removeAttr('data-merge-case');
                        if ($(derive).attr('data-merge-case')) $(derive).removeAttr('data-merge-case');

                        var derive_op2 = derived_doc.getElementById(d_id + '-option2');
                        $(derive_op2).remove();
                    }

                    setNumberOfMergeRequests(post_id, -1);
                }

                update();
                break;
            // case 5:
            // add item in source document; section exists in derived document
            case "5":
                // source document
                if (icon == '10003') {
                    var source = new_doc.getElementById(s_id);
                    var derive = derived_doc.getElementById(d_id);
                    var clean = unwrapDeleteInsertTag(source);

                    $(source).html(clean);
                    $(derive).html(clean);
                    $(derive).css('border-style', 'none');

                    if ($(source).attr('data-merge-case')) $(source).removeAttr('data-merge-case');
                    if ($(derive).attr('data-merge-case')) $(derive).removeAttr('data-merge-case');

                    setNumberOfMergeRequests(post_id, -1);
                }
                // ignore the changes in the new source document
                else if (icon == '10007') {
                    var source = new_doc.getElementById(s_id);
                    var derive = derived_doc.getElementById(d_id);
                    var clean = unwrapDeleteInsertTag(source);

                    $(source).html(clean);
                    $(derive).remove();

                    if ($(source).attr('data-merge-case')) $(source).removeAttr('data-merge-case');

                    setNumberOfMergeRequests(post_id, -1);
                }

                update();
                break;
            case "6":
                if (icon == '10003') {
                    var source = new_doc.getElementById(s_id);
                    var derive = derived_doc.getElementById(d_id);

                    $(source).remove();
                    $(derive).remove();
                    setNumberOfMergeRequests(post_id, -1);
                }
                // ignore the changes in the new source document
                else if (icon == '10007') {
                    // derive document
                    // ms - does not consider multiple ids in one paragraph
                    var source = new_doc.getElementById(s_id);
                    var derive = derived_doc.getElementById(d_id);
                    var clean = unwrapDeleteInsertTag(derive);

                    $(source).remove();                   
                    $(derive).html(clean);
                    $(derive).css('border-style', 'none');
                    if ($(derive).attr('data-merge-case')) $(derive).removeAttr('data-merge-case');
                    setNumberOfMergeRequests(post_id, -1);
                }

                update();
                break;
        }
    });

    $("#fb-button-floating-source").button().click(function () {
        var this_button = $("#fb-button-floating-source");
        if (this_button.attr('value') == "Turn Off Floating") {
            this_button.attr('value', 'Turn On Floating');
            floating_sources = false;

            if (source_tab_original_margin_top >= 0) {
                $('#fb-tabs-sources').css('margin-top', source_tab_original_margin_top);
            }

            if (flexibook.columns_of_editors == 3) {
                $("#fb-div-old-source-mce").css('margin-top', 0);
            }

            update();
        }
        else if (this_button.attr('value') == "Turn On Floating") {
            this_button.attr('value', 'Turn Off Floating');
            floating_sources = true;
        }
    });

    $("#fb-button-highlight-source").button().click(function () {
        var this_button = $("#fb-button-highlight-source");
        if (this_button.attr('value') == "Turn Off Source Highlight") {
            this_button.attr('value', 'Turn On Source Highlight');
            highlighting_source = false;
        }
        else if (this_button.attr('value') == "Turn On Source Highlight") {
            this_button.attr('value', 'Turn Off Source Highlight');
            highlighting_source = true;
        }

        update();
    });

    $("#fb-button-show-previous-source").button().click(function () {
        togglePreviousSource();
    });
    $("#fb-button-show-previous-source").prop('disabled', true);

    flexibook.regShowPreviousSourceIconClickCallback(function () {
        togglePreviousSource();
    });

    function togglePreviousSource() {
        var this_button = $("#fb-button-show-previous-source");
        if (this_button.attr('value') == "Show Previous Source") {
            flexibook.columns_of_editors = 3;
            this_button.attr('value', 'Hide Previous Source');

            var table = $('#fb-table-derive-document-editors');
            table.find('tr').each(function () {
                $(this).find('td').eq(0).after('<td id="fb-td-merge-mid-column"><svg id="fb-svg-merge-mid-column" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg"/></svg></td>');
                $(this).find('td').eq(1).after('<td id="fb-td-old-source-mce" style="vertical-align:top"><h3 id="fb-old-source-heading" style="margin-bottom:8px">Source Document</h3><div id="fb-div-old-source-mce"></div></td>');
            });

            table.find('colgroup').each(function () {
                $(this).empty();
                $(this).append('<col span="1" style="width: 32%;">');
                $(this).append('<col span="1" style="width: 2%;">');
                $(this).append('<col span="1" style="width: 32%;">');
                $(this).append('<col span="1" style="width: 2%;">');
                $(this).append('<col span="1" style="width: 32%;">');
                return false;
            });

            $("#fb-div-old-source-mce").append("<textarea id='fb-old-source-mce' style='height:600px'></textarea>");
            tinymce.execCommand('mceAddEditor', false, 'fb-old-source-mce');

            setupOldSourceMce();

            update();
        }
        else if (this_button.attr('value') == "Hide Previous Source") {
            flexibook.columns_of_editors = 2;
            this_button.attr('value', 'Show Previous Source');

            var table = $('#fb-table-derive-document-editors');

            tinymce.execCommand('mceRemoveEditor', false, 'fb-old-source-mce');

            table.find('tr').each(function () {
                $(this).find('td').eq(2).remove();
                $(this).find('td').eq(1).remove();
            });

            table.find('colgroup').each(function () {
                $(this).empty();
                $(this).append('<col span="1" style="width: 49%;">');
                $(this).append('<col span="1" style="width: 2%;">');
                $(this).append('<col span="1" style="width: 49%;">');
                return false;
            });

            update();
        }
    }

    function setupOldSourceMce() {
        if (flexibook.columns_of_editors == 3) {
            var old_mce = tinymce.get('fb-old-source-mce');

            // get active tab id
            var tab_id = $("#fb-tabs-sources .ui-tabs-panel:visible").attr("id");
            if (typeof tab_id == typeof undefined || tab_id == null) return;
            var source_mce_id = tab_id.replace("fb-tabs-source", "fb-source-mce");
            var source_mce = tinymce.get(source_mce_id);
            var post_id = source_mce.post_id;

            var revision_date = getSourceRevisionDate(post_id);
            if (revision_date == null) revision_date = 'latest';
            $('#fb-old-source-heading').html('Old Source (' + revision_date + ')');

            var old_content = getSourceRevisionContent(post_id);
            old_mce["post_id"] = post_id; // ms
            if (old_content != null) {
                old_mce.setContent(old_content);
            }
            else {
                var content = source_mce.getContent();
                old_mce.setContent(content);
            }
        }
    }

    function getSourcePostInit(post_id, total) {
        $.post(ajaxurl,
            {
                'action': 'fb_source_query',
                'id': post_id
            },
            function (data, status) {
                if (status.toLowerCase() == "success") {
                    //var outer_text = data.htmltext;
                    var obj = JSON.parse(data);
                    addSourceTab(obj.title, obj.content, obj.modified, post_id);

                    source_mce_init_count++;
                    if (source_mce_init_count == total) {
                        // add tinymce editor
                        //addTinyMceEditor("#fb-invisible-editor");
                        tinymce.execCommand('mceAddEditor', false, 'fb-invisible-editor');

                        // hide source document toolbars
                        $('#fb-td-source-mces').find('.mce-toolbar-grp').each(function () {
                            $(this).css('display', 'none');
                        });

                        updateMetaSourceVersions();
                        getPreviousSourceVersions();
                    }
                }
                else {
                }
            });
    }

    function getPreviousSourceVersions() {
        if (!meta_source_versions || meta_source_versions.length <= 0) return;

        for (var i = 0; i < meta_source_versions.length; i++) {
            if (meta_source_versions[i].source_post_previous_version != meta_source_versions[i].source_post_current_version) {
                getSourcePostRevision(meta_source_versions[i].source_post_id, meta_source_versions[i].source_post_previous_version);
                //$("#fb-button-show-previous-source").prop('disabled', false);
            }
        }

        /*
        if (!isMergeMode()) {
            update();
        }
        */
    }

    function getSourcePostRevision(post_id, post_modified) {
        $.post(ajaxurl,
            {
                'action': 'fb_source_revision_query',
                'id': post_id,
                'post_modified': post_modified
            },
            function (data, status) {
                if (status.toLowerCase() == "success") {
                    var obj = JSON.parse(data);
                    createSourceRevisionObject(post_id, post_modified, obj.content);
                    compareSourceRevisions(post_id, obj.content);

                    // ms
                    if (isMergeMode()) {
                        var derived_doc = tinymce.get('fb-derived-mce').getDoc();
                        $(derived_doc.body).css('margin-right', 100);
                    }

                    // call tinymce plugin function
                    //tinymce.get('fb-derived-mce').plugins.fb_folding_editor.update(); 

                    update();
                }
                else {
                }
            });
    }

    function createSourceRevisionObject(post_id, post_modified, post_content) {
        var obj = new Object();

        obj['post_id'] = post_id;
        obj['post_modified'] = post_modified;
        obj['post_content'] = post_content;

        previous_source_revisions.push(obj);
    }

    function getSourceRevisionContent(post_id) {
        for (var i = 0; i < previous_source_revisions.length; i++) {
            if (previous_source_revisions[i].post_id == post_id) {
                return previous_source_revisions[i].post_content;
            }
        }
        return null;
    }

    function getSourceRevisionDate(post_id) {
        for (var i = 0; i < previous_source_revisions.length; i++) {
            if (previous_source_revisions[i].post_id == post_id) {
                return previous_source_revisions[i].post_modified;
            }
        }
        return null;
    }

    function compareSourceRevisions(post_id, old_content) {
        for (var i = 0; i < tinymce.editors.length; i++) {
            if (tinymce.editors[i].post_id == post_id) {
                var new_doc = tinymce.editors[i].getDoc();

                var derived_doc = tinymce.get('fb-derived-mce').getDoc();
                var old_mce = tinymce.get("fb-invisible-editor");
                old_mce.setContent(old_content);
                var old_doc = old_mce.getDoc();

                // cases 1, 2, 3, 4, 5
                $(new_doc.body).children().each(function (index) {
                    var n_this = $(this);
                    if (isTinymceAdminElement(n_this)) return true; // continue
                    var id = n_this.attr('id');
                    if (id && id != 'none') {
                        var exist_old_source = false;
                        var exist_derive = false;

                        var old_element = '';

                        $(old_doc.body).find("[id]").each(function () {
                            if ($(this).attr('id').trim() == id) {
                                exist_old_source = true;
                                old_element = $(this).html();
                                return false; // break 
                            }
                        });

                        // if the id exist in the old source 
                        if (exist_old_source) {
                            var new_element = unwrapDeleteInsertTagjQuery(n_this);

                            if (new_element.trim() != old_element.trim()) {
                                // derive element                                  
                                $(derived_doc.body).find("[id]").each(function () {
                                    if ($(this).attr('data-source-id') && $(this).attr('data-source-id').trim() == id) {
                                        exist_derive = true;

                                        var derive_element = unwrapDeleteInsertTagjQuery($(this));

                                        // merge case 1:
                                        if (derive_element.trim() == old_element.trim()) {
                                            $(this).attr('data-merge-case', 1);
                                            $(this).css('border-style', 'dotted');
                                            $(this).css('border-width', '1px');
                                            $(this).css('border-color', 'orange');
                                            setNumberOfMergeRequests(post_id, 1);

                                            // base element
                                            var diff = html_diff_compact(derive_element, new_element);
                                            $(this).html(diff);

                                            $(this).find('span.insert').each(function () {
                                                $(this).addClass('insert-merge');
                                            });

                                            $(this).find('span.delete').each(function () {
                                                $(this).addClass('delete-merge');
                                            });

                                            n_this.html(diff);

                                            n_this.find('span.insert').each(function () {
                                                $(this).addClass('insert-merge');
                                            });

                                            n_this.find('span.delete').each(function () {
                                                $(this).addClass('delete-merge');
                                            });

                                            n_this.attr('data-merge-case', 1); 
                                        }
                                        // merge case 3:
                                        else {
                                            $(this).attr('data-merge-case', 3);
                                            $(this).css('border-style', 'dotted');
                                            $(this).css('border-width', '1px');
                                            $(this).css('border-color', 'orange');

                                            //$(this).css('margin-left', '50px');
                                            setNumberOfMergeRequests(post_id, 1);
                                            
                                            var d_diff = html_diff_compact(old_element, derive_element);
                                            $(this).html(d_diff);

                                            $(this).find('span.insert').each(function () {
                                                $(this).addClass('insert-merge');
                                            });

                                            $(this).find('span.delete').each(function () {
                                                $(this).addClass('delete-merge');
                                            });

                                            var s_diff = html_diff_compact(old_element, new_element);
                                            n_this.html(s_diff);

                                            n_this.find('span.insert').each(function () {
                                                $(this).addClass('insert-merge');
                                            });

                                            n_this.find('span.delete').each(function () {
                                                $(this).addClass('delete-merge');
                                            });

                                            n_this.attr('data-merge-case', 3);
                                            
                                            var op2 = $(this).clone();
                                            $(op2).css('margin-bottom', '3px');
                                            $(op2).attr('id', $(this).attr('id') + '-option2');
                                            $(op2).html(s_diff);

                                            $(op2).find('span.insert').each(function () {
                                                $(this).addClass('insert-merge');
                                            });

                                            $(op2).find('span.delete').each(function () {
                                                $(this).addClass('delete-merge');
                                            });

                                            $(op2).insertBefore($(this));                                           
                                        }

                                        return false; // break each function
                                    }
                                });

                                if (exist_derive == false) {
                                    // merge case 2: delete in derive, no changes or modified in source
                                    /*
                                    // source document
                                    if (n_this.prop("tagName").toLowerCase() != 'h1' &&
                                        n_this.prop("tagName").toLowerCase() != 'h2' &&
                                        n_this.prop("tagName").toLowerCase() != 'h3') {
                                        var p_exist = false;
                                        var pid = getParentID(new_doc.body, n_this.attr('id'));
                                        if (pid != null) {
                                            $(derived_doc.body).find("[id]").each(function () {
                                                if ($(this).attr('data-source-id') && $(this).attr('data-source-id').trim() == pid) {
                                                    p_exist = true;
                                                    return false;
                                                }
                                            });
                                        }

                                        // use merge case 5:
                                        if (p_exist) {
                                            n_this.attr('data-merge-case', 5);
                                            n_this.css('background-color', 'lightgreen');
                                            setNumberOfMergeRequests(post_id, 1);
                                        }
                                    }
                                    */
                                }
                                else {
                                    // source document
                                    //$(this).css('background-color', 'lightpink');
                                }
                            }
                        }
                        else {
                            // source document
                            if (n_this.prop("tagName").toLowerCase() != 'h1' &&
                                n_this.prop("tagName").toLowerCase() != 'h2' &&
                                n_this.prop("tagName").toLowerCase() != 'h3') {
                                var p_exist = false;
                                var pid = getParentID(new_doc.body, n_this.attr('id'));
                                if (pid != null) {
                                    $(derived_doc.body).find("[id]").each(function () {
                                        if ($(this).attr('data-source-id') && $(this).attr('data-source-id').trim() == pid) {
                                            p_exist = true;
                                            return false;
                                        }
                                    });
                                }

                                // merge case 5:
                                if (p_exist) {
                                    var html = n_this.html();
                                    var html = "<span class='insert insert-merge'>" + html + "</span>";
                                    n_this.html(html);
                                    n_this.attr('data-merge-case', 5); // this modification is in memory only, will not be saved to database
                                    addNewItemToDerive(n_this, new_doc, derived_doc, post_id);
                                    setNumberOfMergeRequests(post_id, 1);
                                }
                            }

                            // merge case 5:
                            /*
                            var html = n_this.html();
                            var html = "<span class='insert insert-merge'>" + html + "</span>";
                            n_this.html(html);
                            n_this.attr('data-merge-case', 5); // this modification is in memory only, will not be saved to database
                            addNewItemToDerive(n_this, new_doc, derived_doc, post_id);
                            setNumberOfMergeRequests(post_id, 1);
                            */
                        }
                    }
                });

                // cases 6, 7, 8
                $(old_doc.body).children().each(function (index) {
                    var o_this = $(this);
                    //if (o_this.hasClass("fb_tinymce_left_column") == false && o_this.hasClass("fb_tinymce_left_column_icon") == false) {
                    if (isTinymceAdminElement(o_this)) return true; // continue
                    var id = o_this.attr('id');
                    if (id && id != 'none') {
                        var exist_new_source = false;
                        var exist_derive = false;

                        $(new_doc.body).find("[id]").each(function () {
                            if ($(this).attr('id').trim() == id) {
                                exist_new_source = true;
                                return false; // break
                            }
                        });

                        // cases 6, 7, 8: deleted in new source document
                        if (!exist_new_source) {
                            $(derived_doc.body).find("[id]").each(function () {
                                if ($(this).attr('data-source-id') && $(this).attr('data-source-id').trim() == id) {
                                    // case 6: exist in derived document
                                    exist_derive = true;
                                    addDeleteItemToSource(o_this, new_doc, old_doc, post_id);
                                    $(this).attr('data-merge-case', 6);
                                    $(this).css('border-style', 'dotted');
                                    $(this).css('border-width', '1px');
                                    $(this).css('border-color', 'orange');
                                    //var html = $(this).html();
                                    var html = unwrapDeleteInsertTagjQuery($(this));
                                    var html = "<span class='delete delete-merge'>" + html + "</span>";
                                    $(this).html(html);
                                    //$(this).css('background-color', 'lightpink');
                                    setNumberOfMergeRequests(post_id, 1);
                                    return false; // break each function
                                }
                            });

                            // case 7: not exist in derived document
                            if (!exist_derive) {
                                // do nothing
                            }
                        }



                    }
                });

                break;
            }
        };
    }

    // merge case 6: delete item in source, unchange in derive
    function addDeleteItemToSource(element, new_doc, old_doc, post_id) {
        var clone = element.clone();
        var s_id = $(clone).attr('id').trim();
        var parent_id = getParentID(old_doc.body, s_id);
        var prev_id = getPreviousID(old_doc.body, s_id);
        var next_id = getNextID(old_doc.body, s_id);

        var found = false;
        if (parent_id != null && prev_id != null) {
            $($(new_doc.body).children().get().reverse()).each(function () {
                if ($(this).attr("id") && $(this).attr("id") == prev_id) {
                    $(clone).attr('data-merge-case', 6);

                    var html = unwrapDeleteInsertTag(clone);
                    //var html = $(clone).html();
                    var html = "<span class='delete delete-merge'>" + html + "</span>";
                    $(clone).html(html);
                    $(clone).insertAfter($(this));

                    found = true;
                    return false;
                }
            });
        }

        // if prev paragraph is not found in new source document
        if (found == false) {
            if (parent_id != null && next_id != null) {
                $($(new_doc.body).children().get().reverse()).each(function () {
                    if ($(this).attr("id") && $(this).attr("id") == next_id) {
                        $(clone).attr('data-merge-case', 6);

                        var html = unwrapDeleteInsertTag(clone);
                        var html = "<span class='delete delete-merge'>" + html + "</span>";
                        $(clone).html(html);
                        $(clone).insertBefore($(this));
                        found = true;
                        return false;
                    }
                });
            }
        }

        // if next paragraph is also not found in new source document
        if (found == false) {

        }
    }

    // merge case 5: add item in source, where section exists in derive
    function addNewItemToDerive(element, new_doc, derived_doc, post_id) {
        var clone = element.clone();
        var s_id = $(clone).attr('id').trim();
        var parent_id = getParentID(new_doc.body, s_id);
        var prev_id = getPreviousID(new_doc.body, s_id);
        var next_id = getNextID(new_doc.body, s_id);

        var found = false;
        if (parent_id != null && prev_id != null) {
            $($(derived_doc.body).children().get().reverse()).each(function () {
                if ($(this).attr("data-source-id") && $(this).attr("data-source-id") == prev_id) {
                    $(clone).attr('data-merge-case', 5);
                    $(clone).attr("data-source-post-id", post_id);
                    $(clone).css('border-style', 'dotted');
                    $(clone).css('border-width', '1px');
                    $(clone).css('border-color', 'orange');

                    //var newHtml = unwrapDeleteInsertTagjQuery(comp);
                    var html = $(clone).html();
                    var html = "<span class='insert'>" + html + "</span>";
                    $(clone).html(html);
                    $(clone).insertAfter($(this));

                    //var callback = flexibook.addMergeIconsCallback;
                    //if (callback) callback($(clone).attr('id'));

                    found = true;
                    return false;
                }
            });
        }

        // if prev paragraph is not found in derive document
        if (found == false) {
            if (parent_id != null && next_id != null) {
                $($(derived_doc.body).children().get().reverse()).each(function () {
                    if ($(this).attr("data-source-id") && $(this).attr("data-source-id") == next_id) {
                        $(clone).attr('data-merge-case', 5);
                        $(clone).attr("data-source-post-id", post_id);
                        $(clone).css('border-style', 'dotted');
                        $(clone).css('border-width', '1px');
                        $(clone).css('border-color', 'orange');
                        var html = $(clone).html();
                        var html = "<span class='insert'>" + html + "</span>";
                        $(clone).html(html);
                        $(clone).insertBefore($(this));
                        found = true;
                        return false;
                    }
                });
            }
        }

        // if next paragraph is also not found in derive document
        if (found == false) {

        }
    }

    function setNumberOfMergeRequests(post_id, value) {
        if (!meta_source_versions || meta_source_versions.length <= 0) return;

        for (var j = 0; j < meta_source_versions.length; j++) {
            if (post_id == meta_source_versions[j].source_post_id) {
                meta_source_versions[j]['number_of_merges'] += value;
                if (value == -1 && meta_source_versions[j]['number_of_merges'] == 0) {
                    meta_source_versions[j]['source_post_previous_version'] = meta_source_versions[j]['source_post_current_version']
                }
                break;
            }
        }
    }

    function isMergeMode() {
        if (!meta_source_versions || meta_source_versions.length <= 0) return false;

        for (var i = 0; i < meta_source_versions.length; i++) {
            if (meta_source_versions[i].number_of_merges > 0) {
                return true;
            }
        }

        return false;
    }

    function getParentID(body, id) {
        var start = false;
        var parent = null;
        $($(body).children().get().reverse()).each(function () {
            if (start == false) {
                if ($(this).attr("id") && $(this).attr("id") == id) {
                    start = true;
                }
            }
            else {
                if ($(this).prop("tagName").toLowerCase() == 'h1' ||
                    $(this).prop("tagName").toLowerCase() == 'h2' ||
                    $(this).prop("tagName").toLowerCase() == 'h3') {
                    parent = $(this).attr('id');
                    return false;
                }
            }
        });

        return parent;
    }

    function getPreviousID(body, id) {
        var start = false;
        var previous = null;
        $($(body).children().get().reverse()).each(function () {
            if (start == true) {
                previous = $(this).attr('id');
                return false;
            }

            if (start == false) {
                if ($(this).attr("id") && $(this).attr("id") == id) {
                    start = true;
                }
            }
        });

        return previous;
    }

    function getNextID(body, id) {
        var start = false;
        var next = null;
        $($(body).children().get()).each(function () {
            if (start == true) {
                next = $(this).attr('id');
                return false;
            }

            if (start == false) {
                if ($(this).attr("id") && $(this).attr("id") == id) {
                    start = true;
                }
            }
        });

        return next;
    }

    //----------------------------------------------------------------------------------------
    // source selection dialog
    var fb_source_selection_dialog = $("#fb-source-selection-dialog").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            Open: function () {
                //addTab();
                for (var i = 0; i < selected_sources.length; i++) {
                    var post_id = selected_sources[i];
                    getSourcePost(post_id);
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

    $("#fb-button-open-source-document").button().click(function () {
        selected_sources.splice(0);
        $('#fb-selectable-source-list .ui-selected').removeClass('ui-selected');
        fb_source_selection_dialog.dialog("open");
    });
    $("#fb-button-open-source-document").prop('disabled', true);
    //$("#fb-button-open-source-document").addClass('merge-green');

    function getSourcePost(post_id) {
        $.post(ajaxurl,
            {
                'action': 'fb_source_query',
                'id': post_id
            },
            function (data, status) {
                if (status.toLowerCase() == "success") {
                    //var outer_text = data.htmltext;
                    var obj = JSON.parse(data);
                    addSourceTab(obj.title, obj.content, obj.modified, post_id);
                }
                else {
                }
            });
    }

    function addSourceTab(title, content, post_modified, post_id) {
        var tab_id = "fb-tabs-source-" + tab_counter;
        var mce_id = 'fb-source-mce-' + tab_counter;
        var li_id = tab_id + "-selector";
        var li = $(tab_template.replace(/#\{href\}/g, "#" + tab_id).replace(/#\{label\}/g, title).replace(/#\{id\}/g, li_id));

        $("#fb-ul-source-tabs").append(li);
        source_tabs.append("<div id='" + tab_id + "' style='padding-left:5px;padding-right:5px'></div>");


        //$("#" + tab_id).append("<div id='" + mce_id + "' style='height:600px'></div>");
        $("#" + tab_id).append("<textarea id='" + mce_id + "' style='height:600px'></textarea>");
        //tinymce.init();
        tinymce.execCommand('mceAddEditor', false, mce_id);

        // test only
        /*
        for (var i = 0; i < tinymce.editors.length; i++){
            var content = tinymce.editors[i].getContent(); // get the content
        }
        */

        var source_mce = tinymce.get(mce_id);
        source_mce.setContent(content); // note: the get method does not work when tinymce.js has not been loaded;
        source_mce.on('change', function (e) {
            update();
        });
        source_mce["post_id"] = post_id;
        source_mce["post_modified"] = post_modified;
        source_mce["post_name"] = title;

        if (tab_counter == 0) {
            tinymce.get('fb-derived-mce').on('change', function (e) {
                update();
            });

            source_tabs.removeClass('fb-tabs-sources-display-none');
        }

        source_tabs.tabs("refresh");
        source_tabs.tabs("option", "active", $('#' + li_id).index());

        meta_source_tabs_post_ids[tab_id] = post_id; // add property for quick index
        meta_source_tabs_post_ids.push(post_id);
        updateSourceTabsInput();

        tab_counter++;
    }



    //----------------------------------------------------------------------------------------
    // merge dialog

    var fb_merge_dialog = $("#fb-merge-dialog").dialog({
        autoOpen: false,
        modal: true,
        height: "auto",
        width: 1600,
        open: function (event, ui) {
        },
        close: function () {
            //tinymce.execCommand('mceRemoveEditor', false, "fb-merge-mce-top-source");
            //tinymce.execCommand('mceRemoveEditor', false, "fb-merge-mce-top-derive");
            //tinymce.execCommand('mceRemoveEditor', false, "fb-merge-mce-bottom-source");
            //tinymce.execCommand('mceRemoveEditor', false, "fb-merge-mce-bottom-derive");
            //console.log("merge dialog close...");
        }



    });




    //----------------------------------------------------------------------------------------
    // updates

    function updateSourceTabsInput() {
        $("#fb-input-source-tabs").val("");

        if (meta_source_tabs_post_ids.length <= 0) return;

        var ids = "";
        for (var i = 0; i < meta_source_tabs_post_ids.length; i++) {
            ids = ids + meta_source_tabs_post_ids[i].trim() + ";";
        }

        $("#fb-input-source-tabs").val(ids);
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
        if (flexibook.postpone_update == true) return;

        updateMetaSourceVersions();
        updateSourceHighlight();
        updateHTMLDiff();
        updateSVG();
    }

    function updateSourceHighlight() {
        // get active tab id
        var tab_id = $("#fb-tabs-sources .ui-tabs-panel:visible").attr("id");
        if (typeof tab_id == typeof undefined || tab_id == null) return;
        var source_mce_id = tab_id.replace("fb-tabs-source", "fb-source-mce");
        var source_mce = tinymce.get(source_mce_id);
        var source_doc = source_mce.getDoc();
        var pid = source_mce.post_id;

        highlightSource(source_doc, pid);

        if (flexibook.columns_of_editors == 3) {
            var old_source_doc = tinymce.get('fb-old-source-mce').getDoc();
            highlightSource(old_source_doc, pid);
        }
    }

    function highlightSource(source_doc, pid) {
        if (highlighting_source == false) {
            $(source_doc.body).children().each(function (index) {
                $(this).css("opacity", 1);
            });
        }
        else {
            $(source_doc.body).children().each(function (index) {
                $(this).css("opacity", 0.5);
            });

            var derived_doc = tinymce.get('fb-derived-mce').getDoc();
            $(derived_doc.body).children().each(function (index) {
                var derive = $(this);
                if (isTinymceAdminElement(derive)) return true; // continue
                var source_id = derive.attr('data-source-id');
                var source_post_id = derive.attr('data-source-post-id');

                if (source_post_id && source_post_id == pid && source_id && source_id != 'none') {
                    var source = source_doc.getElementById(source_id);
                    if (source) {
                        $(source).css("opacity", 1);
                    }
                }
            });
        }
    }

    function updateMetaSourceVersions() {
        if (derived_mce_init_done == false) return;
        if (!tinymce.get('fb-derived-mce')) return;

        var post_ids = getUniqueSourcePostIDs();

        if (meta_source_versions.length == 0) {
            for (var i = 0; i < post_ids.length; i++) {
                createNewDeriveMetaObject(post_ids[i]);
            }
        }
        else {
            // firstly, remove objects from meta_source_versions if they are not longer in derived document 
            for (var i = meta_source_versions.length - 1; i >= 0; i--) {
                if (post_ids.indexOf(meta_source_versions[i].source_post_id) == -1) {
                    meta_source_versions.pop();
                }
            }

            for (var i = 0; i < post_ids.length; i++) {
                var post_ids_exist = false;
                for (var j = 0; j < meta_source_versions.length; j++) {
                    if (post_ids[i] == meta_source_versions[j].source_post_id) {

                        // ms - not yet consider the source editors have been closed 
                        for (var t = 0; t < tinymce.editors.length; t++) {
                            if (tinymce.editors[t].post_id == post_ids[i]) {
                                meta_source_versions[j]['source_post_current_version'] = tinymce.editors[t].post_modified;
                                meta_source_versions[j]['source_post_name'] = tinymce.editors[t].post_name;
                                break;
                            }
                        };

                        post_ids_exist = true;
                        break;
                    }
                }

                if (post_ids_exist == false) {
                    createNewDeriveMetaObject(post_ids[i]);
                }
            }
        }

        var meta_source_versions_string = JSON.stringify(meta_source_versions);
        $("#fb-input-derived-meta").val(meta_source_versions_string);

        // update Publish button
        $("#publish").attr('value', 'Save');
        $("#publish").prop('disabled', false);
        for (var i = 0; i < meta_source_versions.length; i++) {
            if (meta_source_versions[i].number_of_merges > 0) {
                $("#publish").prop('disabled', true);
                break;
            }
        }

        // update meta box source versions
        updateMetaBoxSourceVersions();
    }

    function updateMetaBoxSourceVersions() {
        var table = document.getElementById("fb-table-derived-meta");

        // remove all data rows first
        if (table.rows.length > 1) {
            for (var i = table.rows.length - 1; i >= 1; i--) {
                table.deleteRow(i);
            }
        }

        for (var i = 0; i < meta_source_versions.length; i++) {
            var row = table.insertRow();
            var cell1 = row.insertCell(0);
            var cell2 = row.insertCell(1);
            var cell3 = row.insertCell(2);
            var cell4 = row.insertCell(3);
            cell1.innerHTML = meta_source_versions[i].source_post_name;
            cell2.innerHTML = meta_source_versions[i].source_post_previous_version;
            cell3.innerHTML = meta_source_versions[i].source_post_current_version;
            cell4.innerHTML = meta_source_versions[i].number_of_merges;
        }

        if (table.rows.length > 1) {
            for (var i = 1; i < table.rows.length; i++) {
                var cells = table.rows[i].cells;
                if (cells[1].innerHTML.trim() != cells[2].innerHTML.trim()) {
                    table.rows[i].style.backgroundColor = "lightpink";
                }
            }
        }
    }

    function createNewDeriveMetaObject(post_id) {
        var obj = new Object();
        obj['source_post_id'] = post_id;
        obj['number_of_merges'] = 0;

        // ms - not yet consider the source editors have been closed 
        for (var j = 0; j < tinymce.editors.length; j++) {
            if (tinymce.editors[j].post_id == post_id) {
                obj['source_post_previous_version'] = tinymce.editors[j].post_modified;
                obj['source_post_current_version'] = tinymce.editors[j].post_modified;
                obj['source_post_name'] = tinymce.editors[j].post_name;
                break;
            }
        };

        meta_source_versions.push(obj);
    }

    function getUniqueSourcePostIDs() {
        var ids = [];
        var derived_doc = tinymce.get('fb-derived-mce').getDoc();

        $(derived_doc.body).find("[data-source-post-id]").each(function (index) {
            var post_id = $(this).attr('data-source-post-id').trim();
            if (ids.length == 0) {
                ids.push(post_id);
            }
            else {
                if (ids.indexOf(post_id) == -1) {
                    ids.push(post_id);
                }
            }
        });

        return ids;
    }

    function updateHTMLDiff() {
        var derived_doc = tinymce.get('fb-derived-mce').getDoc();

        // get active tab id
        var tab_id = $("#fb-tabs-sources .ui-tabs-panel:visible").attr("id");
        if (typeof tab_id == typeof undefined || tab_id == null) return;
        var source_mce_id = tab_id.replace("fb-tabs-source", "fb-source-mce");
        var source_doc = tinymce.get(source_mce_id).getDoc();

        if (flexibook.columns_of_editors == 2) {
            updateHTMLDiffColumn(source_doc, derived_doc, 'source_derive', true);

            /*
            var merge = false;
            for (var i = 0; i < meta_source_versions.length; i++) {
                if (meta_source_versions[i].number_of_merges > 0) {
                    merge = true;
                    break;
                }
            }

            if (merge) {
                updateHTMLDiffMerge();
            }
            */
        }
        else if (flexibook.columns_of_editors == 3) {
            // disable three columns view
            /*
            var old_source_doc = tinymce.get('fb-old-source-mce').getDoc();

            updateHTMLDiffColumn(old_source_doc, derived_doc, 'source_derive', true);

            updateHTMLDiffColumn(old_source_doc, source_doc, 'source_source', false);
            */
        }
    }

    function updateHTMLDiffMerge() {
        var derived_doc = tinymce.get('fb-derived-mce').getDoc();

        // get active tab id
        var tab_id = $("#fb-tabs-sources .ui-tabs-panel:visible").attr("id");
        if (typeof tab_id == typeof undefined || tab_id == null) return;
        var source_mce_id = tab_id.replace("fb-tabs-source", "fb-source-mce");
        var source_doc = tinymce.get(source_mce_id).getDoc();

        var old_source_doc = tinymce.get('fb-old-source-mce').getDoc();

        $(derived_doc.body).children().each(function (index) {
            var derive = $(this);

            if (isTinymceAdminElement(derive)) return true; // continue
            if (!derive.attr('data-merge-case')) return true; // continue

            var source_id = derive.attr('data-source-id');

            if (source_id && source_id != 'none') {
                var source = source_doc.getElementById(source_id);
                if (source) {
                    var mcase = derive.attr('data-merge-case');
                    switch (mcase) {
                        // case 1:
                        // source documen is modified; derive document is unchanged
                        case "1":
                            // clear both source and derive elements
                            var source_html = unwrapDeleteInsertTag(source);
                            source.html(source_html);

                            var derive_html = unwrapDeleteInsertTagjQuery(derive);
                            derive.html(derive_html);

                            var old_source = old_source_doc.getElementById(source_id);


                            break;
                    }


                }



            }
        });
    }

    function updateHTMLDiffColumn(base_doc, comp_doc, comp_type, clean_base) {
        // firstly clean base document
        if (clean_base) {
            $(base_doc.body).children().each(function (index) {
                var base = $(this);
                if (isTinymceAdminElement(base)) return true; // continue
                if (base.attr('data-merge-case')) return true; // continue; ms - skip the elements that require merge actions
                var id = base.attr('id');

                if (id && id != 'none') {
                    var source_html = unwrapDeleteInsertTagjQuery(base);
                    base.html(source_html);
                }

            });
        }

        $(comp_doc.body).children().each(function (index) {
            var comp = $(this);

            //if (comp.hasClass("fb_tinymce_left_column") == false && comp.hasClass("fb_tinymce_left_column_icon") == false) {
            if (isTinymceAdminElement(comp)) return true; // continue
            if (comp.attr('data-merge-case')) return true; // continue; ms - skip the elements that require merge actions
            //var source_id = comp.attr('data-source-id');
            var source_id = null;
            if (comp_type == 'source_derive') {
                source_id = comp.attr('data-source-id');
            }
            else if (comp_type == 'source_source') {
                source_id = comp.attr('id');
            }

            var id = comp.attr('id');

            if (source_id && source_id != 'none') {
                // stores a bookmark of the current selection
                var derive_bookmark;
                if (comp_type == 'source_derive') derive_bookmark = tinymce.get('fb-derived-mce').selection.getBookmark(2, true); // use a non-html bookmark
                //console.log(tinymce.get('fb-derived-mce').selection);
                //console.log(tinymce.get('fb-derived-mce').selection.getNode());
                //console.log(derive_bookmark);
                //console.log('derive_bookmark');
                var base = base_doc.getElementById(source_id);
                if (base) {
                    //var derive_clean = comp.find('span.insert').contents().unwrap().end().end(); // remove all insert tags
                    //var derive_html = derive_clean.html();
                    var derive_html = unwrapDeleteInsertTagjQuery(comp);

                    var source_html = $(base).html();

                    if (source_html != derive_html) {
                        // comp element
                        var r1 = html_diff(source_html, derive_html, 'insert');
                        comp.html(r1);

                        /*
                        if (comp_type == 'source_derive') {
                            $(comp).find('span.insert').each(function () {
                                $(this).addClass('insert-sd');
                            });
                        }
                        else if (comp_type == 'source_source') {
                            $(comp).find('span.insert').each(function () {
                                $(this).addClass('insert-ss');
                            });
                        }
                        */

                        // base element
                        var r2 = html_diff(source_html, derive_html, 'delete');
                        $(base).html(r2);

                        /*
                        if (comp_type == 'source_derive') {
                            $(base).find('span.delete').each(function () {
                                if ($(this).hasClass('delete-ss') == false) {
                                    $(this).addClass('delete-sd');
                                }
                            });
                        }
                        else if (comp_type == 'source_source') {
                            $(base).find('span.delete').each(function () {
                                if ($(this).hasClass('delete-sd') == false) {
                                    $(this).addClass('delete-ss');
                                }
                            });
                        }
                        */

                        //console.log($(base).prop('outerHTML'));
                    }
                    else if (source_html == derive_html) {
                        // derive element
                        comp.html(derive_html);

                        // source element
                        $(base).html(source_html);
                    }
                }
                else {
                    //console.log(comp.prop("tagName") + ": " + comp.prop('outerHTML'));
                    // bugs - this section generates bugs especially for <ol>, <ul> ... elements, disable these elements for now
                    if ((comp.prop("tagName").toLowerCase() != 'ol') &&
                        (comp.prop("tagName").toLowerCase() != 'ul')) {
                        var newHtml = unwrapDeleteInsertTagjQuery(comp);
                        var newHtml = "<span class='insert'>" + newHtml + "</span>";
                        comp.html(newHtml);
                    }
                }

                // restore the selection bookmark
                if (comp_type == 'source_derive') tinymce.get('fb-derived-mce').selection.moveToBookmark(derive_bookmark);
            }
            else {
                if (id && id != 'none') {
                    //console.log(comp.prop("tagName") + ": " + comp.prop('outerHTML'));
                    // bugs - this section generates bugs especially for <ol>, <ul> ... elements, disable these elements for now
                    if ((comp.prop("tagName").toLowerCase() != 'ol') &&
                        (comp.prop("tagName").toLowerCase() != 'ul')) {
                        var derive_bookmark;
                        // stores a bookmark of the current selection
                        if (comp_type == 'source_derive') derive_bookmark = tinymce.get('fb-derived-mce').selection.getBookmark(2, true);

                        var newHtml = unwrapDeleteInsertTagjQuery(comp);
                        var newHtml = "<span class='insert'>" + newHtml + "</span>";
                        comp.html(newHtml);

                        // restore the selection bookmark
                        if (comp_type == 'source_derive') tinymce.get('fb-derived-mce').selection.moveToBookmark(derive_bookmark);
                    }
                }
            }
        });
    }

    function updateSVG() {
        var derived_doc = tinymce.get('fb-derived-mce').getDoc();

        // get active tab id
        var tab_id = $("#fb-tabs-sources .ui-tabs-panel:visible").attr("id");
        if (typeof tab_id == typeof undefined || tab_id == null) return;
        var source_mce_id = tab_id.replace("fb-tabs-source", "fb-source-mce");
        var source_mce = tinymce.get(source_mce_id);
        var source_doc = source_mce.getDoc();

        if (flexibook.columns_of_editors == 2) {
            updateSVGColumn(source_doc, derived_doc, 'source_derive', 'fb-svg-mid-column');
        }
        else if (flexibook.columns_of_editors == 3) {
            // disable three columns view
            /*
            var old_source_doc = tinymce.get('fb-old-source-mce').getDoc();

            // first column
            // updateSVGColumn(old_source_doc, source_doc, 'source_source', 'fb-svg-merge-mid-column');
            updateSVGColumn(source_doc, old_source_doc, 'source_source', 'fb-svg-merge-mid-column'); // need to reverse

            // second column
            updateSVGColumn(old_source_doc, derived_doc, 'source_derive', 'fb-svg-mid-column');
            */
        }
    }

    function isTinymceAdminElement(element) {
        if (element.prop("tagName").toLowerCase() == 'svg') return true;
        if (element.hasClass("fb_tinymce_left_column") == true ||
            element.hasClass("fb_tinymce_left_column_icon") == true ||
            element.hasClass("fb_tinymce_left_column_svg") == true) return true;
        //if (element.attr('class').indexOf("fb_tinymce_left_column") >= 0) return true;
        return false;
    }

    function updateSVGColumn(left_doc, right_doc, comp_type, svg_column_id) {
        var source_iframe_container_top = getiFrameOffsetTop(left_doc);
        var derived_iframe_container_top = getiFrameOffsetTop(right_doc);

        if (source_iframe_container_top < 0 || derived_iframe_container_top < 0) return;

        var svg_container_top = $('#fb-td-mid-column').offset().top;

        var x_left = 0;
        var x_right = $('#' + svg_column_id).width();

        // remove all polygons
        $('#' + svg_column_id).find('.fb-svg-polygons').remove();

        $(right_doc.body).children().each(function (index) {
            var right = $(this);
            //if (right.hasClass("fb_tinymce_left_column") == false && right.hasClass("fb_tinymce_left_column_icon") == false) {
            if (isTinymceAdminElement(right)) return true; // continue
            var source_id = null;
            if (comp_type == 'source_derive') {
                source_id = right.attr('data-source-id');
            }
            else if (comp_type == 'source_source') {
                source_id = right.attr('id');
            }

            if (source_id && source_id != 'none') {
                var left = left_doc.getElementById(source_id);
                if (left) {
                    var y_bottom_right = -1;
                    var y_top_right = -1;
                    var y_top_left = -1;
                    var y_bottom_left = -1;

                    // calculate y_bottom_right and y_top_right
                    if (right.attr('class') && right.attr('class').indexOf("fb-display-none") >= 0) {
                        var derived_bottom = getParentOffsetBottom(right.attr("id"), right_doc.body);
                        if (derived_bottom >= 0) {
                            derived_bottom += (derived_iframe_container_top - svg_container_top);
                            y_bottom_right = derived_bottom;
                            y_top_right = derived_bottom;
                        }
                    }
                    else {
                        var derived_height = right.height();
                        var derived_outer_height = right.outerHeight(true);
                        var derived_top = right.position().top;
                        var derived_padding_top = parseInt(right.css('padding-top'), 10);
                        var derived_margin_top = parseInt(right.css('margin-top'), 10);
                        derived_top += (derived_iframe_container_top - svg_container_top);
                        derived_top -= (derived_padding_top + derived_margin_top);

                        y_bottom_right = derived_top + derived_outer_height;
                        y_top_right = derived_top;
                    }

                    // calcuate y_top_left and y_bottom_left
                    if ($(left).attr('class') && $(left).attr('class').indexOf("fb-display-none") >= 0) {
                        var source_bottom = getParentOffsetBottom($(left).attr("id"), left_doc.body);
                        if (source_bottom >= 0) {
                            source_bottom += (source_iframe_container_top - svg_container_top);
                            y_top_left = source_bottom;
                            y_bottom_left = source_bottom;
                        }
                    }
                    else {
                        var source_height = $(left).height();
                        var source_outer_height = $(left).outerHeight(true);
                        var source_top = $(left).position().top;
                        var source_padding_top = parseInt($(left).css('padding-top'), 10);
                        var source_margin_top = parseInt($(left).css('margin-top'), 10);
                        source_top += (source_iframe_container_top - svg_container_top);
                        source_top -= (source_padding_top + source_margin_top);
                        //console.log($(source_element).attr('id') + ": " + source_outer_height);

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
                        polygon.setAttribute("id", right.attr('id'));
                        //polygon.setAttribute("source_mce_id", source_mce_id);

                        var s_clone = $(left).clone();
                        var d_clone = right.clone();

                        var source_clean = unwrapDeleteInsertTag(s_clone);
                        var comp_clean = unwrapDeleteInsertTag(d_clone);

                        //if (left.innerHTML == comp.html()) {
                        if (source_clean == comp_clean) {
                            polygon.setAttribute("fill", "green");
                        }
                        else {
                            polygon.setAttribute("fill", "red");
                        }
                        polygon.setAttribute("class", "fb-svg-polygons");
                        polygon.setAttribute("opacity", 0.2);
                        //$(polygon).click(function () { svgOnClick($(this).attr('id'), $(this).attr('source_mce_id')); });
                        $(polygon).hover(function () {
                            $(polygon).css("cursor", "pointer");
                            $(polygon).css("opacity", 1);

                            //console.log('..............hover..............');
                            /*
                            if (comp_type == 'source_derive') {
                                $(left).find('span.delete-sd').each(function () { $(this).addClass('delete-highlight-sd'); });

                                right.find('span.insert').each(function () { $(this).addClass('insert-highlight-sd'); });
                            }
                            else if (comp_type == 'source_source') {
                                $(left).find('span.insert').each(function () { $(this).addClass('insert-highlight-ss'); });

                                right.find('span.delete-ss').each(function () { $(this).addClass('delete-highlight-ss'); });
                            }
                            */
                            //console.log($(left).prop('outerHTML'));
                            //console.log($(right).prop('outerHTML'));

                        }, function () {
                            $(polygon).css("opacity", 0.2);

                            /*
                            $(left).find('span.insert').each(function () { $(this).removeClass('insert-highlight-ss insert-highlight-sd'); });
                            $(left).find('span.delete').each(function () { $(this).removeClass('delete-highlight-ss delete-highlight-sd'); });

                            right.find('span.insert').each(function () { $(this).removeClass('insert-highlight-ss insert-highlight-sd'); });
                            right.find('span.delete').each(function () { $(this).removeClass('delete-highlight-ss delete-highlight-sd'); });
                            */
                        });
                        document.getElementById(svg_column_id).appendChild(polygon);
                    }
                }
            }

        });
    }

    function updateSourcePosition(d_id) {
        var derived_doc = tinymce.get('fb-derived-mce').getDoc();

        if (source_tab_original_margin_top < 0) {
            source_tab_original_margin_top = parseInt($('#fb-tabs-sources').css('margin-top'), 10);
        }
        else {
            $('#fb-tabs-sources').css('margin-top', source_tab_original_margin_top);           
        }

        if (flexibook.columns_of_editors == 3) {
            $("#fb-div-old-source-mce").css('margin-top', 0);
        }

        // get active tab id
        var tab_id = $("#fb-tabs-sources .ui-tabs-panel:visible").attr("id");
        if (typeof tab_id == typeof undefined || tab_id == null) return;
        var source_mce_id = tab_id.replace("fb-tabs-source", "fb-source-mce");
        var source_mce = tinymce.get(source_mce_id);
        var source_doc = source_mce.getDoc();

        if (flexibook.columns_of_editors == 2) {
            updateSourcePositionColumn(source_doc, derived_doc, d_id, 0);
        }
        else if (flexibook.columns_of_editors == 3) {
            var old_source_doc = tinymce.get('fb-old-source-mce').getDoc();

            updateSourcePositionColumn(source_doc, derived_doc, d_id, 0);
            updateSourcePositionColumn(old_source_doc, derived_doc, d_id, 1);
        }
    }

    function updateSourcePositionColumn(source_doc, derive_doc, d_id, column_number) {
        var source_iframe_container_top = getiFrameOffsetTop(source_doc);
        var derived_iframe_container_top = getiFrameOffsetTop(derive_doc);

        if (source_iframe_container_top < 0 || derived_iframe_container_top < 0) return;

        var svg_container_top = $('#fb-td-mid-column').offset().top;

        $(derive_doc.body).children().each(function (index) {
            var derive = $(this);
            if (derive.attr('id') == d_id) {
                //if (derive.hasClass("fb_tinymce_left_column") == false && derive.hasClass("fb_tinymce_left_column_icon") == false) {
                if (isTinymceAdminElement(derive)) return true; // continue
                var source_id = derive.attr('data-source-id');

                if (source_id && source_id != 'none') {
                    var source = source_doc.getElementById(source_id);
                    if (source) {
                        var y_bottom_right = -1;
                        var y_top_right = -1;
                        var y_top_left = -1;
                        var y_bottom_left = -1;

                        // calculate y_bottom_right and y_top_right
                        if (derive.attr('class') && derive.attr('class').indexOf("fb-display-none") >= 0) {
                            var derived_bottom = getParentOffsetBottom(derive.attr("id"), derive_doc.body);
                            if (derived_bottom >= 0) {
                                derived_bottom += (derived_iframe_container_top - svg_container_top);
                                y_bottom_right = derived_bottom;
                                y_top_right = derived_bottom;
                            }
                        }
                        else {
                            var derived_height = derive.height();
                            var derived_outer_height = derive.outerHeight(true);
                            var derived_top = derive.position().top;
                            var derived_padding_top = parseInt(derive.css('padding-top'), 10);
                            var derived_margin_top = parseInt(derive.css('margin-top'), 10);
                            derived_top += (derived_iframe_container_top - svg_container_top);
                            derived_top -= (derived_padding_top + derived_margin_top);

                            y_bottom_right = derived_top + derived_outer_height;
                            y_top_right = derived_top;
                        }

                        // calcuate y_top_left and y_bottom_left
                        if ($(source).attr('class') && $(source).attr('class').indexOf("fb-display-none") >= 0) {
                            var source_bottom = getParentOffsetBottom($(source).attr("id"), source_doc.body);
                            if (source_bottom >= 0) {
                                source_bottom += (source_iframe_container_top - svg_container_top);
                                y_top_left = source_bottom;
                                y_bottom_left = source_bottom;
                            }
                        }
                        else {
                            var source_height = $(source).height();
                            var source_outer_height = $(source).outerHeight(true);
                            var source_top = $(source).position().top;
                            var source_padding_top = parseInt($(source).css('padding-top'), 10);
                            var source_margin_top = parseInt($(source).css('margin-top'), 10);
                            source_top += (source_iframe_container_top - svg_container_top);
                            source_top -= (source_padding_top + source_margin_top);

                            y_top_left = source_top;
                            y_bottom_left = source_top + source_outer_height;
                        }

                        if (y_bottom_right >= 0 && y_top_right >= 0 && y_top_left >= 0 && y_bottom_left >= 0) {
                            if (y_top_right > y_top_left) {
                                if (column_number == 0) {
                                    var t = parseInt(source_tab_original_margin_top, 10) + y_top_right - y_top_left;
                                    $('#fb-tabs-sources').css('margin-top', t);
                                }
                                else if (column_number == 1) {
                                    var t = y_top_right - y_top_left;
                                    $("#fb-div-old-source-mce").css('margin-top', t);
                                }
                            }
                        }
                    }

                }
                return false; // break
            }
        });
    }

    //------------------------------------------------------------------------------------------------------

    function svgOnClick(id, source_mce_id) {
        fb_merge_dialog.dialog("open");

        setupMergeDialogTinyMce(id, source_mce_id);
        setupMergeDialogButtons();
    }

    function setupMergeDialogButtons() {
        var old_source_editor = tinymce.get("fb-merge-mce-top-source");
        var old_derive_editor = tinymce.get("fb-merge-mce-top-derive");
        var new_source_editor = tinymce.get("fb-merge-mce-bottom-source");
        var new_derive_editor = tinymce.get("fb-merge-mce-bottom-derive");

        var os_outer = old_source_editor.getContent();
        var od_outer = old_derive_editor.getContent();
        var ns_outer = new_source_editor.getContent();

        var os = $(os_outer).html();
        var od = $(od_outer).html();
        var ns = $(ns_outer).html();

        // 1. source old and derive old
        $("#fb-button-source-old-and-derive-old").button();
        if (os.trim() == od.trim()) {
            //$("#fb-button-source-old-and-derive-old").addClass('merge-green');
            $("#fb-button-source-old-and-derive-old").attr('value', '=');
            $("#fb-button-source-old-and-derive-old").prop('disabled', true);
        }
        else {
            $("#fb-button-source-old-and-derive-old").attr('value', $('<div>').html('&#8596;').text());
            $("#fb-button-source-old-and-derive-old").prop('disabled', false);
            $("#fb-button-source-old-and-derive-old").click(function () { compareButtonOnClick("fb-merge-mce-top-source", "fb-merge-mce-top-derive"); });
        }

        // 2. source old and source new
        $("#fb-button-source-old-and-source-new").button();
        if (os.trim() == ns.trim()) {
            $("#fb-button-source-old-and-source-new").attr('value', $('<div>').html('&#8741;').text());
            $("#fb-button-source-old-and-source-new").prop('disabled', true);
        }
        else {
            $("#fb-button-source-old-and-source-new").attr('value', $('<div>').html('&#8597;').text());
            $("#fb-button-source-old-and-source-new").prop('disabled', false);
            $("#fb-button-source-old-and-source-new").click(function () { compareButtonOnClick("fb-merge-mce-top-source", "fb-merge-mce-bottom-source"); });
        }

        // 3. source new and derive old
        $("#fb-button-source-new-and-derive-old").button();
        if (ns.trim() == od.trim()) {
            $("#fb-button-source-new-and-derive-old").attr('value', '//');
            $("#fb-button-source-new-and-derive-old").prop('disabled', true);
        }
        else {
            $("#fb-button-source-new-and-derive-old").attr('value', $('<div>').html('&#9585;').text());
            $("#fb-button-source-new-and-derive-old").prop('disabled', false);
            $("#fb-button-source-new-and-derive-old").click(function () { compareButtonOnClick("fb-merge-mce-bottom-source", "fb-merge-mce-top-derive"); });
        }


        $("#fb-button-derive-old-and-derive-new").button();
        $("#fb-button-derive-old-to-derive-new").button();

        $("#fb-button-source-new-and-derive-new").button();
        $("#fb-button-source-new-to-derive-new").button();
    }

    function compareButtonOnClick(left_id, right_id) {
        // clean delete and insert tags in all editors
        var old_source_editor = tinymce.get("fb-merge-mce-top-source");
        var old_derive_editor = tinymce.get("fb-merge-mce-top-derive");
        var new_source_editor = tinymce.get("fb-merge-mce-bottom-source");
        //var new_derive_editor = tinymce.get("fb-merge-mce-bottom-derive");

        var os_outer = old_source_editor.getContent();
        var od_outer = old_derive_editor.getContent();
        var ns_outer = new_source_editor.getContent();

        var os = $(os_outer);
        var od = $(od_outer);
        var ns = $(ns_outer);

        var clean = unwrapDeleteInsertTag(os_outer);
        $(os).html(clean);
        old_source_editor.setContent($(os).prop('outerHTML'));

        clean = unwrapDeleteInsertTag(od_outer);
        $(od).html(clean);
        old_derive_editor.setContent($(od).prop('outerHTML'));

        clean = unwrapDeleteInsertTag(ns_outer);
        $(ns).html(clean);
        new_source_editor.setContent($(ns).prop('outerHTML'));

        // html diff
        var left_editor = tinymce.get(left_id);
        var right_editor = tinymce.get(right_id);

        var left_outer = left_editor.getContent();
        var right_outer = right_editor.getContent();

        var l = $(left_outer);
        var r = $(right_outer);

        var left_html = l.html();
        var right_html = r.html();

        // right element
        var rdiff = html_diff(left_html, right_html, 'insert');
        r.html(rdiff);
        right_editor.setContent(r.prop('outerHTML'));

        // left element
        var ldiff = html_diff(left_html, right_html, 'delete');
        l.html(ldiff);
        left_editor.setContent(l.prop('outerHTML'));
    }


    function setupMergeDialogTinyMce(id, source_mce_id) {
        var derive_doc = tinymce.get('fb-derived-mce').getDoc();
        var source_doc = tinymce.get(source_mce_id).getDoc();

        // 1. derive top
        addTinyMceEditor("#fb-merge-mce-top-derive");
        var dt = derive_doc.getElementById(id);
        var derive_element_top = $(dt).clone();
        var cleanHTML = unwrapDeleteInsertTag(derive_element_top);
        $(derive_element_top).html(cleanHTML);

        var editor = tinymce.get("fb-merge-mce-top-derive");
        editor.setContent($(derive_element_top).prop('outerHTML'));

        // 2. source bottom
        addTinyMceEditor("#fb-merge-mce-bottom-source");
        var source_element_id = $(derive_element_top).attr('data-source-id');
        var sb = source_doc.getElementById(source_element_id);
        var source_element_bottom = $(sb).clone();
        cleanHTML = unwrapDeleteInsertTag(source_element_bottom);
        $(source_element_bottom).html(cleanHTML);

        var editor = tinymce.get("fb-merge-mce-bottom-source");
        editor.setContent($(source_element_bottom).prop('outerHTML'));

        // 3. source top
        addTinyMceEditor("#fb-merge-mce-top-source");
        var source_post_id = $(derive_element_top).attr('data-source-post-id');
        var source_post_previous_version = null;
        for (var i = 0; i < meta_source_versions.length; i++) {
            if (source_post_id == meta_source_versions[i].source_post_id) {
                source_post_previous_version = meta_source_versions[i].source_post_previous_version;
                break;
            }
        }

        var source_top_outerhtml = '';

        // the source post has been modified
        if (source_post_previous_version != null) {
            for (var i = 0; i < previous_source_revisions.length; i++) {
                if (previous_source_revisions[i].post_id == source_post_id) {
                    var old_mce = tinymce.get("fb-invisible-editor");
                    old_mce.setContent(previous_source_revisions[i].post_content);
                    var old_doc = old_mce.getDoc();

                    $(old_doc.body).find("[id]").each(function () {
                        if ($(this).attr('id').trim() == source_element_id) {
                            source_top_outerhtml = $(this).html();
                            return false; // break each function
                        }
                    });

                    break;
                }
            }
        }
            // the source post does not change: the same as new source element
        else {
            source_top_outerhtml = $(source_element_bottom).prop('outerHTML');
        }

        var editor = tinymce.get("fb-merge-mce-top-source"); // move into getSourceElementRevision()
        editor.setContent(source_top_outerhtml);

        // 4. derive bottom
        addTinyMceEditor("#fb-merge-mce-bottom-derive");
        var editor = tinymce.get("fb-merge-mce-bottom-derive");
        editor.setContent('');
    }

    function getSourceElementRevision(post_id, post_modified, element_id) {
        $.post(ajaxurl,
            {
                'action': 'fb_source_element_revision_query',
                'id': post_id,
                'post_modified': post_modified,
                'element_id': element_id
            },
            function (data, status) {
                if (status.toLowerCase() == "success") {
                    var obj = JSON.parse(data);
                    var editor = tinymce.get("fb-merge-mce-top-source");
                    editor.setContent(obj.outertext);
                }
                else {
                }
            });
    }

    function addTinyMceEditor(id) {
        tinymce.init({
            selector: id,
            menubar: false,
            statusbar: false,
            toolbar: false,
            height: 300,
            //theme: "advanced",
            //plugins: "autoresize",
            //init_instance_callback: function (inst) { inst.execCommand('mceAutoResize'); },
            content_css: '../wp-content/plugins/visualdiff/css/editor.css'
        });
    }

    function unwrapDeleteInsertTag(element) {
        var clean = $(element).find('span.delete').contents().unwrap().end().end(); // remove all delete tags
        clean = clean.find('span.insert').contents().unwrap().end().end(); // remove all insert tags
        return clean.html();
    }

    function unwrapDeleteInsertTagjQuery(element) {
        var clean = element.find('span.delete').contents().unwrap().end().end(); // remove all delete tags
        clean = clean.find('span.insert').contents().unwrap().end().end(); // remove all insert tags
        return clean.html();
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
            tinymce.execCommand('mceRemoveEditor', false, tinymce.editors[i - 1].id);
        };
    }
});

