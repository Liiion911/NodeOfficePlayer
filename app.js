var mm = require('musicmetadata');
var ID3 = require('id3');
var id3js = require('id3js');
var fs = require('fs');
var async = require('async');
var express = require('express');
var _ = require('underscore');

var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var SocketIOFileUploadServer = require('socketio-file-upload');

var statusModel = {
	owner: false,
	volume: 0.2,
	//paused: false,
	trackId: -1,
	isPlaying: false,
	time: 0,
	duration: 0,
	forceTime: -1.0,
};

var result = []; //metadata array

io.set('log level', 2);

function getExtension(file){
	var i = file.lastIndexOf('.');
	return (i < 0) ? '' : file.substr(i);
}

function readDirectory(itesrator, result){
	fs.readdir(__dirname + '/public/musics', function(err, files) {
		if (err) {
			console.log(err);
		}
		async.eachSeries(files, interator, function(err) {
			if (err) {
				console.log(err);
			}
		});
	});
}

var interator = function(file, callback) {
	var ext = getExtension(file);
	if(ext == '.mp3'){
		var stream = fs.createReadStream(__dirname + '/public/musics/' + file);
		var parser = new mm(stream);

		parser.on('metadata', function(meta) {
			meta.file = file;
			result.push(meta);
		});

		parser.on('done', function(err) {
			try{
				if (err) {
					console.log(err, file, ext);
				}
				stream.destroy();
				callback();
			}catch(e){
				console.log(file + '|' + ext + ' - parser error! (catch)', e);
			}
		});
	}
};

readDirectory(interator, result);

app.use(SocketIOFileUploadServer.router);
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
	res.sendfile(__dirname + '/view/index.html');
});


app.get('/info/:index', function(req, res) {
	var index = parseInt(req.params.index);
	if (index >= 0 && index < result.length) {
	
		id3js({ file: __dirname + '/public/musics/' + result[req.params.index].file, type: id3js.OPEN_LOCAL }, function(err, tags) {
			res.json(tags);
		});
		
		/*
		var file = fs.readFileSync(__dirname + '/public/musics/' + result[req.params.index].file);
		var id3_fileV1 = new ID3(file);
		var id3_fileV2 = new ID3(file);
		var tagsV1 = id3_fileV1.getTags();
		id3_fileV2.parse();
		var response = {};
		response.v1 = tagsV1;
		//response.v2 = id3_fileV2;
		console.log(id3_fileV2);
		res.json(response);
		*/
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

io.sockets.on('connection', function (socket) {
	console.log('> %s - connected (IP: %s)', socket.id.toString(), socket.handshake.address.address);
	
	socket.on('getTrackList', function (data) {
		socket.emit('track:list', result);
	});
	
	socket.on('getStatusModel', function (data) {
		clone = _.clone(statusModel);
		if (socket.handshake.address.address == "127.0.0.1" || socket.handshake.address.address == "localhost") {
			clone.owner = true;
		}
		socket.emit('status:model', clone);
	});
	
	var clone = _.clone(statusModel);
	if (socket.handshake.address.address == "127.0.0.1" || socket.handshake.address.address == "localhost") {
		clone.owner = true;
	}
	socket.emit('track:list', result);
	socket.emit('status:model', clone);
	
	socket.on('updateVolume', function (data) {
		var vol = parseFloat(data);
		if(vol >= 0 && vol <= 1){
			statusModel.volume = vol;
			console.log('Volume changed to: ' + data + ' (' + socket.handshake.address.address + ')');
			io.sockets.emit('change:volume', data);
		}
	});
	
	socket.on('updateIndex', function (data) {
		if(data >= 0){
			var index = parseInt(data);
			if (index >= 0 && index < result.length && result[index].file) {
				statusModel.trackId = index;
				console.log('Track changed to: ' + index + ' [' + result[index].file + '] (' + socket.handshake.address.address + ')');
				io.sockets.emit('change:trackId', index);
			}
		}
	});
	
	socket.on('updateStatus', function (data) {
		var status = data == "true" || !!data == true;
		statusModel.isPlaying = status;
		console.log('Playing changed to: ' + status + ' (' + socket.handshake.address.address + ')');
		io.sockets.emit('change:isPlaying', status);
	});
	
	socket.on('updateTime', function (data) {
		var time = parseFloat(data.time);
		var duration = parseFloat(data.duration);
		statusModel.time = time;
		statusModel.duration = duration;
		io.sockets.emit('change:time:duration', data);
	});
		
	socket.on('setForceTime', function (time) {
		var time = parseFloat(time);
		console.log('Time(forceTime) changed to: ' + time + ' (' + socket.handshake.address.address + ')');
		io.sockets.emit('change:forceTime', time);
	});
	
	socket.on('disconnect', function () {
		console.log('< %s - disconnected', socket.id.toString());
	});
	
	var uploader = new SocketIOFileUploadServer();
    uploader.dir = __dirname + "/public/musics";
    uploader.listen(socket);

    // Do something when a file is saved:
    uploader.on("saved", function(event){
        console.log('File uploaded (' + socket.handshake.address.address + ')');
		result = [];
		readDirectory(interator, result);
    });

    // Error handler:
    uploader.on("error", function(event){
        console.log("Error from uploader", event);
    });
});

server.listen(3000, function() {
	console.log('Started WEB interface on port 3000');
});