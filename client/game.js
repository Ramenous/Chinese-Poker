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
    if(name==null)promptName();
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
  socket.on("obtainRooms",function (data){
    for(var room in data){
      var node = document.createElement("LI");
      var roomName = document.createTextNode(room.name);
      node.appendChild(roomName);
      var join = document.createElement("BUTTON");
      join.innerHTML="Join Room";
      join.onclick=function(){
        if(name==null)promptName();
        var dataObj={
          playerName:name,
          room: room.id
        }
        socket.emit("joinRoom", dataObj);
        window.location.href="/room"+room.id;
      }
      document.getElementById("roomList").appendChild(node);

    }
  });
}
