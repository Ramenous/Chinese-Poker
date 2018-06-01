var socket = io();
var name, rooms;
var roomNames=[
  "Let's play!",
  "Poker time!",
  "Do you have what it takes?",
  "Game on!",
  "Bring your pokerface!"
];

function chooseName(msg, namePrompt){
  var selectedName=document.getElementById("playerNameInput").value;
  if(selectedName=="") {
    msg.innerHTML="You have not chosen a name";
  }else{
    name=selectedName;
    namePrompt.style.display="none";
  }
}

function displayNamePrompt(namePrompt, currentName){
  namePrompt.style.display="initial";
  currentName.value=name;
}

function displayFullMsg(){
  //todo: Make this into a prompt with room name and info;
  alert("room is full");
}

function assignJoinRoom(element, namePrompt,currentName, roomID){
  element.onclick=function(){
    if(name==""){
      displayNamePrompt(namePrompt, currentName);
    }else{
      var dataObj={
        playerName:name,
        roomID: roomID
      };
      socket.emit("joinRoom", dataObj, function(data){
        (!data.roomFull)?window.location.href="/room"+data.room+"/"+name:displayFullMsg();
      });
    }
  }
}

window.onload=function(){
  var roomPrompt=document.getElementById("room");
  var namePrompt=document.getElementById("name");
  var nameMsg=document.getElementById("nameMsg");
  var roomMsg=document.getElementById("roomMsg");
  var currentName=document.getElementById("playerNameInput");
  document.getElementById("chooseName").onclick=function(){
    displayNamePrompt(namePrompt, currentName);
  }
  document.getElementById("selectName").onclick=function(){
    chooseName(nameMsg, namePrompt);
  }
  document.getElementById("newRoom").onclick=function(){
    if(name==""){
      displayNamePrompt(namePrompt, currentName);
    }else{
      roomPrompt.style.display="initial";
    }
  }
  document.getElementById("cancelName").onclick=function(){
    namePrompt.style.display="none";
  }
  document.getElementById("createRoom").onclick=function(){
    var roomName=document.getElementById("roomNameInput");
    var roomPass=document.getElementById("roomPassInput");
    var numOfPlayers=document.getElementById("numOfPlayers");
    var dataObj={
      masterName:name,
      roomName:roomName.value,
      roomPass:roomPass.value,
      numOfPlayers:numOfPlayers.value
    };
    socket.emit("newRoom",dataObj,function(data){
      window.location.href="/room"+data+"/"+name;
    });
    roomPrompt.style.display="none";
  }
  document.getElementById("cancelRoom").onclick=function(){
    roomPrompt.style.display="none";
  }
  document.getElementById("joinRoom").onclick=function(){

  }
  socket.emit("obtainRooms",{},function (data){
    for(var room in data){
      var node = document.createElement("LI");
      var roomName = document.createTextNode(data[room].name);
      node.appendChild(roomName);
      var join = document.createElement("BUTTON");
      assignJoinRoom(join, namePrompt, currentName, data[room].id);
      node.appendChild(join);
      document.getElementById("roomList").appendChild(node);
    }
  });
}
