var socket = io();
const SESSION=document.getElementById("sessionID").innerHTML;
const ROOM=document.getElementById("roomID").innerHTML;
const PLAYER_INFO={playerSession:SESSION, roomID: ROOM};
const LOG=document.getElementById("roomLog");
const HAND=document.getElementById("hand");
var selectedCards={};
function assignCardSelection(element,card){
    element.onclick=function(e){
      card.selected=!card.selected;
      (card.selected)?selectedCards[card.name]=card:delete selectedCards[card.name];
  }
}
function loadDeck(hand){
  for(var c in hand){
    var cardElement=new Image();
    var card=hand[c];
    cardElement.src=card.src;
    cardElement.id=card.name;
    console.log(card.name);
    console.log("Ze card", card);
    console.log("ze element", cardElement);
    assignCardSelection(cardElement,card);
    HAND.appendChild(cardElement);
  }
}
console.log(PLAYER_INFO);
socket.emit("assignChannel", PLAYER_INFO);
socket.emit("getPlayerHand", PLAYER_INFO, function(data){
  hand=data;
  loadDeck(hand);
  console.log("PlayerHand:",data);
});
socket.on("distributeHand", function(data){
  hand=data;
  loadDeck(hand);
  console.log("PLAYERHAND", data);
});
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
