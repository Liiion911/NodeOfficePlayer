var mm = require('musicmetadata');
var ID3 = require('id3');
var player = require('./player');
var fs = require('fs');
var async = require('async');
var express = require('express');
var _ = require('underscore');

var app = express();

var music;

var result = []; //metadata array

var interator = function(file, callback) {

	var stream = fs.createReadStream(__dirname + '/musics/' + file);
	var parser = new mm(stream);

	//listen for the metadata event
	parser.on('metadata', function(meta) {
		meta.file = file;
		//console.log(meta);
		result.push(meta); // add element in array result
	});

	parser.on('done', function(err) {
		if (err) {
			throw err;
		}
		stream.destroy();
		callback();
	});

};

fs.readdir(__dirname + '/musics', function(err, files) {
	if (err) {
		throw err;
	}
	async.eachSeries(files, interator, function(err) {
		if (err) {
			throw err;
		}
	});
});

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
	res.sendfile(__dirname + '/view/index.html');
});

app.get('/play/:index', function(req, res) {
	var index = parseInt(req.params.index);
	if (index >= 0 && index < result.length) {
		if (music) {
			music.stop();
		}
		music = new player(__dirname + '/musics/' + result[req.params.index].file);
	}
	res.end();
});

app.get('/pause', function(req, res) {
	music.pause();
	res.end();
});

app.get('/resume', function(req, res) {
	music.resume();
	res.end();
});

app.get('/stop', function(req, res) {
	music.stop();
	res.end();
});

app.get('/list', function(req, res) {
	res.json(result);
});

app.get('/info/:index', function(req, res) {
	var index = parseInt(req.params.index);
	if (index >= 0 && index < result.length) {
		var file = fs.readFileSync(__dirname + '/musics/' + result[req.params.index].file);
		var id3_fileV1 = new ID3(file);
		var id3_fileV2 = new ID3(file);
		var tagsV1 = id3_fileV1.getTags();
		id3_fileV2.parse();
		var response = {};
		response.v1 = tagsV1;
		response.v2 = id3_fileV2.get('title');
		res.json(response);
	}else{
		res.end();
	}
});
 
app.get('/picture/:index', function(req, res) {
	var index = parseInt(req.params.index);
	if (index >= 0 && index < result.length && result[req.params.index].picture && result[req.params.index].picture.length > 0 && result[req.params.index].picture[0].data) {
		res.setHeader('Content-Type', 'image/jpg');
		res.write(new Buffer(result[req.params.index].picture[0].data.toString('base64'), 'base64'));
		res.end();
	} else {
		res.end();
	}
});

app.listen(3000, function() {
	console.log('Started WEB interface on port 3000');
});