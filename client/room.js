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
const MESSAGE=document.getElementById("messageContainer");
const MASTER=document.getElementById("master");
const PASS_TURN=document.getElementById("passTurn");
const PLAYER_DATA=document.getElementById("playerData");
const READY_BUTTON=document.getElementById("ready");
const ERRORS={
  1:"It is not your turn",
  2:"Incorrect amount of cards. The valid amount of cards for a valid hand is 1,3,4 & 5",
  3:"Unauthorized modification to hand, reverting to original hand",
  4:"Your hand is not high enough"
}
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
function assignCardFunction(element,assignedCard){
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
function addWinner(data){
  var el=document.getElementById("DIV");
  el.innerHTML="winner#"+data.number+": "+data.name;
  document.getElementById("winners").appendChild(el);
}
function loadHand(hand, forPile){
  var leftPos=HDSP;
  for(var c in hand){
    var cardElement=new Image();
    var cardContainer= document.createElement("DIV");
    var card=hand[c];
    cardElement.src=card.src;
    cardElement.id=card.display;
    cardElement.className="handCard";
    cardElement.style.left=leftPos+"px";
    leftPos+=SPACING;
    if(forPile==null){
      assignCardFunction(cardElement,card);
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
      if(selectedCard.id==cardDisplay) {
        HAND.removeChild(cards[j]);
      }
    }
  }
  selectedCards={};
}
function loadPlayers(players){
  for(var p in players){
    var player=players[p];
    var tag=document.createElement("DIV");
    tag.className="players";
    tag.innerHTML="Name: "+player.name+" cards: "+player.hand.length;
    tag.value=player.name;
    PLAYER_DATA.appendChild(tag);
  }
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
function displayMsg(message){
  var messageBlock=document.getElementById("message");
  var container=document.getElementById("messageContainer");
  container.style.display="initial";
  messageBlock.innerHTML=message;
  document.getElementById("okButton").onclick=function(){
    container.style.display="none";
  }
}
function getPlayerElement(name){
  var players=PLAYER_DATA.children();
  for(var p in players){
    var player=players[p];
    if (player.value==name) return player;
  }
}
function leaveRoom(){
  socket.emit("leaveRoom", PLAYER_INFO, function(data){
    if(data!=null){
      var players=PLAYER_DATA.children();
      for(var p in players){
        var player=players[p];
        if (player.value==data.player){
          players.removeChild(player);
        }
        if (player.value==data.master){
          MASTER.innerHTML="Master: "+data.playerName;
        }
      }
    }
  });
  window.location.href="/";
}
function passTurn(){
  socket.emit("passTurn", PLAYER_INFO);
}
function readyPlayer(){
  socket.emit("readyPlayer", PLAYER_INFO);
}
function submitHand(hand){
  if(hand==null){
    displayMsg("You have not submitted any cards");
  }else{
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
        case 1:
          displayMsg("It is not your turn!");
          break;
        case 2:
          displayMsg("Incorrect amount of cards! The valid amount of cards for a hand are");
          break;
        case 3:
          console.log("Unauthorized modification to hand, reverting to original hand");
          resetHand(playerHand);
          break;
        case 4:
          console.log("Your hand is not high enough rank");
          updateHand();
          break;
      }
    });
  }
}

socket.emit("assignChannel", PLAYER_INFO);
socket.emit("getPlayerHand", PLAYER_INFO, function(data){
  obtainHand(data);
});
socket.emit("getPile", ROOM, function(data){
  loadHand(data,true);
});
socket.emit("getPlayers", ROOM, function(data){
  loadPlayers(data);
});
socket.emit("getTurn", ROOM, function(data){
  PLAYER_TURN.innerHTML="Player turn: "+data;
});
socket.emit("getMaster", ROOM,function(data){
  MASTER.innerHTML="Master: "+data;
});
socket.on("updateReadyStatus", function(data){
  var playerEl=getPlayerElement(data.player);
  if(data.status){
    playerEl.style.border="green";
    READY_BUTTON.innerHTML="Cancel";
  }else{
    playerEl.style.border="red";
    READY_BUTTON.innerHTML="Ready";
  };
});
socket.on("distributeHand", function(data){
  obtainHand(data);
});
socket.on("updatePile", function(data){
  loadHand(data, true);
});
socket.on("updateTurn", function(data){
  PLAYER_TURN.innerHTML="Player Turn: "+data;
});
socket.on("updateWinner", function(data){
  addWinner(data);
});
socket.on("startGame", function(){
  READY_BUTTON.disabled=true;
});
socket.on("endGame", function(){
  READY_BUTTON.disabled=false;
});
window.onload=function(){
  document.getElementById("submitHand").onclick=function(){
    submitHand(Object.values(selectedCards));
  }
  document.getElementById("leaveRoom").onclick=function(){
    leaveRoom();
  }
  document.getElementById("passTurn").onclick=function(){
    passTurn();
  }
  document.getElementById("ready").onclick=function(){
    readyPlayer();
  }
}
socket.on("updateLog", function(data){
  for(var roomEvent in data){
    var logData=data[roomEvent];
    //console.log("data", data);
    var span = document.createElement("SPAN");
    var lineBreak = document.createElement("BR");
    if(logData.isRoomEvent) span.className="roomEvents";
    var t = document.createTextNode(logData.logMsg);
    span.appendChild(t);
    span.appendChild(lineBreak);
    LOG.appendChild(span);
  }
});
