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
  var currSessionID=req.session.id;
  if(sessions[currSessionID]==null){
    sessions[currSessionID]=currSessionID;
    console.log("New User has connected - Session: ", currSessionID);
    res.render("test");
  }else{
    if(players[currSessionID].inRoom){
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
  console.log("Connected!");
  socket.on("obtainRooms",function(data,callback){
    callback(rooms);
  });
  socket.on("joinRoom", function(data){
    var roomID=data.room;
    var name=data.playerName;
    app.get("/room"+id+"/"+name, function(req, res){
      console.log(name, " has joined room ", roomID);
      var currSessionID=req.session.id;
      var player=(players[currSessionID]==null) ? new Player(name,currSessionID,roomID) : players[currSessionID];
      player.inRoom=true;
      player.isMaster=false;
      rooms[roomID].addPlayer(player);
      res.render("room", {roomID: id, sessionID: currSessionID});
    });
  });
  socket.on("newRoom",function(data, callback){
    var uniqueID=validLinkID();
    callback(uniqueID);
    var name=data.masterName;
    app.get("/room"+uniqueID+"/"+name, function(req, res){
      console.log(name, " has created room ", roomID);
      var currSessionID=req.session.id;
      var newRoom=new Room(uniqueID, data.roomName, data.roomPass, data.numOfPlayers);
      var master=(players[currSessionID]==null) ? new Player(name,currSessionID, uniqueID) : players[currSessionID];
      master.inRoom=master.isMaster=true;
      newRoom.addPlayer(master);
      res.render("room", {roomID: uniqueID, sessionID: currSessionID});
    });
  });
});

Player=function(name, sessionID, roomID){
  this.name=name;
  this.inRoom=true;
  this.room=roomID;
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

//-----Game functionality

//Spade > Heart > Clover > Diamond
var deck=[];
const LOWEST_SUIT=1;
const HIGHEST_SUIT=4;
const LOWEST_RANK=2;
const HIGHEST_RANK=14;
const SUITS={1:"Diamond", 2:"Clover", 3:"Heart", 4:"Spade"};
const RANKS={11:"Jack", 12:"Queen", 13:"King", 14:"Ace"};
const SHUFFLE_METHOD={
  //BlackJack Shuffle
  1: function(){
    var shuffledDeck=[];
    var boolSwitch=true;
    var halfSize=deck.length/2;
    var halfDeck=deck.splice(0, halfSize);
    var otherHalfDeck=deck.splice(halfSize, deck.length);
    var consecutivePushes=1;
    var i=j=0;
    while(shuffledDeck.length<=52){
      consecutivePushes=Math.floor((Math.random() * 1) + 0);
      if(boolSwitch && (i+consecutivePushes)<=halfSize){
        shuffledDeck.push(halfDeck.splice(i,i+consecutivePushes+1));
        i+=consecutivePushes;
      }else{
        if(!boolSwitch && (j+consecutivePushes)<=halfSize){
          shuffledDeck.push(otherHalfDeck.splice(j,j+consecutivePushes+1));
          j+=consecutivePushes;
        }
      }
      boolSwitch=!boolSwitch;
    }
    return shuffledDeck;
  },
  //Strip Shuffle
  2: function(){
    var i=j=0;
    var shuffledDeck=deck.splice();
    while(deck.splice(i,j+1).length > deck.length*0.2){

    }
  }
}
initializeDeck=function(gameType){
  for(var i=LOWEST_RANK; i<=HIGHEST_RANK; i++){
    for(var j=LOWEST_SUIT; j<=HIGHEST_SUIT; j++){
      if(gameType==1)
        (i==HIGHEST_RANK) ? new Card(i,j,LOWEST_RANK) : new Card(i, j, j+1);
      else
        new Card(i,j);
    }
  }
}

Card = function(rank, suit, display){
  this.suit=suit;
  this.rank=rank;
  this.display = (display==null) ? rank : display;
  this.img=suit+"-"+display+".png";
  this.name=""+rank+":"+suit+"";
  deck.push(this);
}

shuffle=function(){
  var method=Math.floor((Math.random() * 10) + 1);

}

Start= function(gameType){
  initializeDeck(gameType);

}
