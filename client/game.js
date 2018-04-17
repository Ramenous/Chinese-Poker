var socket = io();
var name, rooms;
var roomNames=[
  "Let's play!",
];
socket.emit("roast");
console.log("hi");

createNewRoom=function(){
  if(name==null)promptName();
  maxPlayers=prompt("enter the amount of players (1-4)");
  const id=Math.floor((Math.random() * 999999) + 111111);
  window.location.href = '/newpage';
  socket.emit("newRoom", {roomName:"x",masterName:name, roomId:id, max:maxPlayers});
}

window.onload=function(){
  var roomPrompt=document.getElementById("prompt");
  document.getElementById("chooseName").onclick=promptName=function(){
    name=prompt("Enter your desired name");
  }
  document.getElementById("newRoom").onclick=function(){
    roomPrompt.style.display="initial";
  }
  document.getElementById("createRoom").onclick=function(){
    var roomName=document.getElementById("roomName");
    var roomPass=document.getElementById("roomPass");
    var numOfPlayers=document.getElementById("numOfPlayers");
  }
  document.getElementById("cancelRoom").onclick=function(){
    roomPrompt.style.display="none";
  }
  socket.on("roomUpdate",function (data){
    for(var id in data){
      var node = document.createElement("LI");
      var roomName = document.createTextNode(data[id].name);
      node.appendChild(roomName);
      document.getElementById("roomList").appendChild(node);
    }
  });
}
