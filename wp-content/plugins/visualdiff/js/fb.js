var Flexibook = (function () {
    function Flexibook() {
        this.name = "fb";
        this.columns_of_editors = 2;
        this.deriveMceInitCallback = {};
        this.showPreviousSourceIconClickCallback = {};
        this.mergeIconClickCallback = {};
        this.mceSetContentCallback = {};
    }

    Flexibook.prototype.regDeriveMceInitCallback = function (callback) {
        this.deriveMceInitCallback = callback;
    };

    Flexibook.prototype.regShowPreviousSourceIconClickCallback = function (callback) {
        this.showPreviousSourceIconClickCallback = callback;
    };

    Flexibook.prototype.regMergeIconClickCallback = function (callback) {
        this.mergeIconClickCallback = callback;
    };

    Flexibook.prototype.regMceSetContentCallback = function (callback) {
        this.mceSetContentCallback = callback;
    };

    Flexibook.prototype.print = function () {
        console.log("flexibook name:" + this.name);
    }

    return Flexibook;
})();

var flexibook = new Flexibook();

