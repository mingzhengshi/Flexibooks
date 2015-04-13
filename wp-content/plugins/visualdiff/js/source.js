jQuery(document).ready(function ($) {
    console.log("source.js loaded.");

    flexibook.regSourceTableOfContentCallback(function (editor_id) {
        var editor = tinymce.activeEditor;
        if (!editor) return;
        $(editor.getBody()).find('.toc').eq(0).prepend('<div class="toc-title">Title</div>');

        var height = $(editor.getBody()).find('.toc').eq(0).height();
        height = (1015 - height) / 2;
        $(editor.getBody()).find('.toc').eq(0).prepend('<div style="height:' + height + 'px"></div>'); // prepend a dummy div
    });
















































});