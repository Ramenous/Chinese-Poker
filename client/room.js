var socket = io();
const SESSION=document.getElementById("sessionID").innerHTML;
const ROOM=document.getElementById("roomID").innerHTML;
const PLAYER_INFO={playerSession:SESSION, roomID: ROOM};
const LOG=document.getElementById("roomLog");
const PILE=document.getElementById("pile");
const PLAYER_TURN=document.getElementById("playerTurn");
const SUB_HANDS=document.getElementById("subHandContainer");
const SELECTED_HAND=document.getElementById("selectedHand");
const MAIN_HAND=document.getElementById("playerHand");
const CARD_VIEW=document.getElementById("cardDisplay");
const MESSAGE=document.getElementById("messageContainer");
const MASTER=document.getElementById("master");
const PASS_TURN=document.getElementById("passTurn");
const PLAYER_DATA=document.getElementById("playerData");
const READY_BUTTON=document.getElementById("ready");
const CARD_WIDTH=69;
const CARD_HEIGHT=94;
const READY_TXT="Ready";
const CANCEL_TXT="Cancel";
const NOT_READY_TXT="Not Ready";
const ERRORS={
  1:"It is not your turn",
  2:"Incorrect amount of cards. The valid amount of cards for a valid hand is 1,3,4 & 5",
  3:"Unauthorized modification to hand, reverting to original hand",
  4:"Your hand is not high enough"
}
const SPACING=25;
var selectedCards={};
var selectedCardImgs={};
var subHands=[]
var playerHand=[];
function isSelected(card){
  return card.selected;
}
function extractLeftValue(element){
  return parseInt(element.style.left.split("px")[0]);
}
function shiftHand(hand, currPos){
  //var margin=(isSelected)?CARD_WIDTH+SPACING:SPACING;
  for(var i=(currPos==0)?0:currPos/SPACING; i<hand.length; i++){
    var card=hand[i];
    card.style.left=extractLeftValue(card)-SPACING+"px";
  }
}
function getPlayerElement(name){
  var players=PLAYER_DATA.children;
  for(var p in players){
    var player=players[p];
    if (player.id==name) return player;
  }
}
function getChildById(parent, id){
  var children=parent.children;
  for(var c in children){
    var child=children[c];
    if(children[c].id==id) return child;
  }
}
function assignCardFunction(element,assignedCard){
  var card=assignedCard;
  element.onclick=function(){
    card.selected=!card.selected;
    var elLeft=extractLeftValue(element);
    if(isSelected(card)){
      selectedCards[card.display]=card;
      selectedCardImgs[card.display]=element;
      element.style.left=(SELECTED_HAND.children.length*(CARD_WIDTH+SPACING))+"px";
      MAIN_HAND.removeChild(element);
      SELECTED_HAND.appendChild(element);
      element.className="selectedCard";
      shiftHand(MAIN_HAND.children,elLeft);
    }else{
      delete selectedCards[card.display];
      delete selectedCardImgs[card.display];
      element.style.left=(MAIN_HAND.children.length*SPACING)+"px";
      SELECTED_HAND.removeChild(element);
      MAIN_HAND.appendChild(element);
      element.className="handCard";
    }
  }
  var view=CARD_VIEW;
  element.onmouseover=function(){
    view.src=element.src;
  }
  element.onmouseout=function(){
    view.src="/client/img/back.png";
  }
}
function obtainHand(hand){
  playerHand=hand;
  loadHand(hand);
}
function addWinner(data){
  var winMsg="winner#"+data.number+": "+data.name;
  var el=document.createElement("DIV");
  var t=document.createTextNode(winMsg);
  el.appendChild(t);
  document.getElementById("winners").appendChild(el);
}
function loadHand(hand){
  var leftPos=0;
//  var containerSize=CARD_WIDTH;
  for(var c in hand){
    var cardElement=new Image();
    var cardContainer= document.createElement("DIV");
    var card=hand[c];
    cardElement.src=card.src;
    cardElement.id=card.display;
    cardElement.className="handCard";
    cardElement.style.left=leftPos+"px";
    leftPos+=SPACING;
    assignCardFunction(cardElement,card);
    containerSize+=SPACING;
    MAIN_HAND.appendChild(cardElement);
  }
//  MAIN_HAND.style.width=containerSize+"px";
  MAIN_HAND.style.height=CARD_HEIGHT+2;
}
function loadPile(hand){
  var leftPos=0;
  var containerSize=0;
  for(var c in hand){
    var cardElement=new Image();
    var cardContainer= document.createElement("DIV");
    var card=hand[c];
    cardElement.src=card.src;
    cardElement.id=card.display;
    cardElement.className="handCard";
    cardElement.style.left=leftPos+"px";
    PILE.appendChild(cardElement);
  }
}
function updateHand(hand){
  var cards=MAIN_HAND.children;
  for(var card in selectedCards){
    var cardDisplay=selectedCards[card].display;
    for(var j=0; j<cards.length; j++){
      var selectedCard=cards[j];
      if(selectedCard.id==cardDisplay) {
        MAIN_HAND.removeChild(cards[j]);
      }
    }
  }
  selectedCards={};
}
function createInfoElement(name, innerHTML, type){
  var el=document.createElement("DIV");
  el.innerHTML=type.charAt(0).toUpperCase() + type.slice(1)+": "+innerHTML;
  el.className=type;
  el.id=name+"-"+type;
  return el;
}
function populatePlayerInfo(parent, player){
  var children=parent.children;
  var name=player.name;
  parent.name=name;
  var cards=player.hand.length;
  var status=player.isReady;
  var info={
    0:"name: "+player.name,
    1:"cards: "+player.hand.length,
    2: "Ready"
  }
  for(var i=0;i<children.length;i++){
    var child=children[i];
    child.className="info";
    child.innerHTML+=info[i];
    if(i==2){
      if(player.isReady){
        child.style.textDecoration="none";
        child.style.color="green";
      }else{
        child.style.textDecoration="line-through";
        child.style.color="red";
      }
    }
  }
}
function addPlayer(player){
  var players=PLAYER_DATA.children;
  for(var p in players){
    var playerBlock=players[p];
    if(playerBlock.name==null){
      populatePlayerInfo(playerBlock,player);
      playerBlock.hidden=false;
      return;
    }
  }
}
function loadPlayers(players){
  for(var p in players){
    var player=players[p];
    addPlayer(player);
  }
}
function clearHand(){
  var cards=MAIN_HAND.childNodes;
  for(var i=0; i<cards.length; i++){
    MAIN_HAND.removeChild(cards[i]);
  }
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
function leaveRoom(){
  socket.emit("leaveRoom", PLAYER_INFO, function(data){
    if(data!=null){
      var players=PLAYER_DATA.children;
      for(var p in players){
        var player=players[p];
        if (player.id==data.player){
          players.removeChild(player);
        }
        if (player.id==data.master){
          MASTER.innerHTML="Master: "+data.playerName;
        }
      }
    }
  });
  window.location.href="/";
}
function passTurn(){
  socket.emit("passTurn", PLAYER_INFO,function(data){
    if(data) displayMsg();
  });
}
function readyPlayer(){
  socket.emit("readyPlayer", PLAYER_INFO, function(data){
    READY_BUTTON.innerHTML=(data)?"Cancel":"Ready";
  });
}
function sendPlayerMessage(){
  var input=document.getElementById("playerInput");
  PLAYER_INFO.msg=input.value;
  socket.emit("submitPlayerMsg",PLAYER_INFO, function(){
    input.value="";
  });
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
    socket.emit("submitHand", dataObj, function(data){
      var result=data.handResult;
      var playerHand=data.playerHand;
      switch(result){
        case 0:
          selectedCards={};
          selectedCardImgs={};
          SELECTED_HAND.innerHTML="";
          break;
        case 1:
          displayMsg("It is not your turn!");
          break;
        case 2:
          displayMsg("Incorrect amount of cards! The valid amount of cards for a hand are");
          break;
        case 3:
          displayMsg("Unauthorized modification to hand, reverting to original hand");
          resetHand(playerHand);
          break;
        case 4:
          displayMsg("Your hand is not high enough rank");
          updateHand();
          break;
        case 5:
          displayMsg("Incorrect amount of cards played. Must match current submitted hand length");
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
  loadPile(data);
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
  var name=data.player;
  var playerEl=getPlayerElement(name);
  var statusEl=getChildById(playerEl, name+"-status");
  if(data.status){
    playerEl.style.border="2px solid green";
    statusEl.innerHTML=READY_TXT;
    statusEl.style.color="green";
  }else{
    playerEl.style.border="2px solid red";
    statusEl.innerHTML="Not Ready";
    statusEl.style.color="red";
  };
});
socket.on("distributeHand", function(data){
  obtainHand(data);
});
socket.on("updatePile", function(data){
  loadPile(data);
});
socket.on("updateTurn", function(data){
  PLAYER_TURN.innerHTML="Player Turn: "+data;
});
socket.on("updateWinner", function(data){
  addWinner(data);
});
socket.on("startGame", function(){
  READY_BUTTON.hidden=true;
  READY_BUTTON.innerHTML=READY_TXT;
});
socket.on("endGame", function(){
  READY_BUTTON.hidden=false;
});
socket.on("updatePlayers", function(data){
  addPlayer(data);
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
  document.getElementById("sendMsg").onclick=function(){
    sendPlayerMessage();
  }
}
socket.on("updateLog", function(data){
  for(var roomEvent in data){
    var logData=data[roomEvent];
    var span = document.createElement("SPAN");
    var lineBreak = document.createElement("BR");
    if(logData.isRoomEvent) span.className="roomEvents";
    var t = document.createTextNode(logData.logMsg);
    span.appendChild(t);
    span.appendChild(lineBreak);
    LOG.appendChild(span);
  }
});
