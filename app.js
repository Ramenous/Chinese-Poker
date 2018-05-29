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
    var newRoomMsg=roomEvent(name, uniqueID, true);
    var joinRoomMsg=roomEvent(name, uniqueID, false);
    app.get("/room"+uniqueID+"/"+name, function(req, res){
      var currSessionID=req.session.id;
      if(typeof rooms[uniqueID] != "object"){
        console.log(newRoomMsg);
        console.log(joinRoomMsg);
        var newRoom=new Room(uniqueID, data.roomName, data.roomPass, data.numOfPlayers);
        var master=(players[currSessionID]==null) ? new Player(name,currSessionID, uniqueID) : players[currSessionID];
        master.inRoom=master.isMaster=true;
        newRoom.addPlayer(master);
        newRoom.addRoomEvent([newRoomMsg, joinRoomMsg]);
      }
      res.render("room", {roomID: uniqueID, sessionID: currSessionID});
    });
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
  room.startedGame=true;
  for(var player in players){
    var socketID=players[player].socketID;
    if(socketID!=null)
      io.to(socketID).emit("distributeHand", players[player].hand);
  }
}

function joinRoom(socket){
  socket.on("joinRoom", function(data, callback){
    var roomID=data.roomID;
    var name=data.playerName;
    var room=rooms[roomID];
    var isFull=false;
    if(room.getPlayerCount()<room.maxPlayers){
      app.get("/room"+roomID+"/"+name, function(req, res){
        var currSessionID=req.session.id;
        var player=players[currSessionID];
        if(player==null || (player!=null && !player.inRoom)){
          var msg=roomEvent(name, roomID, false);
          console.log(msg);
          player=(players[currSessionID]==null) ? new Player(name,currSessionID,roomID) : players[currSessionID];
          player.inRoom=true;
          player.isMaster=false;
          room.addPlayer(player);
          room.addRoomEvent(msg);
          io.to(roomID).emit("updateLog", [msg]);
          if(room.getPlayerCount()==room.maxPlayers){
            startGame(socket, room);
          }
        }else if(player.roomID!=roomID){
          //redirect to right room
        }
        res.render("room", {roomID: roomID, sessionID: currSessionID});
      });
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
function verifyHand(hand, sessionID){
  var realPlayerHand=players[sessionID].hand;
  
}
function validateHand(socket){
  socket.on("submitHand", function(data, callback){
    var handArray=Object.values(data.playerHand);
    var handLength=handArray.length;
    if(handLength!=4 & handLength<6 && verifyHand(hand, data.playerSession)){

    }
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
  this.addCard=function(card){
    this.hand.push(card);
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
  this.startedGame=false;
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
  this.addPlayer=function(player){
    if(player.isMaster) this.master=player;
    this.players.push(player);
  }
  rooms[id]=this;
}
