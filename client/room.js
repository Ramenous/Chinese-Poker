var socket = io();
const SESSION=document.getElementById("sessionID").innerHTML;
const ROOM=document.getElementById("roomID").innerHTML;
const PLAYER_INFO={playerSession:SESSION, roomID: ROOM};
const LOG=document.getElementById("roomLog");
const HAND=document.getElementById("hand");
const PILE=document.getElementById("pile");
const PLAYER_TURN=document.getElementById("playerTurn");
const SUB_HANDS=document.getElementById("subHandContainer");
var selectedCards={};
var subHands=[]
var playerHand=[];
function assignCardSelection(element,card){
  element.onclick=function(e){
    console.log("selected card: ", card.display);
    card.selected=!card.selected;
    (card.selected)?selectedCards[card.display]=card:delete selectedCards[card.display];
  }
}
function obtainHand(hand){
  playerHand=hand;
  loadHand(hand);
}
function loadHand(hand, forPile){
  for(var c in hand){
    var cardElement=new Image();
    var card=hand[c];
    cardElement.src=card.src;
    cardElement.id=card.display;
    if(forPile==null){
      assignCardSelection(cardElement,card);
      HAND.appendChild(cardElement);
    }else{
      console.log("Appending child:",hand);
      PILE.appendChild(cardElement);
    }
  }
}
function updateHand(hand){
  var cards=HAND.children;
  for(var card in selectedCards){
    var cardDisplay=selectedCards[card].display;
    for(var j=0; j<cards.length; j++){
      var selectedCard=cards[j];
      //console.log("Selected card: ", selectedCard.id, "Hand card: ",cardDisplay, "equal:",selectedCard.id==cardDisplay);
      if(selectedCard.id==cardDisplay) {
        console.log("Selected card: ", selectedCard.id, "Hand card: ",cardDisplay, "equal:",selectedCard.id==cardDisplay);
        HAND.removeChild(cards[j]);
      }
    }
  }
  selectedCards={};
}
function clearHand(){
  var cards=HAND.childNodes;
  console.log(cards[0]);
  for(var i=0; i<cards.length; i++){
    HAND.removeChild(cards[i]);
  }
}
function clearSubHand(){
  //functionality
}
function resetHand(hand){
  playerHand=hand;
  clearHand();
  loadHand(hand);
  clearSubHand();
}
/*
function addSubHand(){
  var handAmt=SUB_HANDS.children.length;
  var subHand=document.createElement("DIV");
  subHand.id="subHand-"+handAmt;
  var submitHand=document.createElement("BUTTON");
  submitHand.onclick=function(){
    var subHand=subHands[handAmt];
    if(subHand!=null) submitHand(subHands[handAmt]);
  }
  var addToSubHand=document.createElement("BUTTON");
  addToSubHand.onclick=function(){
    subHands[handAmt]=selectedCards;
    console.log("Added these cards ",subHands[handAmt]);
    selectedCards={};
  }
}
*/
function submitHand(hand){
  var dataObj={
    playerHand: hand,
    playerSession: SESSION,
    roomID: ROOM
  };
  console.log("submitting hand", hand);
  socket.emit("submitHand", dataObj, function(data){
    var result=data.handResult;
    var playerHand=data.playerHand;
    switch(result){
      case 0:
        console.log("Not your turn!");
        break;
      case 1:
        console.log("Incorrect amount of cards");
        break;
      case 2:
        console.log("Unauthorized modification to hand, reverting to original hand");
        resetHand(playerHand);
        break;
      case 3:
        console.log("Successfully submitted hand");
        updateHand();
        break;
      case 4:
        console.log("Invalid hand");
        break;
    }
  });
}

socket.emit("assignChannel", PLAYER_INFO);
socket.emit("getPlayerHand", PLAYER_INFO, function(data){
  obtainHand(data);
});
socket.emit("getPile", ROOM, function(data){
  loadHand(data,true);
});
socket.emit("getTurn", ROOM, function(data){
  PLAYER_TURN.innerHTML="Player turn: "+data;
});
socket.on("distributeHand", function(data){
  obtainHand(data);
});
socket.on("updatePile", function(data){
  console.log("updating pile");
  loadHand(data, true);
});
socket.on("updateTurn", function(data){
  PLAYER_TURN.innerHTML="It is "+data+"'s turn";
});
window.onload=function(){
  document.getElementById("submitHand").onclick=function(){
    submitHand(Object.values(selectedCards));
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
