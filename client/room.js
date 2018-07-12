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
var REMOVE_TXT=function(time){
  return "Removing in: "+time+"s";
};
const ERRORS={
  1:"It is not your turn",
  2:"Incorrect amount of cards. The valid amount of cards for a valid hand is 1,3,4 & 5",
  3:"Unauthorized modification to hand, reverting to original hand",
  4:"Your hand is not high enough"
}
const STATUS_COLOR={
  "Not Ready":"red",
  "Ready":"green",
  "Disconnected":"grey",
  "In game":"green"
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
    if (player.name==name) return player;
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
function createPlayerBlock(player, startedGame){
  var container=document.createElement("DIV");
  container.className="player";
  var name=player.name;
  container.name=name;
  var cards=player.cards;
  var status=player.status;
  var time=player.time;
  var info={
    "name": name,
    "cards":"cards: "+cards,
    "status":status,
    "time":(status==3)?REMOVE_TXT(time):""
  }
  var infoKeys=Object.keys(info);
  var infoVals=Object.values(info);
  for(var i=0;i<infoKeys.length;i++){
    var child=document.createElement("SPAN");
    child.className="info";
    child.id=name+infoKeys[i];
    child.innerHTML+=infoVals[i];
    if(i==2) child.style.color=STATUS_COLOR[status];
    container.appendChild(child);
  }
  PLAYER_DATA.appendChild(container);
  var players=PLAYER_DATA.children.length;
  var opponentNum=(players>0)?players-1:0;
  container.id=(player.sessionID==PLAYER_INFO.playerSession)
  ?"clientPlayer":"opponent"+opponentNum;
}
function modifyPlayerStatus(name, status){
  var playerEl=getPlayerElement(name);
  var statusEl=getChildById(playerEl, name+"status");
  statusEl.style.color=STATUS_COLOR[status];
  statusEl.innerHTML=status;
}
function updatePlayerTime(name, time){
  var playerEl=getPlayerElement(name);
  var timeEl=getChildById(playerEl, name+"time");
  timeEl.innerHTML=(time==null)?"":REMOVE_TXT(time);
}
function loadPlayers(players, startedGame){
  for(var p in players){
    var player=players[p];
    createPlayerBlock(player, startedGame);
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
    READY_BUTTON.innerHTML=(data==2)?"Cancel":"Ready";
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
  loadPlayers(data.players, data.startedGame);
});
socket.emit("connectPlayer", PLAYER_INFO);
socket.emit("getTurn", ROOM, function(data){
  PLAYER_TURN.innerHTML="Player turn: "+data;
});
socket.emit("getMaster", ROOM,function(data){
  MASTER.innerHTML="Master: "+data;
});
socket.on("updateReadyStatus", function(data){
  modifyPlayerStatus(data.name, data.status, data.startedGame);
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
  READY_BUTTON.disabled=true;
  READY_BUTTON.innerHTML=READY_TXT;
});
socket.on("endGame", function(){
  READY_BUTTON.hidden=false;
});
socket.on("addPlayer", function(data){
  createPlayerBlock(data.player, data.startedGame);
});
socket.on("updatePlayer", function(data){
  modifyPlayerStatus(data.name, data.status);
});
socket.on("removePlayer", function(data){
  var players=PLAYER_DATA.children;
  for(var p in players){
    var player=players[p];
    if(data==player.name) PLAYER_DATA.removeChild(player);
  }
});
socket.on("updatePlayerTimers", function(data){
  if(data.length>0){
    for(var p in data){
      var player=data[p];
      updatePlayerTime(player.name, player.time);
    }
  }
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
