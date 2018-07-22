//Dependencies
const express=require('express');
const app=express();
const path = require('path');
const serv=require('http').Server(app);
const socketIO = require('socket.io');
const session = require('express-session');
const poker=require('./client/pokerGame.js');
var io = socketIO(serv);
const NOT_READY=1;
const READY=2;
const DISCONNECTED=3;
const IN_GAME=4;
const ROOM_VIEW="room";
const HOME_VIEW="home";
const RECONNECT_TIME=30;
const CHINESE_POKER=1;
const DEFAULT_NAMES=[
  "James",
  "Jones",
  "Bob",
  "Billiam",
  "Bosef"
];
const PLAYER_STATUS={
  1:"Not Ready",
  2:"Ready",
  3:"Disconnected",
  4:"In Game"
}
var playerSockets={};
var discPlayers={};
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
  var homeViewInfo=(player==null || player.status!=DISCONNECTED)?
  {disconnected:false}:{disconnected:true, roomID: player.roomID, playerName:player.name};
  res.render(HOME_VIEW, homeViewInfo);
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
  var room=rooms[roomID];
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
  return {isRoomEvent:true, logMsg:msg};
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
function updatePlayerStatus(roomID, name, status){
  var dataObj={
    name:name,
    status:PLAYER_STATUS[status]
  };
  io.to(roomID).emit("updatePlayer", dataObj);
}
function startGame(socket, room){
  var players=room.players;
  var roomID=room.id;
  var deck=room.createDeck();
  poker.distributeCards(deck, players, room.maxPlayers);
  room.startGame();
  for(var p in players){
    var player=players[p];
    player.status=4;
    var socketID=player.socketID;
    updatePlayerStatus(roomID, player.name, player.status);
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
    if(!player.inRoom || room==null){
      if(room==null){
        room=new Room(roomID, roomName, roomPass, numOfPlayers);
        master=true;
        msg.unshift(roomEvent(name, roomID,0));
      }
      player.enterRoom(master, room.numOfPlayers());
      room.addPlayer(player);
      room.addRoomMessage(msg);
      var playerInfo={
        name: player.name,
        status: PLAYER_STATUS[player.status],
        cards: player.hand.length,
        sessionID:player.sessionID,
        time:player.reconnectTimer
      };
      io.to(roomID).emit("addPlayer", {player:playerInfo, startedGame: room.startedGame});
    }else{
      var correctRoom=rooms[player.roomID];
      if(player.roomID!=roomID) {
        room=correctRoom;
        selectedRoomID=player.roomID;
      }
      player.status=(room.startedGame)?3:1;
      msg=[roomEvent(name, roomID, 2)];
      correctRoom.addRoomMessage(msg);
      updatePlayerStatus(roomID, player.name, player.status);
    }
    io.to(roomID).emit("updateLog", msg);
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
    socket.join(roomID);
    //console.log("rooms:",rooms, "roomid:",roomID, "isroom",rooms[roomID]);
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
  if(poker.compareHand(submittedHand, room.lastHand)<=0) return 4;
  if(submittedHand.length!=room.lastHand.length && room.lastHand.length>0) return 5;
  return 0;
}

function reconnectCountDown(){
  var playerTimes=[];
  for(var p in discPlayers){
    var player=discPlayers[p];
    var roomID=player.roomID;
    var room=rooms[roomID];
    player.reconnectTimer--;
    if(player.reconnectTimer==0){
      delete discPlayers[player.sessionID];
      removePlayerFromRoom(player,room);
    }else{
      playerTimes.push({name:player.name, time:player.reconnectTimer});
    }
  }
  if(playerTimes.length>0)
    io.to(roomID).emit("updatePlayerTimers", playerTimes);
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
      if(!poker.isHighestCard(handArray)){
        room.lastPlayerTurn=room.playerTurn;
        room.playerTurn=(room.maxPlayers-1==room.playerTurn)?0:room.playerTurn+1;
        room.lastHand=handArray;
      }else{
        room.lastHand=[];
      }
      io.to(roomID).emit("updatePile", room.lastHand);
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
      var roomID=player.roomID;
      delete playerSockets[id];
      if(roomID!=null){
        var roomID=player.roomID;
        var room=rooms[roomID];
        console.log("disconnecting...");
        if(room.startedGame){
          updatePlayerStatus(roomID,player.name, player.status);
          player.status=DISCONNECTED;
          discPlayers[player.sessionID]=player;
        }else{
          removePlayerFromRoom(player,room);
        }
      }
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
    callback(rooms[data].lastHand);
  });
}

function getCurrentPlayerTurn(socket){
  socket.on("getTurn", function(data,callback){
    callback(rooms[data].getPlayerTurn());
  });
}
function getPlayers(socket){
  socket.on("getPlayers", function(data, callback){
    var room=rooms[data];
    var players=room.players;
    var playerInfos=[];
    for(var p in players){
      var player=players[p];
      playerInfos.push({
        name: player.name,
        status: PLAYER_STATUS[player.status],
        cards: player.hand.length,
        time: player.reconnectTimer,
        sessionID:player.sessionID
      });
    }
    callback({players:playerInfos, startedGame:room.startedGame});
  });
}
function removePlayerFromRoom(player,room){
  var newMaster=room.removePlayer(player);
  player.exitRoom();
  io.to(room.id).emit("removePlayer",{
    newMaster:(newMaster!=null)?newMaster.name:null,
    player:player.name
  });
}
function leaveRoom(socket){
  socket.on("leaveRoom", function(data){
    var player=players[data.playerSession];
    var room=rooms[data.roomID];
    removePlayerFromRoom(player,room);
  });
}

function getMaster(socket){
  socket.on("getMaster", function(data, callback){
    callback(rooms[data].master.name);
  });
}

function passTurn(socket){
  socket.on("passTurn", function(data){
    var roomID=data.roomID;
    var room=rooms[roomID];
    var player=players[data.playerSession];
    room.playersPassed++;
    if((room.maxPlayers-1)==room.playersPassed){
      room.playerTurn=room.lastPlayerTurn;
      room.lastHand=[];
      room.playersPassed=0;
    }else{
      room.playerTurn=(room.maxPlayers-1==room.playerTurn)?0:room.playerTurn+1;
    }
    io.to(roomID).emit("updateTurn", room.players[room.playerTurn].name);
  });
}

function readyPlayer(socket){
  socket.on("readyPlayer", function(data,callback){
    var roomID=data.roomID;
    var room=rooms[roomID];
    var player=players[data.playerSession];
    player.status=(player.status==NOT_READY)?READY:NOT_READY;
    (player.status==READY)?room.playersReady++:room.playersReady--;
    if(room.playersReady==room.maxPlayers && !room.startedGame){
      startGame(socket, room);
    }
    io.to(roomID).emit("updateReadyStatus", {name:player.name, status:PLAYER_STATUS[player.status], startedGame:room.startedGame});
    callback(player.status);
  });
}

function getDefaultName(socket){
  socket.on("getDefaultName",function(data,callback){
    callback(DEFAULT_NAMES.splice(0, 1));
  });
}

function submitPlayerMsg(socket){
  socket.on("submitPlayerMsg", function(data){
    var roomID=data.roomID;
    var room=rooms[roomID];
    var player=players[data.playerSession];
    var fullMsg={isRoomEvent:false, logMsg:player.name+": "+msg};
    room.addRoomMessage(fullMsg);
    io.to(roomID).emit("updateLog", fullMsg);
  });
}
function connectPlayer(socket){
  socket.on("connectPlayer", function(data){
    var roomID=data.roomID;
    var room=rooms[roomID];
    var players=room.players;
    var sessionID=data.playerSession;
    for(var p in players){
      var player=players[p];
      if(player.sessionID==sessionID && player.status==DISCONNECTED){
        player.status=(room.startedGame)?IN_GAME:NOT_READY;
        player.reconnectTimer=RECONNECT_TIME;
        delete discPlayers[player.sessionID];
        updatePlayerStatus(roomID, player.name, player.status);
        io.to(roomID).emit("updatePlayerTimers", [{name:player.name}]);
      }
    }
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
  getDefaultName(socket);
  connectPlayer(socket)
  socketDisconnect(socket);
}

io.sockets.on("connection", socketConnect);
setInterval(function(){ reconnectCountDown(); }, 1000);
Player=function(name, sessionID, roomID){
  this.name=name;
  this.inRoom=false;
  this.status=1;
  this.isMaster=false;
  this.winner=false;
  this.reconnectTimer=RECONNECT_TIME;
  this.roomID=roomID;
  this.sessionID=sessionID;
  this.hand=[];
  this.enterRoom=function(isMaster, numOfPlayers){
    this.inRoom=true;
    this.isMaster=isMaster;
    this.turn=numOfPlayers;
  }
  this.exitRoom=function(){
    this.inRoom=false;
    this.isMaster=false;
    this.status=0;
    this.winner=false;
    this.reconnectTimer=RECONNECT_TIME;
    delete this.roomID;
    delete this.turn;
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
  this.lastHand=[];
  this.winners=0;
  this.playersReady=0;
  this.playersPassed=0;
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
    this.winners=0;
    this.playersReady=0;
    this.playersPassed=0;
    this.lastHand=[];
  }
  this.createDeck=function(){
    var deck=poker.initializeDeck(CHINESE_POKER);
    poker.shuffleDeck(deck, 5);
    return deck;
  }
  this.getPlayerTurn=function(){
    return (this.playerTurn==null)? "Game has not started" : this.players[this.playerTurn].name;
  }
  this.removePlayer=function(player){
    var players=this.players;
    for(var p in players){
      if(players[p].sessionID===player.sessionID) players.splice(p,1);
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
  this.addRoomMessage=function(msg){
    this.lastLogMsgIndex=this.log.length;
    if(Array.isArray(msg)){
      this.log=this.log.concat(msg);
    }else{
      this.log.push(msg);
    }
  }
  this.addPlayer=function(player){
    if(player.isMaster) this.master=player;
    this.players.push(player);
  }
  rooms[id]=this;
}
