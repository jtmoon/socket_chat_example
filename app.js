/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , hbs = require('hbs')
  , io = require('socket.io')
  , path = require('path');

var app = express()
  , server = http.createServer(app)
  , io = io.listen(server);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.engine('hbs', hbs.__express);
  app.set('view engine', 'hbs');
  app.set('views', __dirname + '/views');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

io.sockets.on('connection', function(socket) {
  socket.on('joinUser', function(user) {
    socket.join(socket.id);
    user.id = socket.id;
    socket.user = user;
    socket.emit('userJoined', user);
  });

  socket.on('newMessage', function(message) {
    socket.broadcast.to(socket.room_id).emit('receivedMessage', message);
  });

  socket.on('joinRoom', function(room, users) {
    var newUserMsg = {}
      , leftMsg = {};
    if(socket.room_id) {
      leftMsg.text = socket.user.user_name + ' has left the room.';
      leftMsg.room_id = socket.room_id;
      socket.broadcast.to(socket.room_id).emit('leftRoom', socket.user, leftMsg);
      socket.leave(socket.room_id);
    }
    socket.room_id = room.room_id;
    socket.join(socket.room_id);
    newUserMsg.text = socket.user.user_name + ' has joined the room.';
    newUserMsg.room_id = socket.room_id;
    socket.broadcast.to(socket.room_id).emit('newUser', socket.user, newUserMsg);
  });

  socket.on('sendUsersList', function(user, users) {
    socket.broadcast.to(user.id).emit('receivedUsersList', users);
  });
});

app.get('/', routes.index);
app.get('/users', user.list);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});