var Flexibook = (function () {
    function Flexibook() {
        this.name = "fb";
        this.columns_of_editors = 2;
        this.dragged_item_id = -1;
        this.postpone_update = false;

        // callbacks
        this.deriveMceInitCallback = {};
        this.showPreviousSourceIconClickCallback = {};
        this.mergeIconClickCallback = {};
        this.deriveUpdateCallback = {};
        this.derivedElementMouseUpCallback = {};
        this.onDragEndCallback = {};
    }

    // mce editor callbacks
    Flexibook.prototype.regDeriveMceInitCallback = function (callback) {
        this.deriveMceInitCallback = callback;
    };

    Flexibook.prototype.regShowPreviousSourceIconClickCallback = function (callback) {
        this.showPreviousSourceIconClickCallback = callback;
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

    // others
    Flexibook.prototype.print = function () {
        console.log("flexibook name:" + this.name);
    }

    return Flexibook;
})();

var flexibook = new Flexibook();

