//Dependencies
const express=require('express');
const app=express();
const path = require('path');
const serv=require('http').Server(app);
const socketIO = require('socket.io');
const session = require('express-session');
const poker=require('./client/pokerGame.js');
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

/**
  Renders the view of a pug file when a GET request is made.
*/

app.get("/", function(req, res){
  var currSessionID=req.session.id;
  if(sessions[currSessionID]==null){
    sessions[currSessionID]=currSessionID;
    console.log("New User has connected - Session: ", currSessionID);
    res.render("test");
  }else{
    if(players[currSessionID]!=null && players[currSessionID].inRoom){
      res.render("room", {roomID: players[currSessionID].room, sessionID: currSessionID});
    }else{
      res.render("test");
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

function roomEvent(name, roomID, created){
  return (created) ? name+" has created room "+roomID: name+" has joined room "+roomID;
}

function validLinkID(){
  var id=Math.floor((Math.random() * 999999) + 111111);
  if(rooms[id]==null){
    rooms[id]=id;
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
  var msg=[roomEvent(name, roomID, false)];
  app.get("/room"+roomID+"/"+name, function(req, res){
    var currSessionID=req.session.id;
    var player=(players[currSessionID]==null) ? new Player(name,currSessionID,roomID) : players[currSessionID];
    if(typeof room != "object"){
      room=new Room(uniqueID, roomName, roomPass, numOfPlayers);
      master=true;
      msg.unshift(roomEvent(name, roomID, true));
    }else{
      var correctRoom=roomID;
      if(player.roomID!=roomID) {
        room=rooms[player.roomID];
        correctRoom=player.roomID;
      }
      io.to(correctRoom).emit("updateLog", [msg]);
    }
    player.enterRoom(master,room.numOfPlayers());
    room.addPlayer(player);
    room.addRoomEvent(msg);
    if(room.getPlayerCount()==room.maxPlayers) startGame(socket, room);
    res.render("room", {roomID: roomID, sessionID: currSessionID});
  });
}

function joinRoom(socket){
  socket.on("joinRoom", function(data, callback){
    var roomID=data.roomID;
    var name=data.playerName;
    var isFull=false;
    if(room.getPlayerCount()<room.maxPlayers){
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
function validateHand(socket){
  socket.on("submitHand", function(data, callback){
    var handArray=Object.values(data.playerHand);
    var handLength=handArray.length;
    var roomID=data.roomID;
    var room=rooms[roomID];
    var player=players[data.playerSession];
    var result=0;
    if(player.turn==room.playerTurn){
      if(handLength!=4 & handLength<6){
        if(verifyHand(handArray, player)){
          if(poker.isHigherRanking(handArray, room.getLastHand())){
            var removedCards=player.removeCards(handArray);
            room.playerTurn=(room.maxPlayers==room.playerTurn)?0:room.playerTurn+=1;
            room.addToPile(removedCards);
            result=3;
          }else{
            result=4;
          }
        }else{
          result=2;
        }
      }else{
        result=1
      }
    }
    if(result==3){
      io.to(roomID).emit("updatePile", room.getLastHand());
      var i=room.playerTurn;
      io.to(roomID).emit("updateTurn", room.players[i].name);
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

var io = socketIO(serv);
io.sockets.on("connection",function(socket){
  console.log("Connected!");
  socket.on("obtainRooms",function(data,callback){
    callback(rooms);
  });
  assignChannel(socket);
  joinRoom(socket);
  createRoom(socket);
  getPlayerHand(socket);
  validateHand(socket);
  //socketDisconnect(socket);
});

Player=function(name, sessionID, roomID){
  this.name=name;
  this.inRoom=true;
  this.roomID=roomID;
  this.sessionID=sessionID;
  this.hand=[];
  this.enterRoom=function(isMaster, playerNumber){
    this.inRoom=true;
    player.isMaster=isMaster;
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
  this.getPlayerCount=function(){
    return this.players.length;
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
