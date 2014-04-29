/*
 * JavaScript ID3 Tag Reader 0.1.2
 * Copyright (c) 2008 Jacob Seidelin, cupboy@gmail.com, http://blog.nihilogic.dk/
 * MIT License [http://www.opensource.org/licenses/mit-license.php]
 * 
 * Extended by António Afonso (antonio.afonso@opera.com), Opera Software ASA
 * Modified by António Afonso <antonio.afonso gmail.com>
 */

var ID3v1 = require('./parsers/id3v1'),
    ID3v2 = require('./parsers/id3v2'),
    ID4 = require('./parsers/id4');

var readers = {
  FileAPIReader: require('./readers/filereader').FileAPIReader
};

var _files = {};
// location of the format identifier
var _formatIDRange = [0, 7];

/**
 * Finds out the tag format of this data and returns the appropriate
 * reader.
 */
var getTagReader = function (data) {
  // FIXME: improve this detection according to the spec
  if (data.getStringAt(4, 7) === "ftypM4A") {
    return ID4;
  }
  else {
    if (data.getStringAt(0, 3) === "ID3") {
      return ID3v2;
    }
  }

  return ID3v1;
};

var readTags = function (reader, data, url, tags) {
  var tagsFound = reader.readTagsFromData(data, tags),
      tags = _files[url] || {};

  for (var tag in tagsFound) {
    if (tagsFound.hasOwnProperty(tag)) {
      tags[tag] = tagsFound[tag];
    }
  }

  _files[url] = tags;
};

/**
 * @param {string} url The location of the sound file to read.
 * @param {function()} cb The callback function to be invoked when all tags have been read.
 * @param {{tags: Array.<string>, dataReader: function(string, function(BinaryReader))}} options The set of options that can specify the tags to be read and the dataReader to use in order to read the file located at url.
 */
exports.loadTags = function (url, cb, options) {
  var options = options || {},
      dataReader = options["dataReader"] || BufferedBinaryAjax;

  dataReader(url, function (data) {
    // preload the format identifier
    data.loadRange(_formatIDRange, function () {
      var reader = getTagReader(data);
      reader.loadData(data, function () {
        readTags(reader, data, url, options["tags"]);
        if (cb) {
          // TODO: Note the addition of argument passed to the callback.
          cb(url);
        }
      });
    });
  });
};

exports.getAllTags = function (url) {
  if (!_files[url]) {
    return null;
  }

  var tags = {};
  for (var a in _files[url]) {
    if (_files[url].hasOwnProperty(a)) {
      tags[a] = _files[url][a];
    }
  }

  return tags;
};

exports.getTag = function (url, tag) {
  if (!_files[url]) {
    return null;
  }

  return _files[url][tag];
};

exports.getReader = function (reader) {
  if (readers[reader]) {
    return readers[reader];
  }
};
