var socket = io();
const SESSION=document.getElementById("sessionID").innerHTML;
const ROOM=document.getElementById("roomID").innerHTML;
const PLAYER_INFO={playerSession:SESSION, roomID: ROOM};
const LOG=document.getElementById("roomLog");
const HAND=document.getElementById("playerHand");
const PILE=document.getElementById("pile");
const PLAYER_TURN=document.getElementById("playerTurn");
const SUB_HANDS=document.getElementById("subHandContainer");
const SELECTED_HAND=document.getElementById("selectedHand");
const MAIN_HAND=document.getElementById("playerHand");
const SELECTED_VIEW=document.getElementById("selectedCardView");
const MAIN_VIEW=document.getElementById("mainHandView");
//Hand Display Start Position
const HDSP=77;
const SPACING=15;
var selectedCards={};
var selectedCardImg={};
var subHands=[]
var playerHand=[];
function isSelected(card){
  return card.selected;
}
function extractLeftValue(element){
  return parseInt(element.style.left.split("px")[0]);
}
function shiftHand(hand, currPos){
  for(var i=(currPos==HDSP)?0:(currPos-HDSP)/15; i<hand.length; i++){
    var card=hand[i];
    card.style.left=extractLeftValue(card)-SPACING+"px";
  }
}
function assignCardView(card,element, isMouseOver){
  var view=(isSelected(card))?SELECTED_VIEW:MAIN_VIEW;
  var src=element.src;
  if(isMouseOver){
    view.style.display="initial";
    view.src=src;
  }else{
    view.style.display="none";
    view.src="";
  }
}
function assignCardFunction(element,assignedCard, currPos){
  var card=assignedCard;
  element.onclick=function(){
    card.selected=!card.selected;
    var elLeft=extractLeftValue(element);
    if(isSelected(card)){
      selectedCards[card.display]=card;
      selectedCardImg[card.display]=element;
      element.style.left=(SELECTED_HAND.children.length*SPACING)+HDSP+"px";
      MAIN_HAND.removeChild(element);
      SELECTED_HAND.appendChild(element);
      shiftHand(MAIN_HAND.children,elLeft);
      MAIN_VIEW.style.display="none";
    }else{
      delete selectedCards[card.display];
      delete selectedCardImg[card.display];
      element.style.left=(MAIN_HAND.children.length*SPACING)+HDSP+"px";
      SELECTED_HAND.removeChild(element);
      MAIN_HAND.appendChild(element);
      SELECTED_VIEW.style.display="none";
      shiftHand(SELECTED_HAND.children,elLeft);
    }
  }
  element.onmouseover=function(){
    assignCardView(card,element, true);
  }
  element.onmouseout=function(){
    assignCardView(card,element, false);
  }
}
function obtainHand(hand){
  playerHand=hand;
  loadHand(hand);
}
function loadHand(hand, forPile){
  var leftPos=HDSP;
  for(var i=0; i<hand.length; i++){
    var cardElement=new Image();
    var cardContainer= document.createElement("DIV");
    var card=hand[i];
    cardElement.src=card.src;
    cardElement.id=card.display;
    cardElement.className="handCard";
    cardElement.style.left=leftPos+"px";
    leftPos+=SPACING;
    if(forPile==null){
      assignCardFunction(cardElement,card, i);
      console.log("adding card");
      HAND.appendChild(cardElement);
    }else{
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
  console.log("data",data);
  obtainHand(data);
});
socket.emit("getPile", ROOM, function(data){
  loadHand(data,true);
});
socket.emit("getTurn", ROOM, function(data){
  console.log(data);
  PLAYER_TURN.innerHTML="Player turn: "+data;
});
socket.on("distributeHand", function(data){
  console.log("Distributing", data);
  obtainHand(data);
});
socket.on("updatePile", function(data){
  console.log("updating pile");
  loadHand(data, true);
});
socket.on("updateTurn", function(data){
  PLAYER_TURN.innerHTML="Player Turn: "+data;
});
window.onload=function(){
  document.getElementById("submitHand").onclick=function(){
    submitHand(Object.values(selectedCards));
  }
}
socket.on("updateLog", function(data){
  for(var roomEvent in data){
    var logData=data[roomEvent];
    console.log("data", data);
    var span = document.createElement("SPAN");
    var lineBreak = document.createElement("BR");
    if(logData.isRoomEvent) span.className="roomEvents";
    var t = document.createTextNode(logData.logMsg);
    span.appendChild(t);
    span.appendChild(lineBreak);
    LOG.appendChild(span);
  }
});
