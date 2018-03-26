//Dependencies
const express=require('express');
const app=express();
const path = require('path');
const serv=require('http').Server(app);
const socketIO = require('socket.io');

/*
  Set up middleware function between these two paths
  in this case, it's the client directory with all our html,
  css, etc stuff.
*/
app.use("/client", express.static(__dirname+"/client"));
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "/client"));

/**
  Renders the view of a pug file when a GET request is made.
*/

app.get("/", function(req, res){
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

var io = socketIO(serv);
io.sockets.on("connection",function(socket){
  console.log("connected");
  socket.emit("roomUpdate",rooms);
  socket.on("roast",function(data){
    console.log("you look like a thumb");
  });
  socket.on("newRoom",function(data){
    console.log(data.masterName+" has connected.");
    app.get("/newpage"+data.roomId, function(req, res){
        new Room(data.roomId, data.roomName, new Player(data.masterName,true), data.max);
        res.render("room");
        socket.emit("playerUpdate",players);
    });
  });



});


Player=function(name, inGame){
  this.name=name;
  this.inGame=inGame;
  players[name]=this;
}

Room=function(id, name, master, maxPlayers){
  this.id=id;
  this.name=name;
  this.master=master;
  rooms[id]=this;
}
