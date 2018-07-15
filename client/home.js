var socket = io();
var name;
var rooms;
const PLAYER_DISCONNECTED=document.getElementById("disconnected").innerHTML;
const RECONNECT_BUTTON=document.getElementById("reconnectPlayer");
var roomNames=[
  "Let's play!",
  "Poker time!",
  "Do you have what it takes?",
  "Game on!",
  "Bring your pokerface!"
];
var selectedRoomID;
var selectedRoom;
function chooseName(msg, namePrompt){
  var selectedName=document.getElementById("playerNameInput").value;
  if(selectedName=="") {
    msg.innerHTML="You have not chosen a name";
  }else{
    name=selectedName;
    namePrompt.style.display="none";
  }
}

function getDefaultName(){
  socket.emit("getDefaultName",{}, function(data){
    name=data;
  });
}
getDefaultName();
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

function createRoomElement(roomInfo){
  var roomName=document.createElement("DIV");
  var roomNumber=document.createElement("DIV");
  var roomPlayers=document.createElement("DIV");
  roomName.className="roomInfo";
  roomName.id="roomNameInfo";
  roomNumber.className="roomInfo";
  roomNumber.id="roomNumberInfo";
  roomPlayers.className="roomInfo";
  roomPlayers.id="roomPlayersInfo";
  roomName.innerHTML=roomInfo.name;
  roomNumber.innerHTML=roomInfo.id;
  roomPlayers.innerHTML=roomInfo.players.length+"/"+roomInfo.maxPlayers;
  var room=document.createElement("DIV");
  room.className="room";
  room.onclick=function(){
    if(selectedRoom!=null){
      selectedRoom.style.backgroundColor="#4CAF50";
      selectedRoom.style.color="white";
    }
    selectedRoom=room;
    selectedRoomID=roomInfo.id;
    room.style.backgroundColor="#4CAF50";
    room.style.color="white";
  }
  room.appendChild(roomNumber);
  room.appendChild(roomName);
  room.appendChild(roomPlayers);
  document.getElementById("roomList").appendChild(room);
}

window.onload=function(){
  var roomPrompt=document.getElementById("room");
  var namePrompt=document.getElementById("name");
  var nameMsg=document.getElementById("nameMsg");
  var roomMsg=document.getElementById("roomMsg");
  var currentName=document.getElementById("playerNameInput");
  var roomNameInput=document.getElementById("roomNameInput");
  console.log(PLAYER_DISCONNECTED.innerHTML==true);
  if(PLAYER_DISCONNECTED.innerHTML){
    RECONNECT_BUTTON.hidden=false;
    RECONNECT_BUTTON.onclick=function(){
      var playerName=document.getElementById("playerName").innerHTML;
      var playerRoom=document.getElementById("roomID").innerHTML;
      window.location.href="/room"+playerRoom+"/"+playerName;
    }
  }
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
      roomNameInput.value=roomNames[Math.floor(Math.random()*roomNames.length)];
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
  var joinRoom=document.getElementById("joinRoom");
  joinRoom.onclick=function(){
    if(name==null){

    }else if(selectedRoomID==null){
      //prompt 'you have not selected a room'
    }else{
      var dataObj={
        playerName:name,
        roomID: selectedRoomID
      };
      joinRoom.disabled=true;
      this.innerHTML="Connecting...";
      socket.emit("joinRoom", dataObj, function(data){
        (!data.roomFull)?window.location.href="/room"+data.room+"/"+name:displayFullMsg();
      });
    }
  }
  socket.emit("obtainRooms",{},function (data){
    for(var room in data){
      createRoomElement(data[room]);
    }
  });
}
