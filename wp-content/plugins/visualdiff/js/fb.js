var Flexibook = (function () {
    function Flexibook() {
        this.name = "fb";
        this.columns_of_editors = 2;
        this.deriveMceInitCallback = {};
        this.mergeIconClickCallback = {};
    }

    Flexibook.prototype.regDeriveMceInitCallback = function (callback) {
        this.deriveMceInitCallback = callback;
    };

    Flexibook.prototype.regMergeIconClickCallback = function (callback) {
        this.mergeIconClickCallback = callback;
    };

    Flexibook.prototype.print = function () {
        console.log("flexibook name:" + this.name);
    }

    return Flexibook;
})();

var flexibook = new Flexibook();

