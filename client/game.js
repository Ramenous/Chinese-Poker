var socket = io();
var name, rooms;
var roomNames=[
  "Let's play!",
  "Poker time!",
];

chooseName=function(msg, namePrompt, roomPrompt, creatingRoom){
  var selectedName=document.getElementById("playerNameInput").value;
  console.log(selectedName=="");
  if(selectedName=="") {
    console.log("executed");
    msg.innerHTML="You have not chosen a name";
  }else{
    name=selectedName;
    namePrompt.style.display="none";
    console.log("iscreatinroom", creatingRoom);
    if(creatingRoom){
      roomPrompt.style.display="initial";
      creatingRoom=!creatingRoom;
    }
  }
}

displayNamePrompt=function(namePrompt, currentName){
  console.log("displaying name prompt...");
  namePrompt.style.display="initial";
  currentName.value=name;
}

window.onload=function(){
  var creatingRoom=false;
  var roomPrompt=document.getElementById("room");
  var namePrompt=document.getElementById("name");
  var nameMsg=document.getElementById("nameMsg");
  var roomMsg=document.getElementById("roomMsg");
  var currentName=document.getElementById("playerNameInput");
  document.getElementById("chooseName").onclick=function(){
    displayNamePrompt(namePrompt, currentName);
  }
  document.getElementById("selectName").onclick=function(){
    chooseName(nameMsg, namePrompt, roomPrompt,creatingRoom);
  }
  document.getElementById("newRoom").onclick=function(){
    creatingRoom=true;
    if(name==""){
      displayNamePrompt(namePrompt, currentName);
    }else{
      roomPrompt.style.display="initial";
    }
  }
  document.getElementById("cancelName").onclick=function(){
    if(creatingRoom && name==""){
      nameMsg.innerHTML="You have not chosen a name";
    }else{
        namePrompt.style.display="none";
    }
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
      console.log("This should be the unique ID:", data);
      window.location.href="/room"+data;
    });
    console.log(roomName.value, roomPass.value, numOfPlayers.value);
  }
  document.getElementById("cancelRoom").onclick=function(){
    roomPrompt.style.display="none";
  }
  socket.emit("obtainRooms",{lol:"i"},function (data){
    for(var room in data){
      var node = document.createElement("LI");
      var roomName = document.createTextNode(data[room].name);
      node.appendChild(roomName);
      var join = document.createElement("BUTTON");
      join.innerHTML="Join Room";
      join.onclick=function(){
        if(name==null)promptName();
        var dataObj={
          playerName:name,
          room: data[room].id
        }
        socket.emit("joinRoom", dataObj);
        window.location.href="/room"+data[room].id;
      }
      node.appendChild(join);
      document.getElementById("roomList").appendChild(node);
    }
  });
}
