var Flexibook = (function () {
    function Flexibook() {
        this.name = "fb";
        this.deriveMceInitCallback = {};
    }

    Flexibook.prototype.regDeriveMceInitCallback = function (callback) {
        this.deriveMceInitCallback = callback;
    };

    Flexibook.prototype.print = function () {
        console.log("flexibook name:" + this.name);
    }

    return Flexibook;
})();

var flexibook = new Flexibook();

