var Flexibook = (function () {
    function Flexibook() {
        this.name = "fb";
        this.columns_of_editors = 2;
        this.dragged_item_id = -1;
        this.postpone_update = false;
        this.active_derive_mce = null;

        // derived callbacks
        this.deriveMceInitCallback = {};
        this.mergeIconClickCallback = {};
        this.deriveUpdateCallback = {};
        this.derivedElementMouseUpCallback = {};
        this.onDragEndCallback = {};
        this.tableOfContentCallback = {};
    }

    // derived callbacks
    Flexibook.prototype.regDeriveMceInitCallback = function (callback) {
        this.deriveMceInitCallback = callback;
    };

    Flexibook.prototype.regMergeIconClickCallback = function (callback) {
        this.mergeIconClickCallback = callback;
    };

    Flexibook.prototype.regDeriveUpdateCallback = function (callback) {
        this.deriveUpdateCallback = callback;
    };

    Flexibook.prototype.regDerivedElementMouseUpCallback = function (callback) {
        this.derivedElementMouseUpCallback = callback;
    };

    Flexibook.prototype.regOnDragEndCallback = function (callback) {
        this.onDragEndCallback = callback;
    };

    Flexibook.prototype.regTableOfContentCallback = function (callback) {
        this.tableOfContentCallback = callback;
    };

    // others
    Flexibook.prototype.print = function () {
        console.log("flexibook name:" + this.name);
    }

    return Flexibook;
})();

var flexibook = new Flexibook();

