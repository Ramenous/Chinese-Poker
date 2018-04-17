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
  console.log("kiy"+currSession.id);
  console.log(req.session.name);
  if(req.session.name==null){
    req.session.name="nome";
    //sessions[req.session]="hi";
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
  socket.emit("hello","x");
  socket.emit("roomUpdate",rooms);
  socket.on("roast",function(data){
    console.log("you look like a thumb");
  });
  var uniqueId=validLinkID();
  socket.emit("uniqueLinkID", uniqueId);
  app.post("/room"+uniqueId, function(req, res){
    console.log("uniqueID:",uniqueId);
    console.log("req:", req.roomName.value);
    console.log("res:", res.roomName.value);
    res.render("room");
  })
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
