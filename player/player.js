var fs = require('fs');
var lame = require('lame');
var Speaker = require('speaker');
 
var Player = function(file) {
    var stream = fs.createReadStream(file);
    stream.pause();
 
    var decoder = stream.pipe(new lame.Decoder());
    var speaker = new Speaker();
 
    decoder.pipe(speaker);
    stream.resume();
 
    this.pause = function() {
        decoder.unpipe();
        stream.unpipe();
        stream.pause();
    };
 
 
    this.resume = function() {
        decoder = new lame.Decoder();
        stream.pipe(decoder).pipe(speaker);
        stream.resume();
    };
 
    this.stop = function(){
        decoder.unpipe();
        stream.unpipe();
        decoder.removeAllListeners();
        stream.removeAllListeners();
    };
 
}; 
module.exports = Player;