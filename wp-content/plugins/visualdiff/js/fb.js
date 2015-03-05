﻿var Flexibook = (function () {
    function Flexibook() {
        this.name = "fb";
        this.columns_of_editors = 2;

        // callbacks
        this.deriveMceInitCallback = {};
        this.showPreviousSourceIconClickCallback = {};
        this.mergeIconClickCallback = {};
        this.deriveUpdateCallback = {};
        this.derivedElementMouseUpCallback = {};
        this.iFrameOffsetTopCallback = {};
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

    Flexibook.prototype.regDeriveUpdateCallback = function (callback) {
        this.deriveUpdateCallback = callback;
    };

    Flexibook.prototype.regDerivedElementMouseUpCallback = function (callback) {
        this.derivedElementMouseUpCallback = callback;
    };

    Flexibook.prototype.regiFrameOffsetTopCallback = function (callback) {
        this.iFrameOffsetTopCallback = callback;
    };

    Flexibook.prototype.print = function () {
        console.log("flexibook name:" + this.name);
    }

    return Flexibook;
})();

var flexibook = new Flexibook();

