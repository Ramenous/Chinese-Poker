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

function createRoomElement(roomInfo){
  console.log("data:",roomInfo);
  var roomName=document.createElement("SPAN");
  var roomNumber=document.createElement("SPAN");
  var roomPlayers=document.createElement("SPAN");
  var roomIcon=new Image();
  roomName.className="roomInfo";
  roomName.id="roomNameInfo";
  roomNumber.className="roomInfo";
  roomNumber.id="roomNumberInfo";
  roomPlayers.className="roomInfo";
  roomPlayers.id="roomPlayersInfo";
  roomIcon.className="roomIcon";
  roomIcon.src="/client/img/suit-"+(Math.floor(Math.random()*4)+1)+".png";
  roomName.innerHTML=roomInfo.name;
  roomNumber.innerHTML=roomInfo.id;
  roomPlayers.innerHTML=roomInfo.players.length+"/"+roomInfo.maxPlayers;
  var room=document.createElement("DIV");
  room.className="room";
  room.appendChild(roomIcon);
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
  document.getElementById("joinRoom").onclick=function(){

  }
  console.log("helloi");
  socket.emit("obtainRooms",{},function (data){
    console.log("emittance");
    for(var room in data){
      console.log("obtaining");
      createRoomElement(data[room]);
    }
  });
}
