(function ($) {
    console.log("visualdiff.js...");

    $(document).ready(function () {
        var revisions = window.wp.revisions,
        SELF = this;

        if (typeof revisions !== 'undefined') {
            console.log(revisions);

        }

        //-----------------------------------------------------------------------------------------------------------
        // events
        //-----------------------------------------------------------------------------------------------------------

        $('#button-compare-revisions').click(function () {
            console.log("button-compare-revisions click event...");

            return false;
        });



    });
}(jQuery));
