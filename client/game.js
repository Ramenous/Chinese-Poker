var socket = io();
var name, rooms;
var roomNames=[
  "Let's play!",
  "Poker time!",
];

chooseName=function(msg, namePrompt){
  var selectedName=document.getElementById("playerNameInput").value;
  if(selectedName=="") {
    msg.innerHTML="You have not chosen a name";
  }else{
    name=selectedName;
    namePrompt.style.display="none";
  }
}

displayNamePrompt=function(namePrompt, currentName){
  namePrompt.style.display="initial";
  currentName.value=name;
}

window.onload=function(){
  var d1=[1,2,3,4,5,6,7,8,9,10];
  var d2=["a","b","c","d","e","f"];
  var dd=[];
  dd.push(d1.splice(d1.length/2,d1.length/2));
  alert(dd);
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
  }
  document.getElementById("cancelRoom").onclick=function(){
    roomPrompt.style.display="none";
  }
  socket.emit("obtainRooms",{},function (data){
    for(var room in data){
      var node = document.createElement("LI");
      var roomName = document.createTextNode(data[room].name);
      node.appendChild(roomName);
      var join = document.createElement("BUTTON");
      join.innerHTML="Join Room";
      join.onclick=function(){
        if(name==""){
          displayNamePrompt(namePrompt, currentName);
        }else{
          var dataObj={
            playerName:name,
            room: data[room].id
          }
          socket.emit("joinRoom", dataObj);
          window.location.href="/room"+data[room].id+"/"+name;
        }
      }
      node.appendChild(join);
      document.getElementById("roomList").appendChild(node);
    }
  });
}
