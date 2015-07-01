jQuery(document).ready(function ($) {
    var FB_LEVEL_1_POST = 'source';
    var FB_LEVEL_2_POST = 'master';
    var FB_LEVEL_3_POST = 'derived';
    var fb_post_type = null;

    var FB_DATA_LEVEL1_MERGE_CASE = 'data-source-merge-case';
    var FB_DATA_LEVEL2_MERGE_CASE = 'data-master-merge-case';
    var fb_data_merge_case = null;

    var FB_DATA_LEVEL1_POST_ID = 'data-source-post-id';
    var FB_DATA_LEVEL2_POST_ID = 'data-master-post-id';
    var fb_data_post_id = null;

    var FB_DATA_LEVEL1_ELEMENT_ID = 'data-source-element-id';
    var FB_DATA_LEVEL2_ELEMENT_ID = 'data-master-element-id';
    var fb_data_element_id = null;

    var fb_derived_mce_init_done = false;
    var fb_derived_mce_init_called = false;
    var fb_source_mce_init_count = 0;

    var meta_source_tabs_post_ids = [];
    var meta_source_versions = []; // list of objects

    var fb_previous_source_revisions = []; // list of previous source revisions for merge
    var fb_original_derive_units = []; // list of derive units before any editions
    var fb_original_source_units = []; // list of source units before any editions
    var fb_previous_source_count = 0;

    var fb_floating_sources = true;
    var fb_highlighting_source = true;
    var fb_merge_mode = true;
    var fb_show_source_column = true;
    var fb_teacher_student_version = 'teacher';

    // source tabs
    var selected_sources = [];
    var source_tabs = $('#fb-tabs-sources').tabs().css({'min-height': '850px'});
    var tab_counter_source = 0;

    // derive tabs
    var derive_tabs = $('#fb-tabs-derives').tabs().css({'min-height': '850px'});
    var tab_counter_derive = 0;

    var tab_template = "<li id='#{id}'><a href='#{href}' data-post-id='#{postid}'>#{label}</a><span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>";

    // performance
    var fb_performance_previous_derive_scroll_top = null;
    var fb_performance_previous_source_scroll_top = null;

    //----------------------------------------------------------------------------------------
    // init

    flexibook.regTableOfContentCallback(function (editor_id) {
        if (!flexibook.active_derive_mce) return;
        var doc = flexibook.active_derive_mce.getDoc();
        var title = flexibook.active_derive_mce.post_name;
        $(doc.body).find('.toc').eq(0).prepend('<div class="toc-title">' + title + '</div>');

        var height = $(doc.body).find('.toc').eq(0).height();
        height = (1015 - height) / 2;
        $(doc.body).find('.toc').eq(0).prepend('<div style="height:' + height + 'px"></div>'); // prepend a dummy div
        //$(doc.body).find('.toc').eq(0).css('margin-top', height);
    });

    flexibook.regDerivedElementMouseUpCallback(function (post_id, d_id) {
    
    });

    flexibook.regDeriveUpdateCallback(function (caller_function) {
        update(caller_function);
    });

    flexibook.regOnDragEndCallback(function () {
        var derived_doc = getVisibleDeriveMce().getDoc();
        var dragged_item = derived_doc.getElementById(flexibook.dragged_item_id);
        $(dragged_item).removeClass('fb_tinymce_dragging');
        $(dragged_item).css('opacity', 1);
    });

    flexibook.regDeriveMceInitCallback(function () {
        if (fb_derived_mce_init_called == true) return;
        fb_derived_mce_init_called = true;

        $("#fb-button-open-source-document").prop('disabled', false);

        // post type
        fb_post_type = $("#fb-data-post-type").html();
        if (fb_post_type == FB_LEVEL_2_POST) {
            fb_data_merge_case = FB_DATA_LEVEL1_MERGE_CASE;
            fb_data_post_id = FB_DATA_LEVEL1_POST_ID;
            fb_data_element_id = FB_DATA_LEVEL1_ELEMENT_ID;
        }
        else if (fb_post_type == FB_LEVEL_3_POST) {
            fb_data_merge_case = FB_DATA_LEVEL2_MERGE_CASE;
            fb_data_post_id = FB_DATA_LEVEL2_POST_ID;
            fb_data_element_id = FB_DATA_LEVEL2_ELEMENT_ID;
        }

        // meta: derive tabs
        $("#fb-data-derive-mces").children().each(function (index) {
            var d_title = $(this).attr('data-title');
            var d_content = $(this).html();

            // keep the original derive content
            fb_original_derive_units.push({
                title: d_title,
                content: d_content
            });

            addDeriveTab(d_title, d_content, -1);
        });  
        $("#fb-data-derive-mces").remove(); 

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

        fb_derived_mce_init_done = true;
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

        var derived_doc = getVisibleDeriveMce().getDoc();
        var derived_mce = getVisibleDeriveMce();

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

                    if ($(source).attr(fb_data_merge_case)) $(source).removeAttr(fb_data_merge_case);
                    if ($(derive).attr(fb_data_merge_case)) $(derive).removeAttr(fb_data_merge_case);

                    setNumberOfMergeRequests(derived_mce.post_name, post_id, -1);
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

                    if ($(source).attr(fb_data_merge_case)) $(source).removeAttr(fb_data_merge_case);
                    if ($(derive).attr(fb_data_merge_case)) $(derive).removeAttr(fb_data_merge_case);

                    setNumberOfMergeRequests(derived_mce.post_name, post_id, -1);
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

                        if ($(source).attr(fb_data_merge_case)) $(source).removeAttr(fb_data_merge_case);
                        if ($(derive_op1).attr(fb_data_merge_case)) $(derive_op1).removeAttr(fb_data_merge_case);

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

                        if ($(source).attr(fb_data_merge_case)) $(source).removeAttr(fb_data_merge_case);
                        if ($(derive).attr(fb_data_merge_case)) $(derive).removeAttr(fb_data_merge_case);

                        var derive_op2 = derived_doc.getElementById(d_id + '-option2');
                        $(derive_op2).remove();
                    }

                    setNumberOfMergeRequests(derived_mce.post_name, post_id, -1);
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

                    if ($(source).attr(fb_data_merge_case)) $(source).removeAttr(fb_data_merge_case);
                    if ($(derive).attr(fb_data_merge_case)) $(derive).removeAttr(fb_data_merge_case);

                    setNumberOfMergeRequests(derived_mce.post_name, post_id, -1);
                }
                // ignore the changes in the new source document
                else if (icon == '10007') {
                    var source = new_doc.getElementById(s_id);
                    var derive = derived_doc.getElementById(d_id);
                    var clean = unwrapDeleteInsertTag(source);

                    $(source).html(clean);
                    $(derive).remove();

                    if ($(source).attr(fb_data_merge_case)) $(source).removeAttr(fb_data_merge_case);

                    setNumberOfMergeRequests(derived_mce.post_name, post_id, -1);
                }

                update();
                break;
            case "6":
                if (icon == '10003') {
                    var source = new_doc.getElementById(s_id);
                    var derive = derived_doc.getElementById(d_id);

                    $(source).remove();
                    $(derive).remove();
                    setNumberOfMergeRequests(derived_mce.post_name, post_id, -1);
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
                    if ($(derive).attr(fb_data_merge_case)) $(derive).removeAttr(fb_data_merge_case);
                    setNumberOfMergeRequests(derived_mce.post_name, post_id, -1);
                }

                update();
                break;
        }
    });

    //---------------------------------------------------------------------------------------------------------------
    // setup buttons

    //$('#fb-select-style-sheet').selectmenu();
    $('#fb-select-style-sheet').change(function () {
        var select = $("#fb-select-style-sheet option:selected").text();
        var href = null;
        if (select === 'Style 1') {
            href = $('#fb-select-style-sheet').attr('data-css-href-1');
        }
        else if (select === 'Style 2') {
            href = $('#fb-select-style-sheet').attr('data-css-href-2');
        }

        if (href) {
            for (var i = 0; i < tinymce.editors.length; i++) {
                var editor = tinymce.editors[i];
                if ((editor.id.indexOf("fb-source-mce") >= 0) || (editor.id.indexOf("fb-derived-mce") >= 0)) {
                    editor.plugins.fb_folding_editor.switchEditorCSS(href);
                }
            }

        }
    });

    $('#fb-buttonset-toggle-sources').buttonset();
    $('#fb-buttonset-toggle-sources-on').click(function () {
        if (fb_show_source_column) return; // if already on, then return.

        fb_show_source_column = true;
        toggleSourceColumn();
    });

    $('#fb-buttonset-toggle-sources-off').click(function () {
        if (!fb_show_source_column) return; // if already on, then return.

        fb_show_source_column = false;
        toggleSourceColumn();
    });

    $('#fb-buttonset-toggle-merge').buttonset();
    $('#fb-buttonset-toggle-merge-on').click(function () {
        if (fb_merge_mode) return; // if already on, then return.

        fb_merge_mode = true;
        toggleMergeMode();
    });

    $('#fb-buttonset-toggle-merge-off').click(function () {
        if (!fb_merge_mode) return; // if already off, then return.

        fb_merge_mode = false;
        toggleMergeMode();
    });

    $('#fb-buttonset-teacher-student').buttonset();
    $('#fb-buttonset-teacher-student-t').click(function () {
        if (fb_teacher_student_version === 'teacher') return;

        fb_teacher_student_version = 'teacher';
        toggleStudentTeacherVersion();
    });

    $('#fb-buttonset-teacher-student-s').click(function () {
        if (fb_teacher_student_version === 'student') return;

        fb_teacher_student_version = 'student';
        toggleStudentTeacherVersion();
    });

    $("#fb-button-approve-all").button().click(function () {
        var mce = getVisibleDeriveMce();
        if (mce) {
            var title = $('#title').val();
            mce.plugins.fb_folding_editor.approveAll();
        }
    });
    $("#fb-button-approve-all").prop('disabled', true);


    $("#publish").click(function () {
        $('#fb-tabs-derives .ui-tabs-nav a').each(function (index) {
            var tab_id = $(this).attr('href');
            var mce_tab_index = tab_id.replace("fb-tabs-derive", "fb-derived-mce-tab-index");
            $(mce_tab_index).val(index);

            var mce_tab_name = tab_id.replace("fb-tabs-derive", "fb-derived-mce-title");
            $(mce_tab_name).val($(this).html());
        });

        // sometimes tinymce can submit empty content when 'save' button is clicked, especially for a new derived tab with very few edits
        // make sure save the tinymce content  
        tinymce.triggerSave();
        /*
        for (var e = 0; e < tinymce.editors.length; e++) {
            if (tinymce.editors[e].id.indexOf("fb-derived-mce") >= 0) {
                tinymce.editors[e].save();
            }
        }
        */
    });

    $("#fb-button-highlight-source").button().click(function () {
        var this_button = $("#fb-button-highlight-source");
        if (this_button.attr('value') == "Turn Off Source Highlight") {
            this_button.attr('value', 'Turn On Source Highlight');
            fb_highlighting_source = false;
        }
        else if (this_button.attr('value') == "Turn On Source Highlight") {
            this_button.attr('value', 'Turn Off Source Highlight');
            fb_highlighting_source = true;
        }

        update();
    });

    function toggleStudentTeacherVersion() {
        if (fb_teacher_student_version === 'student') {
            for (var e = 0; e < tinymce.editors.length; e++) {
                if (tinymce.editors[e].id.indexOf("fb-derived-mce") >= 0) {
                    var mce = tinymce.editors[e];
                    $(mce.getBody()).find('.fb-teacher').each(function () {
                        $(this).addClass('fb-student');
                        $(this).removeClass('fb-teacher');
                    });

                    $(mce.getBody()).find('.fb-teacher-bubble').each(function () {
                        $(this).addClass('fb-student-bubble');
                        $(this).removeClass('fb-teacher-bubble');
                    });
                }
            }
        }
        else if (fb_teacher_student_version === 'teacher') {
            for (var e = 0; e < tinymce.editors.length; e++) {
                if (tinymce.editors[e].id.indexOf("fb-derived-mce") >= 0) {
                    var mce = tinymce.editors[e];
                    $(mce.getBody()).find('.fb-student').each(function () {
                        $(this).addClass('fb-teacher');
                        $(this).removeClass('fb-student');
                    });

                    $(mce.getBody()).find('.fb-student-bubble').each(function () {
                        $(this).addClass('fb-teacher-bubble');
                        $(this).removeClass('fb-student-bubble');
                    });
                }
            }
        }
    }

    function toggleSourceColumn() {
        if (fb_show_source_column) {
            $('#fb-td-source-mces').css('display', '');
            $('#fb-td-mid-column').css('display', '');
        }
        else {
            $('#fb-td-source-mces').css('display', 'none');
            $('#fb-td-mid-column').css('display', 'none');
        }

        update();
    }

    function toggleMergeMode() {
        if (fb_merge_mode) {
            generateMergeCases();
        }
        else {
            for (var i = 0; i < tinymce.editors.length; i++) {
                var editor = tinymce.editors[i];
                if (editor.id.indexOf("fb-derived-mce") >= 0) {
                    editor.setContent('');

                    for (var j = 0; j < fb_original_derive_units.length; j++) {
                        if (fb_original_derive_units[j].title === editor.post_name) {
                            editor.setContent(fb_original_derive_units[j].content);
                            break;
                        }
                    }
                }
                else if (editor.id.indexOf("fb-source-mce") >= 0) {
                    editor.setContent('');

                    for (var j = 0; j < fb_original_source_units.length; j++) {
                        if (fb_original_source_units[j].title === editor.post_name) {
                            editor.setContent(fb_original_source_units[j].content);
                            break;
                        }
                    }
                }
            }
        }

        update();
    }

    function getSourcePostInit(post_id, total) {
        var action = null;
        if (fb_post_type == FB_LEVEL_2_POST) {
            action = 'fb_source_query_level_1';
        }
        else if (fb_post_type == FB_LEVEL_3_POST) {
            action = 'fb_source_query_level_2';
        }

        if (action === null) return;

        $.post(ajaxurl,
            {
                'action': action,
                'id': post_id
            },
            function (data, status) {
                if (status.toLowerCase() == "success") {
                    //var outer_text = data.htmltext;
                    var obj = JSON.parse(data);
                    addSourceTab(obj.title, obj.content, obj.modified, post_id);

                    fb_source_mce_init_count++;
                    if (fb_source_mce_init_count == total) {
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
        var previous_sources = [];
        for (var i = 0; i < meta_source_versions.length; i++) {
            if (meta_source_versions[i].source_post_previous_version != meta_source_versions[i].source_post_current_version) {
                var exist = false;
                for (var j = 0; j < previous_sources.length; j++) {
                    if (previous_sources[j].source_post_id == meta_source_versions[i].source_post_id) {
                        exist = true;
                        break;
                    }
                }

                if (!exist) {
                    previous_sources.push({
                        source_post_id: meta_source_versions[i].source_post_id,
                        source_post_modified: meta_source_versions[i].source_post_previous_version
                    });
                }
                //getSourcePostRevision(meta_source_versions[i].source_post_id, meta_source_versions[i].source_post_previous_version, meta_source_versions[i].derive_post_name);
                //$("#fb-button-show-previous-source").prop('disabled', false);
            }
        }

        fb_previous_source_count = 0; // reset to zero

        if (previous_sources.length === 0) {
            //updateVisibleMces(); // this update is too early; not all mce contents have been loaded
        }
        else {
            for (var i = 0; i < previous_sources.length; i++) {
                var p = previous_sources[i];
                getSourcePostRevision(p.source_post_id, p.source_post_modified, previous_sources.length);

            }
        }
    }

    function getSourcePostRevision(post_id, post_modified, total) {
        // before use ajax, check if the post already exists in the memory
        var exist = false;

        if (!exist) {
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

                        fb_previous_source_count++;
                        if (fb_previous_source_count == total) {
                            generateMergeCases();
                            updateVisibleMces(true, true);
                        }
                    }
                    else {
                    }
                });
        }
    }

    function createSourceRevisionObject(post_id, post_modified, post_content) {
        // avoid duplicate objects
        for (var i = 0; i < fb_previous_source_revisions.length; i++) {
            if (fb_previous_source_revisions[i].post_id == post_id) {
                return;
            }
        }

        var obj = new Object();

        obj['post_id'] = post_id;
        obj['post_modified'] = post_modified;
        obj['post_content'] = post_content;

        fb_previous_source_revisions.push(obj);
    }

    function getSourceRevisionContent(post_id) {
        for (var i = 0; i < fb_previous_source_revisions.length; i++) {
            if (fb_previous_source_revisions[i].post_id == post_id) {
                return fb_previous_source_revisions[i].post_content;
            }
        }
        return null;
    }

    function getSourceRevisionDate(post_id) {
        for (var i = 0; i < fb_previous_source_revisions.length; i++) {
            if (fb_previous_source_revisions[i].post_id == post_id) {
                return fb_previous_source_revisions[i].post_modified;
            }
        }
        return null;
    }

    // ms - do not consider the case where one source unit is contained by multiple derive units 
    function generateMergeCases() {
        if (!meta_source_versions) return;

        for (var i = 0; i < meta_source_versions.length; i++) {
            meta_source_versions[i].number_of_merges = 0; // ms
            if (meta_source_versions[i].source_post_previous_version != meta_source_versions[i].source_post_current_version) {
                // only generate merge cases for active derive unit; 
                // because derive units to a source unit is multiple to one relation
                //if (meta_source_versions[i].derive_post_name === flexibook.active_derive_mce.post_name) {
                    var source_post_id = meta_source_versions[i].source_post_id;
                    var old_source_content = getSourceRevisionContent(source_post_id);
                    if (!old_source_content) continue;
                    var derive_post_name = meta_source_versions[i].derive_post_name;

                    generateMergeCaseDeriveUnit(source_post_id, old_source_content, derive_post_name);
                //}
            }
        }
    }

    function generateMergeCaseDeriveUnit(source_post_id, old_content, derive_post_name) {
        for (var i = 0; i < tinymce.editors.length; i++) {
            if (tinymce.editors[i].id.indexOf("fb-source-mce") >= 0 && tinymce.editors[i].post_id == source_post_id) {
                var new_doc = tinymce.editors[i].getDoc();

                var derived_doc = null;
                for (var j = 0; j < tinymce.editors.length; j++) {
                    if (tinymce.editors[j].id.indexOf("fb-derived-mce") >= 0 && tinymce.editors[j].post_name == derive_post_name) {
                        derived_doc = tinymce.editors[j].getDoc();
                        break;
                    }
                }
                if (derived_doc == null) return;

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

                        old_element = old_element.replace(/&nbsp;/ig, ' ').replace(/<br>/g, ''); // remove &nbsp; and <br> tag
                        //old_element = old_element.replace(/&nbsp;/ig, ' ');

                        if (exist_old_source === true && old_element.trim() === '') {
                            return true; // continue
                        }

                        // if the id exist in the old source 
                        if (exist_old_source) {
                            /*
                            n_this.find('span.delete').each(function () {
                                $(this).remove();
                            });
                            */
                            var new_element = unwrapDeleteInsertTagjQuery(n_this);
                            new_element = new_element.replace(/&nbsp;/ig, ' ').replace(/<br>/g, ''); // ms - remove &nbsp; and <br> tag
                            //new_element = new_element.replace(/&nbsp;/ig, ' ');

                            // compare the children elements instead of the parent element
                            /*
                            if ((new_element.indexOf("</table>") >= 0) && (old_element.indexOf("</table>") >= 0)) {
                                var n = $(new_element);
                                var o = $(old_element);
                                //var n_inner_text = n.text();
                                //var o_inner_text = o.text();

                                // get text not nested in child tags
                                var o_text = o.clone()    //clone the element
                                              .children() //select all the children
                                              .remove()   //remove all the children
                                              .end()     //again go back to selected element
                                              .text();
                                o_text = o_text.trim();
                                var n_text = n.clone()    //clone the element
                                              .children() //select all the children
                                              .remove()   //remove all the children
                                              .end()     //again go back to selected element
                                              .text();
                                n_text = n_text.trim();

                                var n_children_html = '';
                                var o_children_html = '';
                                n.children().each(function () {
                                    n_children_html += $(this).html();
                                });
                                o.children().each(function () {
                                    o_children_html += $(this).html();
                                });

                                if (n_children_html === o_children_html && o_text === n_text) return false; // ms - may be not able to detect some changes in rare case 
                            }
                            */

                            if (new_element.trim() != old_element.trim()) {
                                // derive element                                  
                                $(derived_doc.body).find("[id]").each(function () {
                                    if ($(this).attr(fb_data_element_id) && $(this).attr(fb_data_element_id).trim() == id) {
                                        exist_derive = true;

                                        var derive_element = unwrapDeleteInsertTagjQuery($(this));
                                        derive_element = derive_element.replace(/&nbsp;/ig, ' ').replace(/<br>/g, '');

                                        // merge case 1:
                                        if (derive_element.trim() == old_element.trim()) {
                                            $(this).attr(fb_data_merge_case, 1);
                                            $(this).css('border-style', 'dotted');
                                            $(this).css('border-width', '1px');
                                            $(this).css('border-color', 'orange');
                                            setNumberOfMergeRequests(derive_post_name, source_post_id, 1);

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

                                            n_this.attr(fb_data_merge_case, 1); 
                                        }
                                        // merge case 3:
                                        else {
                                            console.log("new_element: " + new_element);
                                            console.log("old_element: " + old_element);
                                            console.log("derive_element: " + derive_element);

                                            $(this).attr(fb_data_merge_case, 3);
                                            $(this).css('border-style', 'dotted');
                                            $(this).css('border-width', '1px');
                                            $(this).css('border-color', 'orange');

                                            //$(this).css('margin-left', '50px');
                                            setNumberOfMergeRequests(derive_post_name, source_post_id, 1);
                                            
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

                                            n_this.attr(fb_data_merge_case, 3);
                                            
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
                                        if ($(this).attr(fb_data_element_id) && $(this).attr(fb_data_element_id).trim() == pid) {
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
                                    n_this.attr(fb_data_merge_case, 5); // this modification is in memory only, will not be saved to database
                                    addNewItemToDerive(n_this, new_doc, derived_doc, source_post_id);
                                    setNumberOfMergeRequests(derive_post_name, source_post_id, 1);
                                }
                            }

                            // merge case 5:
                            /*
                            var html = n_this.html();
                            var html = "<span class='insert insert-merge'>" + html + "</span>";
                            n_this.html(html);
                            n_this.attr(fb_data_merge_case, 5); // this modification is in memory only, will not be saved to database
                            addNewItemToDerive(n_this, new_doc, derived_doc, source_post_id);
                            setNumberOfMergeRequests(derive_post_name, source_post_id, 1);
                            */
                        }
                    }
                });

                // cases 6, 7, 8
                $(old_doc.body).children().each(function (index) {
                    var o_this = $(this);
                    //if (o_this.hasClass("fb_tinymce_left_column") == false && o_this.hasClass("fb_tinymce_left_column_icon") == false) {
                    if (isTinymceAdminElement(o_this)) return true; // continue

                    var o_html = unwrapDeleteInsertTagjQuery(o_this);
                    o_html = o_html.replace(/&nbsp;/ig, ' ').replace(/<br>/g, '');
                    if (o_html.trim() === '') {
                        return true; // continue 
                    }

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
                                if ($(this).attr(fb_data_element_id) && $(this).attr(fb_data_element_id).trim() == id) {
                                    var d_html = unwrapDeleteInsertTagjQuery($(this));
                                    d_html = d_html.replace(/&nbsp;/ig, ' ').replace(/<br>/g, '');
                                    if (d_html.trim() === '') {
                                        return false; // break 
                                    }

                                    // case 6: exist in derived document
                                    exist_derive = true;
                                    addDeleteItemToSource(o_this, new_doc, old_doc, source_post_id);
                                    $(this).attr(fb_data_merge_case, 6);
                                    $(this).css('border-style', 'dotted');
                                    $(this).css('border-width', '1px');
                                    $(this).css('border-color', 'orange');
                                    //var html = $(this).html();
                                    var html = unwrapDeleteInsertTagjQuery($(this));
                                    var html = "<span class='delete delete-merge'>" + html + "</span>";
                                    $(this).html(html);
                                    //$(this).css('background-color', 'lightpink');
                                    setNumberOfMergeRequests(derive_post_name, source_post_id, 1);
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
                    $(clone).attr(fb_data_merge_case, 6);

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
                        $(clone).attr(fb_data_merge_case, 6);

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
                if ($(this).attr(fb_data_element_id) && $(this).attr(fb_data_element_id) == prev_id) {
                    $(clone).attr(fb_data_merge_case, 5);
                    $(clone).attr(fb_data_post_id, post_id);
                    $(clone).css('border-style', 'dotted');
                    $(clone).css('border-width', '1px');
                    $(clone).css('border-color', 'orange');

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
                    if ($(this).attr(fb_data_element_id) && $(this).attr(fb_data_element_id) == next_id) {
                        $(clone).attr(fb_data_merge_case, 5);
                        $(clone).attr(fb_data_post_id, post_id);
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

    function setNumberOfMergeRequests(derive_post_name, source_post_id, value) {
        if (!meta_source_versions || meta_source_versions.length <= 0) return;

        for (var j = 0; j < meta_source_versions.length; j++) {
            if (source_post_id === meta_source_versions[j].source_post_id && derive_post_name === meta_source_versions[j].derive_post_name) {
                meta_source_versions[j]['number_of_merges'] += value;
                if (value === -1 && meta_source_versions[j]['number_of_merges'] === 0) {
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
        width: "50%",
        buttons: {
            Open: function () {
                var checked = document.getElementById("fb-checkbox-add-all-selected-sources").checked;

                if (fb_post_type == FB_LEVEL_2_POST) {
                    if (selected_sources.length > 1) {
                        alert("You cannot open more than one " + FB_LEVEL_1_POST + " document.");
                        $('#fb-selectable-source-list .ui-selected').removeClass('ui-selected');
                        return;
                    }

                    var n = $('#fb-tabs-derives .ui-tabs-nav a').length;
                    if ((n >= 1) && checked) {
                        alert("You cannot open more than one " + FB_LEVEL_2_POST + " document.");
                        $('#fb-selectable-source-list .ui-selected').removeClass('ui-selected');
                        return;
                    }
                }

                //addTab();
                for (var i = 0; i < selected_sources.length; i++) {
                    var post_id = selected_sources[i];
                    getSourcePost(post_id, checked);
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
                document.getElementById("fb-checkbox-add-all-selected-sources").checked = false;
                $(this).dialog("close");
            },
        },
        close: function () {
            selected_sources.splice(0);
            $('#fb-selectable-source-list .ui-selected').removeClass('ui-selected');
            document.getElementById("fb-checkbox-add-all-selected-sources").checked = false;
        }
    });

    $("#fb-button-open-source-document").button().click(function () {
        selected_sources.splice(0);
        $('#fb-selectable-source-list .ui-selected').removeClass('ui-selected');
        fb_source_selection_dialog.dialog("open");
    });
    $("#fb-button-open-source-document").prop('disabled', true);

    $("#fb-button-search-source-list").click(function () {
        $(".fb-li-source-list").each(function () {
            var li = $(this);
            if (li.hasClass('fb-li-source-list-hide')) {
                li.removeClass('fb-li-source-list-hide');
            }
        });

        var t = $('#fb-input-search-source-list').val().trim();
        if (!t || t.length <= 0) return;
        t = t.toLowerCase();

        //var words = t.split('');

        $(".fb-li-source-list").each(function () {
            var li = $(this);
            if (li.html().toLowerCase().indexOf(t) < 0) {
                li.addClass('fb-li-source-list-hide');
            }
        });
    });

    //----------------------------------------------------------------------------------------
    // add derive dialog
    var fb_add_derive_dialog = $("#fb-add-derive-dialog").dialog({
        autoOpen: false,
        modal: true,
        //width: "20%",
        buttons: {
            Add: function () {
                var title = document.getElementById("fb-derive-document-title").value;
                addDeriveTab(title, '', -1);

                $(this).dialog("close");
            },
            Cancel: function () {
                $(this).dialog("close");
            },
        },
        close: function () {
            document.getElementById("fb-derive-document-title").value = "";
        }
    });

    $("#fb-button-add-derive-document").button().click(function () {
        fb_add_derive_dialog.dialog("open");
    });

    //----------------------------------------------------------------------------------------
    // rename derive tab dialog
    var fb_rename_derive_dialog = $("#fb-rename-derive-tab-dialog").dialog({
        autoOpen: false,
        modal: true,
        width: "20%",
        buttons: {
            Ok: function () {
                var title = $('#fb-input-rename-derive-tab').val();

                if (!title || title.trim().length <= 0) {
                    alert('Please enter a valid document name.');
                    return;
                }

                var tab_id = $("#fb-tabs-derives .ui-tabs-panel:visible").attr("id");

                $('#fb-tabs-derives .ui-tabs-nav a').each(function (index) {
                    if ('#' + tab_id === $(this).attr('href')) {
                        // update the tab name
                        $(this).html(title);

                        // update the post_name property of the related derive mce
                        var derive_mce_id = tab_id.replace("fb-tabs-derive", "fb-derived-mce");
                        var derive_mce = tinymce.get(derive_mce_id);
                        var old_name = derive_mce.post_name;
                        derive_mce.post_name = title;

                        // update the meta data 
                        for (var j = 0; j < meta_source_versions.length; j++) {
                            if (old_name == meta_source_versions[j].derive_post_name) {
                                meta_source_versions[j].derive_post_name = title;
                                break;
                            }
                        }

                        return false;
                    }
                });

                $(this).dialog("close");
            },
            Cancel: function () {
                $(this).dialog("close");
            },
        },
        close: function () {
            $('#fb-input-rename-derive-tab').val('');
        }
    });

    $("#fb-button-rename-derive-tab").button().click(function () {
        var tab_id = $("#fb-tabs-derives .ui-tabs-panel:visible").attr("id");

        $('#fb-tabs-derives .ui-tabs-nav a').each(function (index) {
            if ('#' + tab_id === $(this).attr('href')) {
                $('#fb-input-rename-derive-tab').val($(this).html());
                return false;
            }
        });

        fb_rename_derive_dialog.dialog("open");
    });

    $("#fb-button-table-of-content").button().click(function () {
        var tab_index = -1;
        $('#fb-tabs-derives .ui-tabs-nav a').each(function (index) {
            var a = $(this);
            if (a.html() == "Table of Content") {
                tab_index = index;
                return false;
            }
        });

        if (tab_index >= 0) {
            $('#fb-tabs-derives').tabs("option", "active", tab_index);
        }
        else {
            addDeriveTab('Table of Content', '', 'toc');
        }

        var post_names = [];
        $('#fb-tabs-derives .ui-tabs-nav a').each(function (index) {
            var a = $(this);
            if (a.html() != "Table of Content") {
                post_names.push(a.html());
            }
        });

        var toc_mce = getVisibleDeriveMce();
        if (toc_mce) {
            var title = $('#title').val();
            toc_mce.plugins.fb_folding_editor.updateMasterTOC(title, post_names);
        }
    });

    function getSourcePost(post_id, add_to_derive) {
        var action = null;
        if (fb_post_type == FB_LEVEL_2_POST) {
            action = 'fb_source_query_level_1';
        }
        else if (fb_post_type == FB_LEVEL_3_POST) {
            action = 'fb_source_query_level_2';
        }

        if (action === null) return;

        $.post(ajaxurl,
            {
                'action': action,
                'id': post_id
            },
            function (data, status) {
                if (status.toLowerCase() == "success") {
                    //var outer_text = data.htmltext;
                    var obj = JSON.parse(data);
                    addSourceTab(obj.title, obj.content, obj.modified, post_id);
                    if (add_to_derive) {
                        var derive_mce = addDeriveTab(obj.title, obj.content, -1);
                        if (derive_mce) {
                            $(derive_mce.getBody()).children().each(function () {
                                $(this).attr(fb_data_post_id, post_id);
                            });
                        }
                    }
                }
                else {
                }
            });
    }


    //----------------------------------------------------------------------------------------
    // source and derived tabs

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
        updateVisibleMces(true, true);

        if (fb_post_type == FB_LEVEL_2_POST) {
            var n = $('#fb-tabs-sources .ui-tabs-nav a').length;
            if (n === 0) {
                $("#fb-button-open-source-document").prop('disabled', false);
            }
        }
    });

    source_tabs.on("tabsactivate", function (event, ui) {
        // console.log("tab activate...");
        // var active_tab_id = $(".ui-state-active").attr("id");
        //var tabIndex = $('#fb-tabs-sources').tabs('option', 'active');
        //var selected = $("#fb-tabs-sources ul>li a").eq(tabIndex).attr('href');

        //generateMergeCases();
        updateVisibleMces(true, true);
        update("fb_on_source_tabs_activate");
    });

    // close icon: removing the tab on click
    derive_tabs.delegate("span.ui-icon-close", "click", function () {
        var panelId = $(this).closest("li").remove().attr("aria-controls");
        $("#" + panelId).remove();
        derive_tabs.tabs("refresh");


        var tab_id = $("#fb-tabs-derives .ui-tabs-panel:visible").attr("id");
        if (!tab_id) {
            if (fb_post_type == FB_LEVEL_2_POST) {
                var n = $('#fb-tabs-derives .ui-tabs-nav a').length;
                if (n === 0) {
                    $("#fb-button-add-derive-document").prop('disabled', false);
                }
            }

            return; // return here is a temp solution to avoid the error generated by the command 'mceRemoveEditor' below
        }


        var derive_mce_id = panelId.replace("fb-tabs-derive", "fb-derived-mce");
        tinymce.execCommand('mceRemoveEditor', false, derive_mce_id); // error

        flexibook.active_derive_mce = getVisibleDeriveMce();

        updateVisibleMces(true, true);
        update("fb_on_tabs_remove");
    });

    derive_tabs.on("tabsactivate", function (event, ui) {
        // console.log("tab activate...");
        // var active_tab_id = $(".ui-state-active").attr("id");
        //var tabIndex = $('#fb-tabs-derives').tabs('option', 'active');
        //var selected = $("#fb-tabs-derives ul>li a").eq(tabIndex).attr('href');

        flexibook.active_derive_mce = getVisibleDeriveMce();

        updateVisibleMces(true, true);
        update("fb_on_derived_tabs_activate");
    });


    function addSourceTab(title, content, post_modified, post_id) {
        var tab_id = "fb-tabs-source-" + tab_counter_source;
        var mce_id = 'fb-source-mce-' + tab_counter_source;
        var li_id = tab_id + "-selector";
        var li = $(tab_template.replace(/#\{href\}/g, "#" + tab_id)
                               .replace(/#\{label\}/g, title)
                               .replace(/#\{id\}/g, li_id)
                               .replace(/#\{postid\}/g, post_id));

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

        // keep the original source content
        //$("#fb-data-source-mces").append("<div data-title='" + title + "'>'" + content + "'</div>");
        fb_original_source_units.push({
            'title': title,
            'content': content
        });

        var source_mce = tinymce.get(mce_id);
        source_mce.plugins.fb_folding_editor.setupPostType(fb_post_type);

        source_mce.setContent(content); // note: the get method does not work when tinymce.js has not been loaded;
        source_mce.on('change', function (e) {
            //update();
        });
        source_mce["post_id"] = post_id;
        source_mce["post_modified"] = post_modified;
        source_mce["post_name"] = title;
        source_mce["original_margin_top"] = parseInt($(source_mce.getBody()).css('margin-top'), 10);
        source_mce["current_margin_top"] = source_mce["original_margin_top"];

        if (tab_counter_source == 0) {
            source_tabs.removeClass('fb-tabs-sources-display-none');
        }

        source_tabs.tabs("refresh");
        source_tabs.tabs("option", "active", $('#' + li_id).index());
        source_tabs.find(".ui-tabs-nav").sortable({
            axis: "x",
            stop: function () {
                source_tabs.tabs("refresh");
            }
        });
        meta_source_tabs_post_ids[tab_id] = post_id; // add property for quick index
        meta_source_tabs_post_ids.push(post_id);
        updateSourceTabsInput();

        if (fb_post_type == FB_LEVEL_2_POST) {
            var n = $('#fb-tabs-sources .ui-tabs-nav a').length;
            if (n === 1) {
                $("#fb-button-open-source-document").prop('disabled', true);
            }
        }

        tab_counter_source++;
    }

    function addDeriveTab(title, content, postid) {
        var tab_id = "fb-tabs-derive-" + tab_counter_derive;
        var mce_id = 'fb-derived-mce-' + tab_counter_derive;
        var mce_title = 'fb-derived-mce-title-' + tab_counter_derive;
        var mce_tab_index = 'fb-derived-mce-tab-index-' + tab_counter_derive;
        var li_id = tab_id + "-selector";
        var li = $(tab_template.replace(/#\{href\}/g, "#" + tab_id)
                               .replace(/#\{label\}/g, title)
                               .replace(/#\{id\}/g, li_id)
                               .replace(/#\{postid\}/g, postid));

        if (postid === 'toc') {
            $("#fb-ul-derive-tabs").prepend(li);
            derive_tabs.append("<div id='" + tab_id + "' style='padding-left:5px;padding-right:5px'></div>");
        }
        else {
            $("#fb-ul-derive-tabs").append(li);
            derive_tabs.append("<div id='" + tab_id + "' style='padding-left:5px;padding-right:5px'></div>");
        }

        //$("#" + tab_id).append("<div id='" + mce_id + "' style='height:600px'></div>");
        $("#" + tab_id).append("<textarea id='" + mce_id + "' name='" + mce_id + "' style='height:800px'></textarea>"); // save to database
        $("#" + tab_id).append("<input id='" + mce_title + "' name='" + mce_title + "' value='" + title + "' style='display:none'/>"); // save to database
        $("#" + tab_id).append("<input id='" + mce_tab_index + "' name='" + mce_tab_index + "' style='display:none'/>"); // save to database; the value will be set when save button is clicked
        //tinymce.init();
        tinymce.execCommand('mceAddEditor', false, mce_id);

        var derive_mce = tinymce.get(mce_id);
        derive_mce.plugins.fb_folding_editor.setupPostType(fb_post_type);

        derive_mce.setContent(content); // note: the get method does not work when tinymce.js has not been loaded;
        derive_mce.on('change', function (e) {
            //update();
        });
        derive_mce["post_name"] = title;

        if (tab_counter_derive == 0) {
            derive_tabs.removeClass('fb-tabs-sources-display-none');
        }

        derive_tabs.tabs("refresh");
        derive_tabs.tabs("option", "active", $('#' + li_id).index());
        derive_tabs.find(".ui-tabs-nav").sortable({
            axis: "x",
            stop: function () {
                derive_tabs.tabs("refresh");
            }
        });

        if (fb_post_type == FB_LEVEL_2_POST) {
            var n = $('#fb-tabs-derives .ui-tabs-nav a').length;
            if (n === 1) {
                $("#fb-button-add-derive-document").prop('disabled', true);
            }
        }

        tab_counter_derive++;

        return derive_mce;
    }

    function getVisibleDeriveMce() {
        // get active tab id
        var tab_id = $("#fb-tabs-derives .ui-tabs-panel:visible").attr("id");
        if (!tab_id) return null;
        var derive_mce_id = tab_id.replace("fb-tabs-derive", "fb-derived-mce");
        var derive_mce = tinymce.get(derive_mce_id);

        return derive_mce;
    }

    function getVisibleSourceMce() {
        // get active tab id
        var tab_id = $("#fb-tabs-sources .ui-tabs-panel:visible").attr("id");
        if (!tab_id) return;
        var source_mce_id = tab_id.replace("fb-tabs-source", "fb-source-mce");
        var source_mce = tinymce.get(source_mce_id);

        return source_mce;
    }

    //-----------------------------------------------------------------------------------------------------
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

    /*
    function update(caller_function) {

        //debounceUpdate();
    }

    var debounceUpdate = _.debounce(executeAllUpdates, 1000);
    */

    var debounce_update = null;
    //if (debounce_update === null) debounce_update = _.debounce(executeUpdate, 200, true); // execute immediately
    if (debounce_update === null) debounce_update = _.debounce(executeUpdate, 200); 

    function update(caller_function) {
        //debounce_update(caller_function);
        executeUpdate(caller_function);
    }

    // this is the original update function without debounce
    function executeUpdate(caller_function) {
        if (flexibook.postpone_update == true) return;
        if (fb_derived_mce_init_done == false) return;
        caller_function = caller_function || '';
        console.log(".........................................................................");
        console.log("derived.js update;" + " caller_function: " + caller_function);

        var t0 = performance.now();

        updateMetaSourceVersions();
        var t1 = performance.now();
        var p1 = t1 - t0;
        console.log("performance (updateMetaSourceVersions): " + p1);

        updatePublishButton();
        var t2 = performance.now();
        var p2 = t2 - t1;
        console.log("performance (updatePublishButton): " + p2);

        updateSourceHighlight();
        var t3 = performance.now();
        var p3 = t3 - t2;
        console.log("performance (updateSourceHighlight): " + p3);

        if (caller_function != 'fb_on_mouse_wheel_end') {
            updateHTMLDiff();
        }
        var t4 = performance.now();
        var p4 = t4 - t3;
        console.log("performance (updateHTMLDiff): " + p4);

        updateSVG(caller_function);
        var t5 = performance.now();
        var p5 = t5 - t4;
        console.log("performance (updateSVG): " + p5);
    }

    function updateAllMces() {
        for (var i = 0; i < tinymce.editors.length; i++) {
            var editor = tinymce.editors[i];
            if ((editor.id.indexOf("fb-source-mce") >= 0) || (editor.id.indexOf("fb-derived-mce") >= 0)) {
                updateMce(editor);
            }
        }
    }

    function updateVisibleMces(update_source, update_derive) {
        if (update_source) {
            var source_mce = getVisibleSourceMce();
            if (source_mce) {
                updateMce(source_mce);
            }
        }

        if (update_derive) {
            var derive_mce = getVisibleDeriveMce();
            if (derive_mce) {
                updateMce(derive_mce);
            }
        }
    }

    function updateMce(mce) {
        if (!mce) return;
        mce.plugins.fb_folding_editor.updatePublic(false);
    }

    function updateSourceHighlight() {
        // get active tab id
        var source_mce = getVisibleSourceMce();
        if (!source_mce) return;
        var source_doc = source_mce.getDoc();
        var pid = source_mce.post_id;

        highlightSource(source_doc, pid);
    }

    function highlightSource(source_doc, pid) {
        if (fb_highlighting_source == false) {
            $(source_doc.body).children().each(function (index) {
                //$(this).css("opacity", 1);
                if ($(this).hasClass('fb-source-highlight')) {
                    $(this).removeClass('fb-source-highlight');
                }
            });
        }
        else {
            $(source_doc.body).children().each(function (index) {
                //$(this).css("opacity", 0.3);
                if (!$(this).hasClass('fb-source-highlight')) {
                    $(this).addClass('fb-source-highlight');
                }
            });

            if (!flexibook.active_derive_mce) return;

            var derived_doc = flexibook.active_derive_mce.getDoc();
            $(derived_doc.body).children().each(function (index) {
                if ($(this).hasClass('fb-source-highlight')) {
                    $(this).removeClass('fb-source-highlight');
                }
            });

            $(derived_doc.body).children().each(function (index) {
                var derive = $(this);
                if (isTinymceAdminElement(derive)) return true; // continue
                var source_id = derive.attr(fb_data_element_id);
                var source_post_id = derive.attr(fb_data_post_id);

                if (source_post_id && source_post_id == pid && source_id && source_id != 'none') {
                    var source = source_doc.getElementById(source_id);
                    if (source) {
                        //$(source).css("opacity", 1);
                        if ($(source).hasClass('fb-source-highlight')) {
                            $(source).removeClass('fb-source-highlight');
                        }
                    }
                }
            });
        }
    }

    function updateMetaSourceVersions() {
        if (fb_derived_mce_init_done == false) return;

        // remove objects from meta_source_versions if they are not longer in derived tabs 
        var names = [];
        $('#fb-tabs-derives .ui-tabs-nav a').each(function () {
            names.push($(this).html());
        });
        /*
        // bug: the mce editor has not been removed 
        for (var i = 0; i < tinymce.editors.length; i++) {
            var e = tinymce.editors[i];
            if (e.id.indexOf("fb-derived-mce") >= 0) {
                names.push(e.post_name);
            }
        }
        */
        for (var i = meta_source_versions.length - 1; i >= 0; i--) {
            if (names.indexOf(meta_source_versions[i].derive_post_name) == -1) {
                meta_source_versions.splice(i, 1);
            }
        }

        // update meta_source_versions
        $('#fb-tabs-derives .ui-tabs-nav a').each(function () {
            var derive_post_name = $(this).html();
            var derive_doc = getDeriveDocByName(derive_post_name);
            
            if (derive_doc != null) {
                var source_post_ids = getUniqueSourcePostIDs(derive_doc);
                updateMetaSourceVersionsForDeriveUnit(derive_post_name, source_post_ids)
            }
        });

        var meta_source_versions_string = JSON.stringify(meta_source_versions);
        $("#fb-input-derived-meta").val(meta_source_versions_string);

        updateMetaBoxSourceVersions();
    }

    function updatePublishButton() {
        $("#publish").attr('value', 'Save');
        $("#publish").prop('disabled', false);
        if (fb_merge_mode) {
            for (var i = 0; i < meta_source_versions.length; i++) {
                if (meta_source_versions[i].number_of_merges > 0) {
                    $("#publish").prop('disabled', true);
                    break;
                }
            }
        }
    }

    function getDeriveDocByName(derive_post_name) {
        for (var e = 0; e < tinymce.editors.length; e++) {
            if (tinymce.editors[e].id.indexOf("fb-derived-mce") >= 0 && tinymce.editors[e].post_name == derive_post_name) {
                var derived_doc = tinymce.editors[e].getDoc();
                return derived_doc;
            }
        }

        return null;
    }

    function updateMetaSourceVersionsForDeriveUnit(derive_post_name, source_post_ids) {
        if (meta_source_versions.length == 0) {
            for (var i = 0; i < source_post_ids.length; i++) {
                createNewDeriveMetaObject(derive_post_name, source_post_ids[i]);
            }
        }
        else {
            // firstly, remove objects from meta_source_versions if they are not longer in a derived document 
            for (var i = meta_source_versions.length - 1; i >= 0; i--) {
                if (derive_post_name == meta_source_versions[i].derive_post_name) {
                    if (source_post_ids.indexOf(meta_source_versions[i].source_post_id) == -1) {
                        meta_source_versions.splice(i, 1);
                    }
                }
            }

            for (var i = 0; i < source_post_ids.length; i++) {
                var post_ids_exist = false;
                for (var j = 0; j < meta_source_versions.length; j++) {
                    if (derive_post_name == meta_source_versions[j].derive_post_name && source_post_ids[i] == meta_source_versions[j].source_post_id) {
                        // ms - not yet consider the source editors have been closed 
                        for (var t = 0; t < tinymce.editors.length; t++) {
                            if (tinymce.editors[t].post_id == source_post_ids[i]) {
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
                    createNewDeriveMetaObject(derive_post_name, source_post_ids[i]);
                }
            }
        }
    }

    // this function will also set the corresponding derive tabs that require merge to a different color as well
    function updateMetaBoxSourceVersions() {
        var table = document.getElementById("fb-table-derived-meta");

        $("#fb-button-approve-all").prop('disabled', true);

        // remove all data rows first
        if (table.rows.length > 1) {
            for (var i = table.rows.length - 1; i >= 1; i--) {
                table.deleteRow(i);
            }
        }

        // reset all derived tabs' title
        $('#fb-tabs-derives .ui-tabs-nav a').each(function () {
            $(this).css('color', 'black');
        });

        if (!flexibook.active_derive_mce) return;

        for (var i = 0; i < meta_source_versions.length; i++) {
            var row = table.insertRow();
            var cell1 = row.insertCell(0);
            var cell2 = row.insertCell(1);
            var cell3 = row.insertCell(2);
            var cell4 = row.insertCell(3);
            var cell5 = row.insertCell(4);
            cell1.innerHTML = meta_source_versions[i].derive_post_name;
            cell2.innerHTML = meta_source_versions[i].source_post_name;
            cell3.innerHTML = meta_source_versions[i].source_post_previous_version;
            cell4.innerHTML = meta_source_versions[i].source_post_current_version;
            cell5.innerHTML = meta_source_versions[i].number_of_merges;
        }

        if (table.rows.length > 1) {
            for (var i = 1; i < table.rows.length; i++) {
                var cells = table.rows[i].cells;
                if (cells[2].innerHTML.trim() != cells[3].innerHTML.trim()) {
                    table.rows[i].style.backgroundColor = "lightpink";
                    $("#fb-button-approve-all").prop('disabled', false);

                    // set the corresponding derive tabs as well
                    $('#fb-tabs-derives .ui-tabs-nav a').each(function () {
                        var a = $(this);
                        // if the derive_post_name is matched
                        if (a.html() === cells[0].innerHTML.trim()) {
                            if (a.css('color') != 'lightpink') {
                                a.css('color', 'lightpink');
                            }
                            return false;
                        }
                    });
                }
            }

            for (var i = 1; i < table.rows.length; i++) {
                var cells = table.rows[i].cells;
                if (cells[0].innerHTML.trim() != flexibook.active_derive_mce.post_name) {
                    table.rows[i].style.opacity = 0.3;
                }
            }
        }
    }

    function createNewDeriveMetaObject(derive_post_name, post_id) {
        var obj = new Object();
        obj['source_post_id'] = post_id;
        obj['number_of_merges'] = 0;

        // ms - not yet consider the source editors have been closed 
        for (var j = 0; j < tinymce.editors.length; j++) {
            if ((tinymce.editors[j].id.indexOf("fb-source-mce") >= 0) && (tinymce.editors[j].post_id == post_id)) {
                obj['derive_post_name'] = derive_post_name;
                obj['source_post_previous_version'] = tinymce.editors[j].post_modified;
                obj['source_post_current_version'] = tinymce.editors[j].post_modified;
                obj['source_post_name'] = tinymce.editors[j].post_name;
                break;
            }
        };

        meta_source_versions.push(obj);
    }

    function getUniqueSourcePostIDs(derived_doc) {
        var ids = [];

        $(derived_doc.body).find("[" + fb_data_post_id + "]").each(function (index) {
            var post_id = $(this).attr(fb_data_post_id).trim();
            if (ids.indexOf(post_id) == -1) {
                ids.push(post_id);
            }
        });

        return ids;
    }
    
    function updateHTMLDiff() {
        if (!flexibook.active_derive_mce) return;
        var derived_doc = flexibook.active_derive_mce.getDoc();
        var derived_editor_height = getiFrameHeight(derived_doc);

        // get active tab id
        var source_mce = getVisibleSourceMce();
        if (!source_mce) return;
        var source_doc = source_mce.getDoc();
        var source_editor_height = getiFrameHeight(source_doc);

        // firstly clean base document
        var scrolled_into_view_started = false;
        var clean_base = true;
        if (clean_base) {
            var source_children = source_doc.body.children;
            for (var i = 0; i < source_children.length; i++) {
                var base = $(source_children[i]);
                var baseNative = source_children[i];
                //$(source_doc.body).children().each(function (index) {
                //var base = $(this);
                if (isTinymceAdminElement(base)) continue; // continue
                if (base.attr(fb_data_merge_case)) continue; // continue; ms - skip the elements that require merge actions

                if (isElementScrolledIntoViewNative(baseNative, source_doc, source_editor_height) == false) {
                    if (scrolled_into_view_started == false) {
                        continue; // continue; only update elements that are visible
                    }
                    else {
                        break; // break;
                    }
                }

                scrolled_into_view_started = true;
                var id = base.attr('id');
                if (id && id != 'none') {
                    var source_html = unwrapDeleteInsertTagjQuery(base);
                    base.html(source_html);
                }
            //});
            }
        }

        var total_time_on_html_diff = 0;
        var total_time_on_performance_test = 0;
        var visible_derived_elements = 0; // performance
        var scrolled_into_view_started = false;
        var children = derived_doc.body.children;
        for (var i = 0; i < children.length; i++) {
            var comp = $(children[i]);
            var compNative = children[i];

            if (isTinymceAdminElement(comp)) continue; // continue
            if (comp.attr(fb_data_merge_case)) continue; // continue; ms - skip the elements that require merge actions

            var source_id = comp.attr(fb_data_element_id);
            if (source_id && source_id != 'none') {
                var base = source_doc.getElementById(source_id);
                if (base) {
                    if (isElementScrolledIntoViewNative(compNative, derived_doc, derived_editor_height) == false &&
                        isElementScrolledIntoViewNative(base, source_doc, source_editor_height) == false) {
                        continue; // continue; only update elements that are visible
                    }
                }
                else {
                    if (isElementScrolledIntoViewNative(compNative, derived_doc, derived_editor_height) == false) {
                        continue; // continue; only update elements that are visible
                    }
                }
            }
            else {
                if (isElementScrolledIntoViewNative(compNative, derived_doc, derived_editor_height) == false) {
                    continue; // continue; only update elements that are visible
                }
            }

            scrolled_into_view_started = true;
            visible_derived_elements++;

            // performance test start
            var t_test = performance.now();
            if (source_id && source_id != 'none') {
                // stores a bookmark of the current selection
                var derive_bookmark = getBookmark(comp); // use a non-html bookmark
                //var derive_bookmark = flexibook.active_derive_mce.selection.getBookmark(2, true); // use a non-html bookmark

                // restore the selection bookmark
                moveToBookmark(derive_bookmark);
                //flexibook.active_derive_mce.selection.moveToBookmark(derive_bookmark);
            }
            total_time_on_performance_test += (performance.now() - t_test);
            // performance test end

            //console.log('visible_derived_elements: ' + visible_derived_elements);
            var id = comp.attr('id');

            if (source_id && source_id != 'none') {
                // stores a bookmark of the current selection
                var derive_bookmark = null;
                derive_bookmark = getBookmark(comp); // use a non-html bookmark
                //var derive_bookmark = flexibook.active_derive_mce.selection.getBookmark(2, true); // use a non-html bookmark
                var base = source_doc.getElementById(source_id);
                if (base) {
                    var derive_html = unwrapDeleteInsertTagjQuery(comp);

                    var source_html = $(base).html();

                    if (source_html != derive_html) {
                        var t = performance.now();
                        // comp element
                        var r1 = html_diff(source_html, derive_html, 'insert');
                        comp.html(r1);

                        // base element
                        var r2 = html_diff(source_html, derive_html, 'delete');
                        $(base).html(r2);

                        total_time_on_html_diff += (performance.now() - t);
                    }
                    else if (source_html == derive_html) {
                        // derive element
                        comp.html(derive_html);

                        // source element
                        $(base).html(source_html);
                    }
                }
                else {
                    // bugs - this section generates bugs especially for <ol>, <ul> ... elements, disable these elements for now
                    if ((comp.prop("tagName").toLowerCase() != 'ol') &&
                        (comp.prop("tagName").toLowerCase() != 'ul') &&
                        (comp.prop("tagName").toLowerCase() != 'table')) {
                        var newHtml = unwrapDeleteInsertTagjQuery(comp);
                        var newHtml = "<span class='insert'>" + newHtml + "</span>";
                        comp.html(newHtml);
                    }
                }

                // restore the selection bookmark
                moveToBookmark(derive_bookmark);
                //flexibook.active_derive_mce.selection.moveToBookmark(derive_bookmark);
            }
            else {
                if (id && id != 'none') {
                    // bugs - this section generates bugs especially for <ol>, <ul> ... elements, disable these elements for now
                    if ((comp.prop("tagName").toLowerCase() != 'ol') &&
                        (comp.prop("tagName").toLowerCase() != 'ul') &&
                        (comp.prop("tagName").toLowerCase() != 'table')) {
                        var derive_bookmark = null;
                        derive_bookmark = getBookmark(comp); // use a non-html bookmark
                        //var derive_bookmark = flexibook.active_derive_mce.selection.getBookmark(2, true); // use a non-html bookmark
                        // stores a bookmark of the current selection
                        //console.log("comp outer: " + comp.prop('outerHTML'));
                        var newHtml = unwrapDeleteInsertTagjQuery(comp);
                        //console.log("newHtml: " + newHtml);

                        if (newHtml.trim().length > 0) {
                            var newHtml = "<span class='insert'>" + newHtml + "</span>";
                            comp.html(newHtml);
                        }
                        else {
                            comp.remove(); // remove paragraphs with empty strings, i.e., '';
                        }

                        // restore the selection bookmark
                        moveToBookmark(derive_bookmark);
                        //flexibook.active_derive_mce.selection.moveToBookmark(derive_bookmark);
                    }
                }
            }
        }
        console.log('   total_visible_derived_elements: ' + visible_derived_elements);
        console.log('   total_time_on_html_diff: ' + total_time_on_html_diff);
        console.log('   total_time_on_performance_test: ' + total_time_on_performance_test);
    }
    

    function getBookmark(element) {
        if (element.className && element.className.indexOf('fb-display-none-h') >= 0) return null;
        return flexibook.active_derive_mce.selection.getBookmark(2, true); // use a non-html bookmark
    }

    function moveToBookmark(derive_bookmark) {
        if (!derive_bookmark) return;
        flexibook.active_derive_mce.selection.moveToBookmark(derive_bookmark);
    }

    // this function is much slower than the native version below
    /*
    function isElementScrolledIntoView(element, doc, editorHeight) {
        if (!element) return false;
        if (!doc) return false;
        var editorViewTop = doc.body.scrollTop;
        var editorViewBottom = editorViewTop + editorHeight;

        var elemTop = element.offset().top; // performance issue
        var elemBottom = elemTop + element.height(); // performance issue

        if ((elemTop > editorViewBottom) || (elemBottom < editorViewTop)) return false;
        return true;
    }
    */

    function isElementScrolledIntoViewNative(element, doc, editorHeight) {
        if (!element) return false;
        if (!doc) return false;
        if (element.className && element.className.indexOf('fb-display-none-h') >= 0) return false;

        var editorViewTop = doc.body.scrollTop;
        var editorViewBottom = editorViewTop + editorHeight;

        var elemTop = element.offsetTop;
        var elemBottom = elemTop + element.offsetHeight;

        if ((elemTop > editorViewBottom) || (elemBottom < editorViewTop)) return false;
        return true;
    }

    function updateSVG(caller_function) {
        if (!flexibook.active_derive_mce) {
            // remove all polygons
            $('#fb-svg-mid-column').find('.fb-svg-polygons').remove();
            return;
        }
        var derived_doc = flexibook.active_derive_mce.getDoc();
        var derived_editor_height = getiFrameHeight(derived_doc);

        // get active tab id
        var source_mce = getVisibleSourceMce();
        if (!source_mce) return;
        var source_doc = source_mce.getDoc();
        var source_editor_height = getiFrameHeight(source_doc);

        var svg_column_id = 'fb-svg-mid-column';

        var source_iframe_container_top = getiFrameOffsetTop(source_doc);
        var derived_iframe_container_top = getiFrameOffsetTop(derived_doc);

        if (!source_iframe_container_top || !derived_iframe_container_top) return;

        var svg_container_top = $('#fb-td-mid-column').offset().top;
        svg_container_top += parseInt($('#fb-svg-mid-column').css('top'), 10);

        var x_left = 0;
        var x_right = $('#' + svg_column_id).width();
        var left_polygon_width = 12;

        var previous_y_bottom_left = null;
        var previous_y_top_left = null;
        var previous_y_bottom_right = null;

        var left_scrollTop = source_doc.body.scrollTop;
        var right_scrollTop = derived_doc.body.scrollTop;

        if (caller_function == 'fb_on_mouse_up') {
            if (fb_performance_previous_source_scroll_top !== null &&
                fb_performance_previous_derive_scroll_top !== null) {
                console.log('   fb_performance_previous_source_scroll_top: ' + fb_performance_previous_source_scroll_top);
                console.log('   left_scrollTop: ' + left_scrollTop);
                console.log('   fb_performance_previous_derive_scroll_top: ' + fb_performance_previous_derive_scroll_top);
                console.log('   right_scrollTop: ' + right_scrollTop);
                if ((fb_performance_previous_source_scroll_top === left_scrollTop) &&
                    (fb_performance_previous_derive_scroll_top === right_scrollTop)) {
                    return;
                }
            }
        }
        fb_performance_previous_source_scroll_top = left_scrollTop;
        fb_performance_previous_derive_scroll_top = right_scrollTop;

        var total_visible_svg = 0;
        // remove all polygons
        $('#' + svg_column_id).find('.fb-svg-polygons').remove();

        var t0 = performance.now();
        var total_time_create_svg = 0;
        var total_time_check_admin_element = 0;
        var total_children_count = 0;

        var children = derived_doc.body.children;
        for (var i = 0; i < children.length; i++) {
            var right = $(children[i]);
            var rightNative = children[i];
            //$(derived_doc.body).children().each(function (index) {
            //var right = $(this);
            total_children_count++;

            //var timer_isTinymceAdminElement = performance.now();
            
            if (isTinymceAdminElement(right)) continue; // performance: take 2.5 milliseconds to check 200-300 elements
            //timer_isTinymceAdminElement = performance.now() - timer_isTinymceAdminElement;
            //total_time_check_admin_element += timer_isTinymceAdminElement;

            var source_id = null;
            source_id = right.attr(fb_data_element_id);

            if (source_id && source_id != 'none') {
                var left = source_doc.getElementById(source_id);
                if (left) {
                    if (isElementScrolledIntoViewNative(rightNative, derived_doc, derived_editor_height) === false &&
                        isElementScrolledIntoViewNative(left, source_doc, source_editor_height) === false) {
                        continue; // continue; only update elements that are visible
                    }
                }
                else {
                    if (isElementScrolledIntoViewNative(rightNative, derived_doc, derived_editor_height) === false) continue; // continue; only update elements that are visible                   
                }
            }

            if (source_id && source_id != 'none') {
                var t00 = performance.now();
                // calculate y_bottom_right and y_top_right
                var y_bottom_right = null;
                var y_top_right = null;
                total_visible_svg++;
                if (right.attr('class') && right.attr('class').indexOf("fb-display-none") >= 0) {
                    var derived_bottom = getParentOffsetBottom(right.attr("id"), derived_doc.body);
                    if (derived_bottom >= 0) {
                        derived_bottom += (derived_iframe_container_top - svg_container_top);
                        y_bottom_right = derived_bottom;
                        y_top_right = derived_bottom;
                    }
                }
                else {
                    //var derived_height = right.height();
                    var derived_outer_height = right.outerHeight(true);
                    var derived_top = right.position().top;
                    var derived_padding_top = parseInt(right.css('padding-top'), 10);
                    var derived_margin_top = parseInt(right.css('margin-top'), 10);
                    derived_top += (derived_iframe_container_top - svg_container_top);
                    //derived_top -= (derived_padding_top + derived_margin_top);

                    y_bottom_right = derived_top + derived_outer_height;
                    y_top_right = derived_top;
                }

                // check if left element is visible
                var left = source_doc.getElementById(source_id);
                if (!left) {
                    var right_clone = right.clone();
                    var right_html = unwrapDeleteInsertTagjQuery(right_clone);
                    right_html = right_html.replace(/&nbsp;/ig, ' ').replace(/<br>/g, '');
                    if (right_html.trim() !== '') {
                        // update SVG 
                        if (y_bottom_right !== null && y_top_right !== null) {
                            if (previous_y_bottom_right !== null) {
                                if (previous_y_bottom_right > y_top_right) {
                                    y_top_right = previous_y_bottom_right;
                                }
                            }
                            previous_y_bottom_right = y_bottom_right;

                            var source_post_id = right.attr(fb_data_post_id);
                            var derive_element_id = right.attr('id');
                            var classes = right.attr('id');

                            y_top_right -= right_scrollTop;
                            y_bottom_right -= right_scrollTop;

                            //-----------------------------
                            // right polygon 
                            var pts = [];
                            pts[0] = x_right - left_polygon_width;
                            pts[1] = y_top_right;
                            pts[2] = x_right - left_polygon_width;
                            pts[3] = y_bottom_right;
                            pts[4] = x_right;
                            pts[5] = y_bottom_right;
                            pts[6] = x_right;
                            pts[7] = y_top_right;
                            var id = right.attr('id');
                            var polygon = createSVGPolygon(pts, id, classes, 'grey', svg_column_id, 0.24);
                            if (polygon !== null) {
                                $(polygon).click(function () {
                                    var tab_index = -1;
                                    $('#fb-tabs-sources .ui-tabs-nav a').each(function (index) {
                                        var a = $(this);
                                        if (a.attr('data-post-id') == source_post_id) {
                                            tab_index = index;
                                            return false;
                                        }
                                    });

                                    if (tab_index >= 0) {
                                        $('#fb-tabs-sources').tabs("option", "active", tab_index);
                                    }

                                    if (fb_floating_sources) {
                                        updateSourcePosition(derive_element_id);
                                    }
                                });
                                document.getElementById(svg_column_id).appendChild(polygon);
                            }
                        }
                    }
                }
                if (left) {
                    var y_top_left = null;
                    var y_bottom_left = null;

                    // calcuate y_top_left and y_bottom_left
                    if ($(left).attr('class') && $(left).attr('class').indexOf("fb-display-none") >= 0) {
                        var source_bottom = getParentOffsetBottom($(left).attr("id"), source_doc.body);
                        if (source_bottom >= 0) {
                            source_bottom += (source_iframe_container_top - svg_container_top);
                            y_top_left = source_bottom;
                            y_bottom_left = source_bottom;
                        }
                    }
                    else {
                        //var source_height = $(left).height();
                        var source_outer_height = $(left).outerHeight(true);
                        var source_top = $(left).position().top;
                        var source_padding_top = parseInt($(left).css('padding-top'), 10);
                        var source_margin_top = parseInt($(left).css('margin-top'), 10);
                        source_top += (source_iframe_container_top - svg_container_top);
                        //source_top -= (source_padding_top + source_margin_top);
                        //console.log($(source_element).attr('id') + ": " + source_outer_height);

                        y_top_left = source_top;
                        y_bottom_left = source_top + source_outer_height;
                    }

                    // update SVG 
                    if (y_bottom_right !== null && y_top_right !== null && y_top_left !== null && y_bottom_left !== null) {
                        y_top_right -= right_scrollTop;
                        y_bottom_right -= right_scrollTop;
                        y_top_left -= left_scrollTop;
                        y_bottom_left -= left_scrollTop;

                        // paragraphs in source may change order in derive
                        if (previous_y_bottom_left !== null && previous_y_top_left !== null) {
                            /*
                            if (previous_y_bottom_left > y_top_left) {
                                //console.log('previous_y_bottom_left: ' + previous_y_bottom_left + '; y_top_left: ' + y_top_left);
                                y_top_left = previous_y_bottom_left;
                            }
                            */
                            if ((y_top_left < previous_y_bottom_left) && (y_top_left > previous_y_top_left)) {
                                y_top_left = previous_y_bottom_left;
                            }
                            else if ((y_bottom_left < previous_y_bottom_left) && (y_bottom_left > previous_y_top_left)) {
                                y_bottom_left = previous_y_top_left;
                            }
                        }
                        previous_y_top_left = y_top_left;
                        previous_y_bottom_left = y_bottom_left;

                        if (previous_y_bottom_right !== null) {
                            if (previous_y_bottom_right > y_top_right) {
                                y_top_right = previous_y_bottom_right;
                            }
                        }
                        previous_y_bottom_right = y_bottom_right;

                        //-----------------------------
                        var s_clone = $(left).clone();
                        var d_clone = right.clone();

                        $(s_clone).find("br").remove();
                        $(d_clone).find("br").remove();

                        var source_clean = unwrapDeleteInsertTag(s_clone);
                        var comp_clean = unwrapDeleteInsertTag(d_clone);
                        var fill = 'green';
                        if (source_clean !== comp_clean) {
                            fill = 'red';
                        }

                        var source_post_id = right.attr(fb_data_post_id);
                        var derive_element_id = right.attr('id');
                        var classes = right.attr('id') + ' ' + $(left).attr('id');

                        //-----------------------------
                        // left polygon 
                        var pts = [];
                        pts[0] = 0;
                        pts[1] = y_top_left;
                        pts[2] = 0;
                        pts[3] = y_bottom_left;
                        pts[4] = left_polygon_width;
                        pts[5] = y_bottom_left;
                        pts[6] = left_polygon_width;
                        pts[7] = y_top_left;
                        var id = $(left).attr('id');
                        var polygon = createSVGPolygon(pts, id, classes, fill, svg_column_id, 0.24);
                        if (polygon !== null) {
                            $(polygon).click(function () {
                                updateDerivePosition(derive_element_id);
                            });
                            document.getElementById(svg_column_id).appendChild(polygon);
                        }

                        //-----------------------------
                        // right polygon 
                        var pts = [];
                        pts[0] = x_right - left_polygon_width;
                        pts[1] = y_top_right;
                        pts[2] = x_right - left_polygon_width;
                        pts[3] = y_bottom_right;
                        pts[4] = x_right;
                        pts[5] = y_bottom_right;
                        pts[6] = x_right;
                        pts[7] = y_top_right;
                        var id = right.attr('id');
                        var polygon = createSVGPolygon(pts, id, classes, fill, svg_column_id, 0.24);
                        if (polygon !== null) {
                            $(polygon).click(function () {
                                var tab_index = -1;
                                $('#fb-tabs-sources .ui-tabs-nav a').each(function (index) {
                                    var a = $(this);
                                    if (a.attr('data-post-id') == source_post_id) {
                                        tab_index = index;
                                        return false;
                                    }
                                });

                                if (tab_index >= 0) {
                                    $('#fb-tabs-sources').tabs("option", "active", tab_index);
                                }

                                if (fb_floating_sources) {
                                    updateSourcePosition(derive_element_id);
                                }
                            });
                            document.getElementById(svg_column_id).appendChild(polygon);
                        }

                        //-----------------------------
                        // mid polygon 
                        var pts = [];
                        pts[0] = left_polygon_width;
                        pts[1] = y_top_left;
                        pts[2] = left_polygon_width;
                        pts[3] = y_bottom_left;
                        pts[4] = x_right - left_polygon_width;
                        pts[5] = y_bottom_right;
                        pts[6] = x_right - left_polygon_width;
                        pts[7] = y_top_right;
                        //var id = right.attr('id');
                        var polygon = createSVGPolygon(pts, id, classes, fill, svg_column_id, 0.2);
                        if (polygon !== null) {
                            document.getElementById(svg_column_id).appendChild(polygon);
                        }
                    }
                }

                var t01 = performance.now();
                var p01 = t01 - t00;
                total_time_create_svg += p01;
            }

        //});
        }
        var t1 = performance.now();
        var p1 = t1 - t0;

        console.log('   total_children_count: ' + total_children_count);
        console.log('   total_visible_svg: ' + total_visible_svg);
        console.log('   total_time_create_svg: ' + total_time_create_svg);
        //console.log('   total_time_check_admin_element: ' + total_time_check_admin_element);
        console.log("   performance (derived_doc.body loop): " + p1);
    }

    function isTinymceAdminElement(element) {
        if (element.prop("tagName").toLowerCase() == 'svg') return true;
        if (element.hasClass("fb_tinymce_left_column") == true ||
            element.hasClass("fb_tinymce_left_column_icon") == true ||
            element.hasClass("fb_tinymce_left_column_svg") == true ||
            element.hasClass("fb_tinymce_left_column_page") == true ||
            element.hasClass("fb-comment") == true ||
            element.hasClass("toc-page") == true ||
            element.hasClass("mce-resizehandle") == true ||
            element['data-mce-bogus']) return true;
        //if (element.attr('class').indexOf("fb_tinymce_left_column") >= 0) return true;
        return false;
    }

    function createSVGPolygon(pts, id, classes, fill, svg_column_id, opacity) {
        if (!pts || pts.length != 8) return null;

        var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        var points = pts[0] + "," + pts[1] + " ";
        points += pts[2] + "," + pts[3] + " ";
        points += pts[4] + "," + pts[5] + " ";
        points += pts[6] + "," + pts[7] + " ";

        polygon.setAttribute("points", points);
        polygon.setAttribute("id", id);
        polygon.setAttribute("fill", fill);
        classes = classes.replace(/[-.]/g, "");
        polygon.setAttribute("class", "fb-svg-polygons " + classes);
        polygon.setAttribute("opacity", opacity);
        /*
        $(polygon).hover(function () {
            $(polygon).css("cursor", "pointer");
            $(polygon).css("opacity", 1);
        }, function () {
            $(polygon).css("opacity", opacity);
        });
        */
        $(polygon).hover(function () {
            $(polygon).css("cursor", "pointer");
            var c = id.replace(/[-.]/g, "");
            $('.' + c).each(function () {
                var opacity = $(this).css("opacity");
                $(this).css("opacity", opacity * 2);
            });
        }, function () {
            var c = id.replace(/[-.]/g, "");
            $('.' + c).each(function () {
                var opacity = $(this).css("opacity");
                $(this).css("opacity", opacity / 2);
            });
        });
        return polygon;
    }

    function cleanWhitespace(element) {
        clone = $(element).clone();
        $(clone).contents().filter(function () {
            return (this.nodeType == 3 && !/\S/.test(this.nodeValue)); // \s matches whitespace (spaces, tabs and new lines). \S is negated \s
        }).remove();
        return $(clone).html();
    }

    function updateSourcePosition(d_id) {
        if (!flexibook.active_derive_mce) return;
        var derived_doc = flexibook.active_derive_mce.getDoc();

        // get active tab id
        var source_mce = getVisibleSourceMce();
        if (!source_mce) return;
        var source_doc = source_mce.getDoc();

        source_mce.current_margin_top = parseInt($(source_mce.getBody()).css('margin-top'), 10);
        $(source_mce.getBody()).css('margin-top', source_mce.original_margin_top); // reset to its original position for calculation

        updateScroll(source_doc, derived_doc, d_id, source_mce);
    }

    function updateDerivePosition(d_id) {
        if (!flexibook.active_derive_mce) return;
        var derived_doc = flexibook.active_derive_mce.getDoc();

        // get active tab id
        var source_mce = getVisibleSourceMce();
        if (!source_mce) return;
        var source_doc = source_mce.getDoc();

        updateScroll(source_doc, derived_doc, d_id, flexibook.active_derive_mce);
    }

    function updateScroll(source_doc, derive_doc, d_id, target_mce) {
        var source_iframe_container_top = getiFrameOffsetTop(source_doc);
        var derived_iframe_container_top = getiFrameOffsetTop(derive_doc);

        if (!source_iframe_container_top || !derived_iframe_container_top) return;

        var svg_container_top = $('#fb-td-mid-column').offset().top;
        svg_container_top += parseInt($('#fb-svg-mid-column').css('top'), 10);

        var left_scrollTop = source_doc.body.scrollTop;
        var right_scrollTop = derive_doc.body.scrollTop;

        $(derive_doc.body).children().each(function (index) {
            var derive = $(this);
            if (derive.attr('id') == d_id) {
                //if (derive.hasClass("fb_tinymce_left_column") == false && derive.hasClass("fb_tinymce_left_column_icon") == false) {
                if (isTinymceAdminElement(derive)) return true; // continue
                var source_id = derive.attr(fb_data_element_id);

                if (source_id && source_id != 'none') {
                    var source = source_doc.getElementById(source_id);
                    if (source) {
                        var y_bottom_right = null;
                        var y_top_right = null;
                        var y_top_left = null;
                        var y_bottom_left = null;

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
                            //var derived_height = derive.height();
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
                            //var source_height = $(source).height();
                            var source_outer_height = $(source).outerHeight(true);
                            var source_top = $(source).position().top;
                            var source_padding_top = parseInt($(source).css('padding-top'), 10);
                            var source_margin_top = parseInt($(source).css('margin-top'), 10);
                            source_top += (source_iframe_container_top - svg_container_top);
                            source_top -= (source_padding_top + source_margin_top);

                            y_top_left = source_top;
                            y_bottom_left = source_top + source_outer_height;
                        }

                        if (y_bottom_right !== null && y_top_right !== null && y_top_left !== null && y_bottom_left !== null) {
                            y_top_right -= right_scrollTop;
                            y_top_left -= left_scrollTop;

                            if (target_mce.id.indexOf("fb-source-mce") >= 0) {
                                var t = left_scrollTop - (y_top_right - y_top_left);
                                if (t < 0) t = 0;

                                $(target_mce.getBody()).animate({ 'scrollTop': t }, { duration: 'medium', easing: 'swing', complete: function () { updateVisibleMces(true, false); update('fb_update_scroll'); } });
                            }
                            else if (target_mce.id.indexOf("fb-derived-mce") >= 0) {
                                var t = right_scrollTop - (y_top_left - y_top_right);
                                if (t < 0) t = 0;

                                $(target_mce.getBody()).animate({ 'scrollTop': t }, { duration: 'medium', easing: 'swing', complete: function () { updateVisibleMces(true, false); update('fb_update_scroll'); } });
                            }
                            // use margin top
                            //var height_diff = t - source_mce.current_margin_top;
                            //source_mce.theme.resizeBy(0, height_diff); // ms - when using this method, tinymce cannot autoresize when window is resized for example.
                            //$(source_mce.getBody()).css('margin-top', source_mce.current_margin_top);
                            //$(source_mce.getBody()).animate({ 'margin-top': t }, { duration: 'medium', easing: 'swing', complete: function () { updateVisibleMces(true, false); update(); } });
                        }
                    }
                }
                return false; // break
            }
        });
    }

    //------------------------------------------------------------------------------------------------------

    function unwrapDeleteInsertTag(element) {
        return unwrapDeleteInsertTagjQuery($(element));
    }

    function unwrapDeleteInsertTagjQuery(element) {
        // does not consider nested delete/insert span tags
        /*
        var clean = element.find('span.delete').contents().unwrap().end().end(); // remove all delete tags
        clean = clean.find('span.insert').contents().unwrap().end().end(); // remove all insert tags
        var html = clean.html();
        */

        var count = 0;
        var clean = element;
        while (clean.find('span.delete').length > 0 && count < 10) {
            var children = clean.find('span.delete').contents();
            if (children.length <= 0) {
                return '';
            }
            clean = clean.find('span.delete').contents().unwrap().end().end(); // remove all delete tags
            count++;
        }
        count = 0;
        while (clean.find('span.insert').length > 0 && count < 10) {
            var children = clean.find('span.insert').contents();
            if (children.length <= 0) {
                return '';
            }
            clean = clean.find('span.insert').contents().unwrap().end().end(); // remove all insert tags
            count++;
        }
        var html = clean.html();
        return html;
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
                        //var height = $(this).height();
                        var outer_height = $(this).outerHeight(true);
                        var top = $(this).position().top;
                        var padding_bottom = parseInt($(this).css('padding-bottom'), 10);
                        var margin_bottom = parseInt($(this).css('margin-bottom'), 10);

                        //bottom = top + height + padding_bottom + margin_bottom;
                        bottom = top + outer_height;
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
            // only check the flexibook iframes
            if ($(iframes[i]).attr('id').indexOf('fb-') >= 0) {
                var iframe_doc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                if (iframe_doc == doc) {
                    //var containerDiv = iframes[i].parentNode;
                    //return $(containerDiv).offset().top;
                    return $(iframes[i]).offset().top;
                }
            }
        }

        return null;
    }

    function getiFrameHeight(doc) {
        var iframes = document.getElementsByTagName("iframe");
        for (var i = 0; i < iframes.length; i++) {
            // only check the flexibook iframes
            if ($(iframes[i]).attr('id').indexOf('fb-') >= 0) {
                var iframe_doc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                if (iframe_doc == doc) {
                    return $(iframes[i]).height();
                }
            }
        }

        return null;
    }

    function removeAllEditor() {
        var length = tinymce.editors.length;
        for (var i = length; i > 0; i--) {
            tinymce.execCommand('mceRemoveEditor', false, tinymce.editors[i - 1].id);
        };
    }
});

