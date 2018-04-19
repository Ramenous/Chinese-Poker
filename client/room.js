var socket = io();
const ROOM=document.getElementById("roomID").innerHTML;
socket.on("roomTest", function(data){
  alert(data);
});

socket.on("setRoom", function(data){
  console.log("setting room...");
  ROOM=data;
});

socket.emit("reqqq");

function setData(master){
  console.log("mastah",master);
}

function setRoom(roomID){

}

function test(){
  console.log(ROOM);
}
