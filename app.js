var mm = require('musicmetadata');
//var ID3 = require('id3');
var fs = require('fs');
var async = require('async');
var express = require('express');
var _ = require('underscore');

var app = express();

var statusModel = {
	owner: false,
	volume: 0.5,
	//paused: false,
	trackId: -1,
	isPlaying: false,
	time: 0,
	duration: 0,
};

var result = []; //metadata array

var interator = function(file, callback) {

	var stream = fs.createReadStream(__dirname + '/public/musics/' + file);
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

fs.readdir(__dirname + '/public/musics', function(err, files) {
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

app.get('/list', function(req, res) {
	res.json(result);
});

app.get('/status', function(req, res) {
	var clone = _.clone(statusModel);
	if (req.connection.remoteAddress == "127.0.0.1" || req.connection.remoteAddress == "localhost") {
		clone.owner = true;
	}
	res.json(clone)
});

/*
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
 */

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

app.get('/updateIndex/:index', function(req, res) {
	var index = parseInt(req.params.index);
	if (index >= 0 && index < result.length && result[index].file) {
		statusModel.trackId = index;
		res.end();
	} else {
		res.end();
	}
});

app.get('/updateVolume/:volume', function(req, res) {
	var volume = parseFloat(req.params.volume);
	if (volume >= 0 && volume <= 1) {
		statusModel.volume = volume;
		res.end();
	} else {
		res.end();
	}
});

app.get('/updateStatus/:status', function(req, res) {
	var status = req.params.status == "true";
	statusModel.isPlaying = status;
	res.end();
});

app.get('/updateTime/:time/:duration', function(req, res) {
	var time = parseFloat(req.params.time);
	var duration = parseFloat(req.params.duration);
	if (time >= 0 && duration >= 0) {
		statusModel.time = time;
		statusModel.duration = duration;
		res.end();
	} else {
		res.end();
	}
});

app.listen(3000, function() {
	console.log('Started WEB interface on port 3000');
});