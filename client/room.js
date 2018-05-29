var socket = io();
const SESSION=document.getElementById("sessionID").innerHTML;
const ROOM=document.getElementById("roomID").innerHTML;
const PLAYER_INFO={playerSession:SESSION, roomID: ROOM};
const LOG=document.getElementById("roomLog");
const HAND=document.getElementById("hand");
var selectedCards={};
var playerHand=[];
function assignCardSelection(element,card){
  element.onclick=function(e){
    card.selected=!card.selected;
    (card.selected)?selectedCards[card.display]=card:delete selectedCards[card.display];
  }
}
function obtainHand(hand){
  playerHand=hand;
  loadDeck(hand);
}
function loadDeck(hand){
  for(var c in hand){
    var cardElement=new Image();
    var card=hand[c];
    cardElement.src=card.src;
    cardElement.id=card.display;
    console.log(card.display);
    console.log("Ze card", card);
    console.log("ze element", cardElement);
    assignCardSelection(cardElement,card);
    HAND.appendChild(cardElement);
  }
}

function clearSubHand(){

}
function resetHand(hand){
  loadDeck(hand);
  clearSubHand();
}

function submitHand(hand){
  var dataObj={
    playerHand: hand,
    playerSession: SESSION,
    roomID: ROOM
  }
  socket.emit("submitHand", dataObj, function(data){
    var result=data.handResult;
    var playerHand=data.playerHand;
    switch(result){
      case 1:
        console.log("Incorrect hand. Match with current hand pile");
      case 2:
        console.log("Unauthorized modification to hand, reverting to original hand");
        resetHand(playerHand);
      case 3:
        console.log("Successfully submitted hand");
        break;
    }
  });
}

socket.emit("assignChannel", PLAYER_INFO);
socket.emit("getPlayerHand", PLAYER_INFO, function(data){
  obtainHand(data);
});
socket.on("distributeHand", function(data){
  obtainHand(data);
});
window.onload=function(){
  var addSubHandButton=document.getElementById("addSubHand");

  document.getElementById("submitHand").onclick=function(){

  }
}
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
