var socket = io.connect('http://localhost');

socket.on('connect', function() {
});

socket.on('userJoined', function(user) {
  var currentUser = Chat.currentUser.get('user');
  currentUser.set('id', user.id);
});

socket.on('receivedMessage', function(message) {
  Chat.messagesDataController.add(message);
});

socket.on('leftRoom', function(user, leftMsg) {
  Chat.messagesDataController.add(leftMsg);
  Chat.usersDataController.remove(user);
});

socket.on('newUser', function(user, newUserMsg) {
  var users = Chat.get('router').get('usersController').get('content');
  socket.emit('sendUsersList',user ,users);
  Chat.messagesDataController.add(newUserMsg);
  Chat.usersDataController.add(user);
});

socket.on('receivedUsersList', function(users) {
  Chat.usersDataController.addMany(users);
});