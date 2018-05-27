var socket = io();
const SESSION=document.getElementById("sessionID").innerHTML;
const ROOM=document.getElementById("roomID").innerHTML;
const LOG=document.getElementById("roomLog");
var hand;
socket.on("startGame", function(data){
  hand=data.hand;
  console.log("PlayerHand:",hand);
});
socket.emit("assignChannel", {roomID: ROOM});
socket.on("updateLog", function(data){
  for(var roomEvent in data){
    var span = document.createElement("SPAN");
    var lineBreak = document.createElement("BR");
    var t = document.createTextNode(data[roomEvent]);
    span.appendChild(t);
    span.appendChild(lineBreak);
    LOG.appendChild(span);
  }
});
