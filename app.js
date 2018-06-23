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
  duration: 600000,
  secret: 'keyboard cat',
  resave: true,
  rolling: true,
  saveUninitialized: true,
  cookie: { maxAge: 600000 }
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
  var msg;
  switch(status){
    case 0:
      msg= name+" has created room "+roomID;
      break;
    case 1:
      msg= name+" has joined room "+roomID;
      break;
    case 2:
      msg= name+" has reconnected";
      break;
  }
  return {isRoomEvent: true, logMsg:msg };
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
    routeRoom(name, uniqueID,socket, data.roomName, data.roomPass, data.numOfPlayers);
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
  var roomID=room.id;
  var deck=room.createDeck();
  poker.distributeCards(deck, players, room.maxPlayers);
  room.startGame();
  for(var p in players){
    var player=players[p];
    var socketID=player.socketID;
    //Using socket ID because each player's hand is unique
    if(socketID!=null)
      io.to(socketID).emit("distributeHand", player.hand);
  }
  var index=room.playerTurn;
  io.to(roomID).emit("updateTurn", players[index].name);
  io.to(roomID).emit("startGame");
}

function routeRoom(name,roomID, socket, roomName, roomPass, numOfPlayers){
  var selectedRoomID=roomID;
  var room=rooms[roomID];
  var master=false;
  var msg=[roomEvent(name, roomID, 1)];
  app.get("/room"+roomID+"/"+name, function(req, res){
    var currSessionID=req.session.id;
    var player=(players[currSessionID]==null) ? new Player(name,currSessionID,roomID) : players[currSessionID];
    //console.log("STATUSUUUU",!player.inRoom ,player.name, room==null);
    if(!player.inRoom || room==null){
      if(room==null){
        room=new Room(roomID, roomName, roomPass, numOfPlayers);
        master=true;
        msg.unshift(roomEvent(name, roomID,0));
      }
      player.enterRoom(master, room.numOfPlayers());
      room.addPlayer(player);
      room.addRoomEvent(msg);
    }else{
      var correctRoom=rooms[player.roomID];
      if(player.roomID!=roomID) {
        room=correctRoom;
        selectedRoomID=player.roomID;
        //console.log("wrong room");
      }
      //console.log("player in room and room exists");
      msg=[roomEvent(name, roomID,2)];
      correctRoom.addRoomEvent(msg);
    }
    io.to(roomID).emit("updatePlayers", player);
    io.to(roomID).emit("updateLog", msg);
    //console.log("PLAYER: ", player.name, "IN ROOM: ",player.inRoom, "ROOM real?", room!=null, roomID);
    res.render(ROOM_VIEW, {roomID: selectedRoomID, sessionID: currSessionID});
  });
}

function joinRoom(socket){
  socket.on("joinRoom", function(data, callback){
    var roomID=data.roomID;
    var name=data.playerName;
    var room=rooms[roomID];
    var isFull=false;
    if(room.numOfPlayers()<room.maxPlayers){
      routeRoom(name, roomID, socket);
    }else{
      isFull=true;
    }
    callback({roomFull: isFull, room: roomID});
  });
}

function assignChannel(socket){
  socket.on("assignChannel",function(data){
    var roomID=data.roomID;
    var player=players[data.playerSession];
    playerSockets[socket.id]=player;
    player.socketID=socket.id;
    //console.log("assigningSocket",player.name, player.socketID);
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
      if(player.hand.length==0){
        room.winners++;
        player.winner=true;
        var endGame=false;
        if(room.winners==room.maxPlayers-1){
          room.endGame();
          endGame=true;
        }
        io.to(roomID).emit("updateWinner", {
          name:player.name,
          number:room.winners,
          gameFinished:endGame
        });
        io.to(roomID).emit("endGame");
      }
      if(!poker.isHighestCard(handArray))
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
    callback(rooms[data].getPlayerTurn());
  });
}
function getPlayers(socket){
  socket.on("getPlayers", function(data, callback){
    callback(rooms[data].players);
  });
}

function leaveRoom(socket){
  socket.on("leaveRoom", function(data, callback){
    var player=players[data.playerSession];
    var room=rooms[data.roomID];
    var master=room.removePlayer(player);
    player.exitRoom();
    if(master!=null){
      callback({master:master.name, player:player.name});
    }
  });
}

function getMaster(socket){
  socket.on("getMaster", function(data, callback){
    callback(rooms[data].master.name);
  });
}

function passTurn(socket){
  socket.on("passTurn", function(data, callback){
    var room=rooms[data.roomID];
    room.playerTurn=(room.maxPlayers==room.playerTurn)?0:room.playerTurn+1;
    io.to(room.id).emit("updateTurn", room.players[room.playerTurn].name);
  });
}

function readyPlayer(socket){
  socket.on("readyPlayer", function(data,callback){
    var roomID=data.roomID;
    var room=rooms[roomID];
    var player=players[data.playerSession];
    player.isReady=!player.isReady;
    (player.isReady)?room.playersReady++:room.playersReady--;
    if(room.playersReady==room.maxPlayers && !room.startedGame){
      startGame(socket, room);
    }
    //var socketID=player.socketID;
    //if(socketID!=null)
    io.to(roomID).emit("updateReadyStatus", {player:player.name, status:player.isReady});
    callback(player.isReady);
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
  getPile(socket);
  leaveRoom(socket);
  getMaster(socket);
  getPlayers(socket);
  getCurrentPlayerTurn(socket);
  passTurn(socket);
  readyPlayer(socket);
  //socketDisconnect(socket);
}

var io = socketIO(serv);
io.sockets.on("connection", socketConnect);

Player=function(name, sessionID, roomID){
  this.name=name;
  this.inRoom=false;
  this.isReady=false;
  this.isMaster=false;
  this.winner=false;
  this.roomID=roomID;
  this.sessionID=sessionID;
  this.hand=[];
  this.enterRoom=function(isMaster, playerNumber){
    this.inRoom=true;
    this.isMaster=isMaster;
    this.turn=playerNumber;
  }
  this.exitRoom=function(){
    this.inRoom=false;
    this.isMaster=false;
    this.isReady=false;
    this.winner=false;
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
  this.winners=0;
  this.playersReady=0;
  this.startedGame=false;
  this.numOfPlayers=function(){
    return this.players.length;
  }
  this.startGame=function(){
    this.startedGame=true;
    this.playerTurn=Math.floor(Math.random()*this.maxPlayers);
  }
  this.endGame=function(){
    this.startedGame=false;
  }
  this.createDeck=function(){
    var deck=poker.initializeDeck(GAME_TYPE[1]);
    poker.shuffleDeck(deck, 5);
    return deck;
  }
  this.getPlayerTurn=function(){
    return (this.playerTurn==null)? "Game has not started" : this.players[this.playerTurn].name;
  }
  this.removePlayer=function(player){
    var players=this.players;
    for(var p in players){
      if(players[p].name==player.name) players.splice[i];
    }
    if(players.length==0){
      delete rooms[this.id];
    }
    if(player.isMaster){
      var newMaster=players[0];
      newMaster.isMaster=true;
      return newMaster;
    }
  }
  this.kickPlayer=function(){
    //stops player from joining same room
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
