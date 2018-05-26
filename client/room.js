var socket = io();
const SESSION=document.getElementById("sessionID").innerHTML;
const ROOM=document.getElementById("roomID").innerHTML;
const LOG=document.getElementById("roomLog");
var hand;
socket.on("startGame", function(data){
  hand=data;
  console.log("PlayerHand:",data);
});
setInterval(function(){
  socket.emit("getLog",{roomID:parseInt(ROOM)}, function(data){
    for(var roomEvent in data){
      var span = document.createElement("SPAN");
      var t = document.createTextNode(roomEvent);
      span.appendChild(t);
      LOG.appendChild(span);
    }
  });
}, 1000);
