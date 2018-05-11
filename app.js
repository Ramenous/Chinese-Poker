//Dependencies
const express=require('express');
const app=express();
const path = require('path');
const serv=require('http').Server(app);
const socketIO = require('socket.io');
const session = require('express-session');
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
  var currSession=req.session;
  if(sessions[currSession.id]==null){
    sessions[currSession.id]=currSession;
    console.log("hi new user");
  }else{
    console.log("Welcome back!!!",sessions[req.session]);
  }
  res.render("test");
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

function validLinkID(){
  var id=Math.floor((Math.random() * 999999) + 111111);
  if(rooms[id]==null){
    rooms[id]=id;
    return id;
  }
  return validLinkID();
}

var io = socketIO(serv);
io.sockets.on("connection",function(socket){
  console.log("connected");
  socket.on("obtainRooms",function(data,callback){
    callback(rooms);
  });
  socket.on("roast",function(data){
    console.log("you look like a thumb");
  });
  socket.on("newRoom",function(data, callback){
    var uniqueID=validLinkID();
    callback(uniqueID);
    console.log(uniqueID);
    console.log(data.masterName+" has connected.");
    app.get("/room"+uniqueID, function(req, res){
      console.log("params",req.params);
      var currSessionID=req.session.id;
      var newRoom=new Room(uniqueID, data.roomName, data.roomPass, data.numOfPlayers);
      var master=(players[currSessionID]==null) ? new Player(data.masterName,currSessionID) : players[currSessionID];
      master.inRoom=master.isMaster=true;
      newRoom.addPlayer(master);
      console.log(master);
      console.log(newRoom);
      res.render("room", {roomID: uniqueID, sessionID: currSessionID});
      socket.emit("playerUpdate", players);
    });
  });
  socket.on("joinRoom", function(data){
    console.log("Joining Room...");
    var id=data.room;
    app.get("/room"+id, function(req, res){
      var currSessionID=req.session.id;
      var player=(players[currSessionID]==null) ? new Player(data.playerName,currSessionID) : players[currSessionID];
      player.inRoom=true;
      rooms[id].addPlayer(player);
      res.render("room", {roomID: id, sessionID: currSessionID});
    });
  });
  socket.on("obtainRoomData", function(data, callback){
      callback(rooms[parseInt(data)]);
  })
});

Player=function(name, sessionID){
  this.name=name;
  this.inRoom=true;
  this.sessionID=sessionID;
  players[sessionID]=this;
}

Room=function(id, name, pass, maxPlayers){
  this.id=id;
  this.name=name;
  this.pass=pass;
  this.players=[];
  this.addPlayer=function(player){
    if(player.isMaster) this.master=player;
    this.players.push(player);
  }
  rooms[id]=this;
}
