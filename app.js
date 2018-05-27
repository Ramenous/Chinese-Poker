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

/*
  Set up middleware function between these two paths
  in this case, it's the client directory with all our html,
  css, etc stuff.
*/
app.use("/client", express.static(__dirname+"/client"));
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

var players={};
var rooms={};

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
      console.log(newRoomMsg);
      console.log(joinRoomMsg);
      var currSessionID=req.session.id;
      var newRoom=new Room(uniqueID, data.roomName, data.roomPass, data.numOfPlayers);
      var master=(players[currSessionID]==null) ? new Player(name,currSessionID, uniqueID) : players[currSessionID];
      master.inRoom=master.isMaster=true;
      newRoom.addPlayer(master);
      newRoom.addRoomEvent([newRoomMsg, joinRoomMsg]);
      res.render("room", {roomID: uniqueID, sessionID: currSessionID});
    });
  });
}

function joinRoom(socket){
  socket.on("joinRoom", function(data, callback){
    var roomID=data.roomID;
    var name=data.playerName;
    var room=rooms[roomID];
    var isFull=false;
    if(room.getPlayerCount()<room.maxPlayers){
      app.get("/room"+roomID+"/"+name, function(req, res){
        var msg=name+ " has joined room "+ roomID;
        console.log(msg);
        var currSessionID=req.session.id;
        var player=(players[currSessionID]==null) ? new Player(name,currSessionID,roomID) : players[currSessionID];
        player.inRoom=true;
        player.isMaster=false;
        room.addPlayer(player);
        room.addRoomEvent(msg);
        io.to(roomID).emit("updateLog", [msg]);
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
    socket.join(roomID);
    socket.emit("updateLog", rooms[roomID].log);
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
});

Player=function(name, sessionID, roomID){
  this.name=name;
  this.inRoom=true;
  this.room=roomID;
  this.sessionID=sessionID;
  this.hand=[];
  this.addCard=function(card){
    hand.push(card);
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
  this.createDeck=function(){
    var deck=poker.initializeDeck();
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
  this.addPlayer=function(player){
    if(player.isMaster) this.master=player;
    this.players.push(player);
  }
  rooms[id]=this;
}
