window.App = {
  models: {},
  collections: {},
  objects: {},
  views: {},
};

App.models.Track = Backbone.Model.extend({
  defaults: {
    title: '-',
    album: '-',
    year: 0,
    duration: 0,
  },
});

App.models.Status = Backbone.Model.extend({
  url: '/status',
  defaults: {
    owner: false,
    volume: 0.5,
    paused: false,
    isPlaying: false,
    trackId: -1,
    time: 0,
  },
});

App.collections.Tracks = Backbone.Collection.extend({
  model: App.models.Track,
  url: '/list',
});

App.objects.tracks = new App.collections.Tracks();
App.objects.status = new App.models.Status();

App.views.TrackItem = Backbone.View.extend({
  tagName: 'div',
  className: 'track',
  template: $('#track-item').html(),

  events: {
    'click .fa-play': 'playTrack'
  },

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  playTrack: function() {
    App.objects.player.startPlayNew('/musics/' + this.model.get('file'), this.model.collection.indexOf(this.model));
    //$.get('/play/' + this.model.collection.indexOf(this.model));
  },

  render: function() {
    this.$el.html(_.template(this.template, this.model.toJSON()));
    return this;
  },
});

App.views.TrackList = Backbone.View.extend({
  el: $('.playlist'),
  initialize: function(options) {
    this.collection = options.collection;
    this.listenTo(this.collection, 'change add reset remove', this.render);
  },

  render: function() {
    this.$el.html(' ');
    this.collection.each(function(model) {
      var view = new App.views.TrackItem({
        model: model
      });
      this.$el.append(view.render().el);
    }, this);
    return this;
  }
});

App.views.CurrentTrackInfo = Backbone.View.extend({
  el: $('.current-track-info'),
  template: $('#current-track-info').html(),

  initialize: function(options) {
    this.model = options.model;
    this.playlist = options.playlist;
    this.listenTo(this.model, 'change:trackId', this.render);
    this.listenTo(this.playlist, 'change add reset remove', this.render);
  },

  render: function() {
    this.$el.html(' ');
    var info = {
      album: '-',
      title: '-',
      year: '-',
      duration: 0,
      picture: [],
      trackId: -1,
    };
    var extend = (this.playlist.models && this.model.get('trackId') >= 0 && this.playlist.models[this.model.get('trackId')]) ? this.playlist.models[this.model.get('trackId')].toJSON() : {};
    this.$el.html(_.template(this.template, _.extend(info, _.extend(this.model.toJSON(), extend))));
    return this;
  },
});

new App.views.TrackList({
  collection: App.objects.tracks,
});

new App.views.CurrentTrackInfo({
  model: App.objects.status,
  playlist: App.objects.tracks,
});


App.objects.player = {};
App.objects.player.pl = $("#player");
App.objects.player.sp = App.objects.player.pl.get(0);
App.objects.player.sp.volume = 0.5;

App.objects.player.startButton = $(".start-button");
App.objects.player.progressBarWrapper = $('.progressbar-wrapper');
App.objects.player.progressBar = $(".progressbar").css('width', '0%');

App.objects.player.updateIndexFunction = function(index) {
  if (index >= -1) {

  } else {
    index = -1;
  }
  $.get('/updateIndex/' + index);
};

App.objects.player.updateStatusFunction = function(status) {
  status = status || false;
  $.get('/updateStatus/' + status);
};

App.objects.player.updateTimeFunction = function(time, duration) {
  try {
    time = time || App.objects.player.sp.currentTime || 0;
    duration = duration || App.objects.player.sp.duration || 0;
    $.get('/updateTime/' + time + '/' + duration);
  } catch(e){}
};

App.objects.player.updateAll = function(status, index, time, duration) {
  if (status) {
    App.objects.player.updateStatus(status);
  }
  if (index || parseInt(index) >= -1) {
    App.objects.player.updateIndex(index);
  }
  if (time) {
    App.objects.player.updateTime(time, duration);
  }
};

App.objects.player.updateStatus = _.throttle(App.objects.player.updateStatusFunction, 1000);
App.objects.player.updateIndex = _.throttle(App.objects.player.updateIndexFunction, 1000);
App.objects.player.updateTime = _.throttle(App.objects.player.updateTimeFunction, 250);

App.objects.player.startPlayNew = function(url, index) {
  App.objects.player.updateAll(true, index, 0);
};

App.objects.player.startPlay = function() {
  if (App.objects.player.sp.duration != 0) {
    App.objects.player.sp.play();
  }
};

App.objects.player.stopPlay = function() {
  App.objects.player.sp.pause();
};

App.objects.player.pl.bind('timeupdate', function(e) {
  App.objects.player.updateTime();
});

App.objects.player.startButton.click(function(e) {
  if (App.objects.status.get('trackId') >= 0) {
    if (App.objects.status.get('isPlaying')) {
      App.objects.player.updateStatus(false);
    } else {
      App.objects.player.updateStatus(true);
    }
  }
});

/*
App.objects.player.progressBarWrapper.click(function(e) {
  if (App.objects.status.get('duration') != 0) {
    var left = $(this).offset().left;
    var offset = e.pageX - left;
    var percent = offset / App.objects.player.progressBarWrapper.width();
    var duration_seek = percent * App.objects.status.get('duration');
    App.objects.player.updateTime(duration_seek);
  }
});
*/

App.objects.status.listenTo(App.objects.status, 'change:trackId', function() {
  if (App.objects.tracks.models.length > 0) {
    if (App.objects.status.get('trackId') >= 0 && App.objects.status.get('owner')) {
      if (App.objects.tracks.models[App.objects.status.get('trackId')] && App.objects.tracks.models[App.objects.status.get('trackId')].get('file') && App.objects.tracks.models[App.objects.status.get('trackId')].get('file').indexOf('.mp3') != -1) {
        App.objects.player.sp.src = '/musics/' + App.objects.tracks.models[App.objects.status.get('trackId')].get('file');
        if (App.objects.status.get('isPlaying')) {
          App.objects.player.startPlay();
        }
      }
    }
  }
});

App.objects.status.listenTo(App.objects.status, 'change:time change:duration', function() {
  if (App.objects.tracks.models.length > 0) {
    var fraction = App.objects.status.get('time') / App.objects.status.get('duration');
    var percent = fraction * 100;
    if (percent) {
      App.objects.player.progressBar.css('width', percent + '%');
    } else {
      App.objects.player.progressBar.css('width', '0%');
    }
  }
});

App.objects.status.listenTo(App.objects.status, 'change:isPlaying', function() {
  if (App.objects.tracks.models.length > 0) {
    if (App.objects.status.get('isPlaying')) {
      App.objects.player.startButton.find('.simpleplayer-play-stop-button').addClass('simpleplayer-stop-control').removeClass('simpleplayer-play-control');
      try {
        /*
        var srcPlayer = App.objects.player.sp.src.replace(/%20/gi, ' ');
        var srcServer = '/musics/' + App.objects.tracks.models[App.objects.status.get('trackId')].get('file');
        if (App.objects.status.get('owner') && srcPlayer != srcServer) {
          App.objects.player.sp.src = '/musics/' + App.objects.tracks.models[App.objects.status.get('trackId')].get('file');
        }
        */
        if (App.objects.status.get('owner') && App.objects.player.sp.paused) {
          App.objects.player.startPlay();
        }
      } catch (e) {}
    } else {
      App.objects.player.startButton.find('.simpleplayer-play-stop-button').removeClass('simpleplayer-stop-control').addClass('simpleplayer-play-control');
      if (App.objects.status.get('owner') && !App.objects.player.sp.paused) {
        App.objects.player.stopPlay();
      }
    }
  }
});

App.objects.status.listenTo(App.objects.tracks, 'add reset remove', function(){
  if (App.objects.statusInterval) {
    clearInterval(App.objects.statusInterval);
  }
  App.objects.status.fetch();
  App.objects.statusInterval = setInterval(function(){
    App.objects.status.fetch();
  }, 1000);
});