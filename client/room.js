var socket = io();
const ROOM=document.getElementById("roomID").innerHTML;
const SESSION=document.getElementById("sessionID").innerHTML;
socket.emit("obtainRoomData",ROOM,function(data){
  console.log("data received:",data);
});

function test(){
  console.log(ROOM);
  console.log(SESSION);
}
