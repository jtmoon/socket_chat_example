var Chat = Em.Application.create();

// Models
Chat.Message = Em.Object.extend({
  text                    : null
, created_date            : null
, created_by              : null
, room_id                 : null
});

Chat.User = Em.Object.extend({
  user_name               : null
, room_id                 : null
});

Chat.Room = Em.Object.extend({
  room_id                 : null
, room_name               : null
});

Chat.currentUser = Em.Object.create({
  user                    : null
});

// Controllers
Chat.messagesDataController = Em.ArrayProxy.create({
  content                 : []
, add                     : function(message) {
    var modelMessage = Chat.Message.create(message);
    this.addObject(modelMessage);
  }
});

Chat.usersDataController = Em.ArrayProxy.create({
  content                 : []
, add                     : function(user) {
    var exists = this.filterProperty('id', user.id).length
      , modelUser = Chat.User.create(user);
    if(exists === 0) {
      console.log(modelUser);
      this.addObject(modelUser);
    }
    return modelUser;
  }
, addMany                 : function(users) {
    for(var x=0; x<users.length; x++) {
      this.add(users[x]);
    }
  }
, remove                  : function(user) {
    var targetUser = this.findProperty('id', user.id);
    this.removeObject(targetUser);
  }
});

Chat.roomsDataController = Em.ArrayProxy.create({
  content                 : []
, add                     : function(room) {
    var modelRoom = Chat.Room.create(room);
    this.addObject(modelRoom);
  }
});

Chat.ApplicationController = Em.Controller.extend();

Chat.MessagesController = Em.ArrayProxy.extend({
  content                 : []
, new                     : function(text) {
    var message = {}
      , modelMessage
      , currentUser = Chat.currentUser.get('user');
    message.text = text;
    message.created_date = new Date();
    message.created_by = currentUser;
    message.room_id = currentUser.room_id;
    Chat.messagesDataController.add(message);
    /* Socket.io Events */
    socket.emit('newMessage', message);
  }
, filterBy                : function(property, value) {
    this.set('content', Chat.messagesDataController.filterProperty(property, value));
  }
, messagesObserver        : function() {
    //Fires anytime controller content changes in order to sort messages by date
    //Sort Asc
    this.content.sort(function(a, b) {
      return Date.parse(a.get('created_date')) - Date.parse(b.get('created_date'));
    });
  }.observes('[]')
, messagesDataObserver    : function() {
    //Fires anytime the messagesDataController changes
    var user = Chat.currentUser.get('user');
    this.filterBy('room_id', user.room_id);
  }.observes('Chat.messagesDataController.[]')
, roomObserver            : function() {
    var user = Chat.currentUser.get('user');
    if(user) this.filterBy('room_id', user.room_id);
  }.observes('Chat.currentUser.user.room_id')
});

Chat.MessageController = Em.Controller.extend(); 

Chat.UsersController = Em.ArrayProxy.extend({
  content                 : []
, filterBy                : function(property, value) {
    this.set('content', Chat.usersDataController.filterProperty(property, value));
  }
, currentUserObserver     : function() {
    var user = Chat.currentUser.get('user');
    if(user) this.filterBy('room_id', user.room_id);
  }.observes('Chat.currentUser.user')
, roomObserver            : function() {
    var user = Chat.currentUser.get('user');
    if(user) this.filterBy('room_id', user.room_id);
  }.observes('Chat.currentUser.user.room_id')
, usersDataObserver       : function() {
    var user = Chat.currentUser.get('user');
    if(user) this.filterBy('room_id', user.room_id);
  }.observes('Chat.usersDataController.[]')
, userCount               : function() {
    return this.get('length');
  }.property('@each')
});

Chat.UserController = Em.Controller.extend();

Chat.RoomsController = Em.ArrayProxy.extend({
  init                    : function() {
    var day_room = {
          room_id               : 'day_room'
        , room_name             : 'Day Room'
        }
      , night_room = {
          room_id               : 'night_room'
        , room_name             : 'Night Room'
        };
    Chat.roomsDataController.add(day_room);
    Chat.roomsDataController.add(night_room);
  }
, contentBinding          : 'Chat.roomsDataController'
});

Chat.RoomController = Em.Controller.extend();

// Views
Chat.ApplicationView = Em.View.extend({
  templateName            : 'appView'
, classNames              : ['container-fluid']
, user_name               : null
, userNameInput           : Em.TextField.extend({
    valueBinding            : 'this.parentView.user_name'
  , keyUp                   : function() {
      if(this.value !== '') this.get('parentView').set('isUser', true);
      else this.get('parentView').set('isUser', false);
    }
  , keyPress                : function(e) {
      if(e.which === 13) {
        //Create new user on enter keypress
        this.get('parentView').setCurrentUser();
      }
    }
  })
, isUser                  : false
, setCurrentUser          : function(event) {
    var user = {}
      , defaultRoom = Chat.roomsDataController.findProperty('room_id', 'day_room')
      , modelUser;
    user.user_name = this.get('user_name');
    user.room_id = defaultRoom.get('room_id');
    /* Socket.io Events */
    socket.emit('joinUser', user);
    socket.emit('joinRoom', defaultRoom, null);
    modelUser = Chat.usersDataController.add(user);
    Chat.currentUser.set('user', modelUser);
    Chat.get('router').transitionTo('room', defaultRoom);
  }
});

Chat.UsersView = Em.View.extend({
  templateName            : 'usersView'
, classNames              : ['users']
, userCount               : function() {
    return Chat.get('router').get('usersController').get('userCount');
  }.property('Chat.router.usersController.userCount')
});

Chat.UserView = Em.View.extend({
  templateName            : 'userView'
, tagName                 : 'li'
});

Chat.MessagesView = Em.View.extend({
  templateName            : 'messagesView'
, classNames              : ['chat']
, messageInput            : Em.TextField.extend({
    keyPress                : function(e) {
      if(e.which === 13) {
        //Submit message on enter keypress
        var text = this.get('value');
        this.get('parentView').new(text);
        this.set('value', '');
      }
    }
  })
, new                     : function(text) {
    this.get('controller').new(text);
  }
});

Chat.MessageView = Em.View.extend({
  templateName            : 'messageView'
, tagName                 : 'li'
, classNames              : ['message']
, classNameBindings       : ['isMe:me']
, isMe                    : false
, didInsertElement        : function() {
    var message = this.get('context')
      , user = Chat.currentUser.get('user');
    //This allows us to style messages by us
    if(message.created_by) {
      if(message.created_by.id === user.id) this.set('isMe', true);
    }
    //Scroll to most recent message
    this.get('parentView').$().find('.chat-window').animate({
      scrollTop       : this.$().offset().top
    }, 500);
  }
});

Chat.RoomsView = Em.View.extend({
  templateName            : 'roomsView'
, tagName                 : 'ul'
, classNames              : ['nav']
});

Chat.RoomView = Em.View.extend({
  templateName            : 'roomView'
, tagName                 : 'li'
, classNameBindings       : ['isRoom:active']
, isRoom                  : false
, roomObserver            : function() {
    //Fires when room changes
    var room = this.get('context')
      , user = Chat.currentUser.get('user');
    if(user.room_id === room.room_id) this.set('isRoom', true);
    else this.set('isRoom', false);
  }.observes('Chat.currentUser.user.room_id')
, didInsertElement        : function() {
    var room = this.get('context')
      , user = Chat.currentUser.get('user');
    if(room.room_id === user.room_id) this.set('isRoom', true);
    else this.set('isRoom', false);
  }
, click                   : function(event) {
    var room = this.get('context')
      , user = Chat.currentUser.get('user')
      , users = Chat.get('router').get('usersController').content;
    if(user.room_id !== room.room_id) {
      user.set('room_id', room.room_id);
    }
    /* Socket.io Events */
    socket.emit('joinRoom', room, users);
    Chat.get('router').transitionTo('room', room);
  }
});

// Router
Chat.Router = Em.Router.extend({
  enableLogging               : true
, location                    : 'hash'
, root                        : Em.Route.extend({
    main                        : Em.Route.extend({
      route                       : '/'
    })
  , loading                     : Em.Route.extend({
      redirectsTo                 : 'main'
    })
  , room                        : Em.Route.extend({
      route                       : '/:room_id'
    , serialize                   : function(router, context) {
        return { room_id: context.room_id };
      }
    , deserialize                 : function(router, params) {
        var room = Chat.roomsDataController.findProperty('room_id', params.room_id);
        return room;
      }
    , connectOutlets              : function(router, context) {
        router.get('applicationController').connectOutlet('messages', 'messages');
        router.get('applicationController').connectOutlet('users', 'users');
        router.get('applicationController').connectOutlet('rooms', 'rooms');
      }
    })
  })
});

Chat.initialize();