//Dependencies
const express=require('express');
const app=express();
const path = require('path');
const serv=require('http').Server(app);
const socketIO = require('socket.io');
const session = require('express-session');
const poker=require('./client/pokerGame.js');
const ROOM_VIEW="room";
const HOME_VIEW="home";
const GAME_TYPE={
  1:"ChinesePoker",
}
var sessions={};
var playerSockets={};
var players={};
var rooms={};
/*
  Set up middleware function between these two paths
  in this case, it's the client directory with all our html,
  css, etc stuff.
*/
app.use("/client", express.static(__dirname+"/client"));
app.use("/client/img", express.static(__dirname+"/client"));
//app.set("imgs", path.join(__dirname, "/img"));
app.set('trust proxy', 1); // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  rolling: true,
  saveUninitialized: true,
  cookie: { maxAge: 60000 }
  }));
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "/client"));

/*
  Renders the view of the home page.
  Loads the lobby if the user is new or not in a game
  Loads the user's game room if he/she is in a game
*/
app.get("/", function(req, res){
  var currSessionID=req.session.id;
  var player=players[currSessionID];
  if(sessions[currSessionID]==null){
    sessions[currSessionID]=currSessionID;
    console.log("New User has connected - Session: ", currSessionID);
    res.render(HOME_VIEW);
  }else{
    if(player!=null && player.inRoom){
      res.render(ROOM_VIEW, {roomID: player.room, sessionID: currSessionID});
    }else{
      res.render(HOME_VIEW);
    }
    console.log("User Session ", currSessionID, " has reconnected.");
  }
});

/*
  Responds with the index html file (our single page application file)
  when a GET request is made.
app.get('/',function(req,res){
  res.sendFile(__dirname+"/client/index.html");
});
*/
//Server starts on port 5000
serv.listen(5000, function(){
  console.log("Server has started on port 5000");
});

function roomEvent(name, roomID, status){
  switch(status){
    case 0:
      return name+" has created room "+roomID;
    case 1:
      return name+" has joined room "+roomID;
  }
}

function validLinkID(){
  var id=Math.floor((Math.random() * 999999) + 111111);
  if(rooms[id]==null){
    return id;
  }
  return validLinkID();
}

function createRoom(socket){
  socket.on("newRoom",function(data, callback){
    var uniqueID=validLinkID();
    callback(uniqueID);
    var name=data.masterName;
    routeRoom(name, uniqueID, data.roomName, data.roomPass, data.numOfPlayers);
  });
}

function getPlayerHand(socket){
  socket.on("getPlayerHand", function(data, callback){
    var roomID=data.roomID;
    var playerSession=data.playerSession;
    if(rooms[roomID].startedGame){
      callback(players[playerSession].hand);
    }
  });
}

function startGame(socket, room){
  var players=room.players;
  var deck=room.createDeck();
  poker.distributeCards(deck, players, room.maxPlayers);
  room.startGame();
  for(var player in players){
    var socketID=players[player].socketID;
    if(socketID!=null)
      io.to(socketID).emit("distributeHand", players[player].hand);
  }
  var index=room.playerTurn;
  io.to(room.id).emit("updateTurn", room.players[index].name);
}

function routeRoom(name,roomID, roomName, roomPass, numOfPlayers){
  var room=rooms[roomID];
  var master=false;
  var msg=[roomEvent(name, roomID, 1)];
  app.get("/room"+roomID+"/"+name, function(req, res){
    var currSessionID=req.session.id;
    var player=(players[currSessionID]==null) ? new Player(name,currSessionID,roomID) : players[currSessionID];
    if(!player.inRoom || room==null){
      if(room==null){
        room=new Room(roomID, roomName, roomPass, numOfPlayers);
        master=true;
        msg.unshift(roomEvent(name, roomID,0));
      }else{
        io.to(roomID).emit("updateLog", msg);
      }
      player.enterRoom(master,room.numOfPlayers());
      room.addPlayer(player);
      room.addRoomEvent(msg);
    }else{
      var correctRoom=roomID;
      if(player.roomID!=roomID) {
        room=rooms[player.roomID];
        correctRoom=player.roomID;
      }
    }
    if(room.numOfPlayers()==room.maxPlayers) startGame(socket, room);
    res.render(ROOM_VIEW, {roomID: roomID, sessionID: currSessionID});
  });
}

function joinRoom(socket){
  socket.on("joinRoom", function(data, callback){
    var roomID=data.roomID;
    var name=data.playerName;
    var isFull=false;
    if(room.numOfPlayers()<room.maxPlayers){
      routeRoom(name, roomID);
    }else{
      isFull=true;
    }
    callback({roomFull: isFull, room: roomID});
  });
}

function assignChannel(socket){
  socket.on("assignChannel",function(data){
    var roomID=data.roomID;
    console.log(roomID);
    console.log("room",rooms[roomID]);
    var player=players[data.playerSession];
    playerSockets[socket.id]=player;
    player.socketID=socket.id;
    socket.join(roomID);
    socket.emit("updateLog", rooms[roomID].log);
  });
}
function verifyHand(hand, player){
  var realPlayerHand=player.hand;
  for(var card in hand){
    var containsCard=false;
    for(var realCard in realPlayerHand){
      if(hand[card].display==realPlayerHand[realCard].display){
        containsCard=true;
        break;
      }
    }
    if(!containsCard) return false;
  }
  return true;
}

function validateHand(submittedHand, room, player){
  if(player.turn!=room.playerTurn) return 1;
  if(submittedHand.length==4 || submittedHand.length>5 || submittedHand==null) return 2;
  if(!verifyHand(submittedHand, player)) return 3;
  if(!poker.isHigherRanking(submittedHand, room.getLastHand())) return 4;
  return 0;
}

function submitHand(socket){
  socket.on("submitHand", function(data, callback){
    var handArray=Object.values(data.playerHand);
    var roomID=data.roomID;
    var room=rooms[roomID];
    var player=players[data.playerSession];
    var result=validateHand(handArray, room, player);
    if(result==0){
      var removedCards=player.removeCards(handArray);
      room.playerTurn=(room.maxPlayers==room.playerTurn)?0:room.playerTurn+1;
      room.addToPile(removedCards);
      io.to(roomID).emit("updatePile", room.getLastHand());
      var turn=room.playerTurn;
      io.to(roomID).emit("updateTurn", room.players[turn].name);
    }
    callback({handResult: result, playerHand:player.hand});
  });
}

function socketDisconnect(socket){
  socket.on("disconnect", function(){
    var id=socket.id;
    var player=playerSockets[id];
    if(player!=null){
      delete player.socketID;
      delete playerSockets[id];
    }
  });
}

function obtainRooms(socket){
  socket.on("obtainRooms",function(data,callback){
    callback(rooms);
  });
}

function getPile(socket){
  socket.on("getPile", function(data, callback){
    callback(rooms[data].getLastHand());
  });
}

function getCurrentPlayerTurn(socket){
  socket.on("getTurn", function(data,callback){
    callback(rooms[data].getPlayerTurn);
  });
}

function socketConnect(socket){
  console.log("Connected!");
  obtainRooms(socket);
  assignChannel(socket);
  joinRoom(socket);
  createRoom(socket);
  getPlayerHand(socket);
  submitHand(socket);
  //socketDisconnect(socket);
}

var io = socketIO(serv);
io.sockets.on("connection", socketConnect);

Player=function(name, sessionID, roomID){
  this.name=name;
  this.inRoom=true;
  this.roomID=roomID;
  this.sessionID=sessionID;
  this.hand=[];
  this.enterRoom=function(isMaster, playerNumber){
    this.inRoom=true;
    this.isMaster=isMaster;
    if(this.turn==null)this.turn=playerNumber;
  }
  this.exitRoom=function(){
    this.inRoom=false;
    delete player.isMaster;
    delete player.turn;
  }
  this.addCard=function(card){
    this.hand.push(card);
  }
  this.removeCards=function(cards){
    var removed=[];
    for(var i=0; i<cards.length; i++){
      for(var j=0; j<this.hand.length;j++){
        if(cards[i].display==this.hand[j].display){
          removed=removed.concat(this.hand.splice(j,1));
          break;
        }
      }
    }
    return removed;
  }
  players[sessionID]=this;
}

Room=function(id, name, pass, maxPlayers){
  this.id=id;
  this.name=name;
  this.pass=pass;
  this.maxPlayers=maxPlayers;
  this.players=[];
  this.log=[];
  this.cardPile=[];
  this.startedGame=false;
  this.numOfPlayers=function(){
    return this.players.length;
  }
  this.startGame=function(){
    this.startedGame=true;
    this.playerTurn=Math.floor(Math.random()*this.maxPlayers+1);
  }
  this.createDeck=function(){
    var deck=poker.initializeDeck(GAME_TYPE[1]);
    poker.shuffleDeck(deck, 5);
    return deck;
  }
  this.getPlayerTurn=function(){
    return (this.playerTurn==null)? "Game has not started" : this.players[this.playerTurn].name;
  }
  this.addRoomEvent=function(event){
    this.lastLogMsgIndex=this.log.length;
    if(Array.isArray(event)){
      this.log=this.log.concat(event);
    }else{
      this.log.push(event);
    }
  }
  this.addToPile=function(hand){
    this.cardPile.push(hand);
  }
  this.addPlayer=function(player){
    if(player.isMaster) this.master=player;
    this.players.push(player);
  }
  this.getLastHand=function(){
    return this.cardPile[this.cardPile.length-1];
  }
  rooms[id]=this;
}
