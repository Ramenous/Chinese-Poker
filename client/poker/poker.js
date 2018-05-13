//Spade > Heart > Clover > Diamond
const LOWEST_SUIT=1;
const HIGHEST_SUIT=4;
const LOWEST_RANK=2;
const HIGHEST_RANK=14;
const SUITS={1:"Diamond", 2:"Clover", 3:"Heart", 4:"Spade"};
const RANKS={11:"Jack", 12:"Queen", 13:"King", 14:"Ace"};
const SHUFFLE_METHOD={
  //Ripple Shuffle
  1: function(deck){
    var shuffledDeck=[];
    var boolSwitch=true;
    var halfSize=deck.length/2;
    var halfDeck=deck.splice(0, halfSize);
    var otherHalfDeck=deck.splice(halfSize, deck.length);
    var consecutivePushes=1;
    var i=j=0;
    while(shuffledDeck.length<=52){
      consecutivePushes=Math.floor((Math.random() * 1) + 0);
      if(boolSwitch && (i+consecutivePushes)<=halfSize){
        shuffledDeck.push(halfDeck.splice(i,i+consecutivePushes+1));
        i+=consecutivePushes;
      }else{
        if(!boolSwitch && (j+consecutivePushes)<=halfSize){
          shuffledDeck.push(otherHalfDeck.splice(j,j+consecutivePushes+1));
          j+=consecutivePushes;
        }
      }
      boolSwitch=!boolSwitch;
    }
    return shuffledDeck;
  },
  //Strip Shuffle
  2: function(deck){
    var i=j=0;
    var len=deck.length;
    var iterations=Math.floor((Math.random() * 10) + 5);
    while(iterations>0){
      var i=Math.floor((Math.random() * len * 0.15) + len * 0.05);
      var j=Math.floor((Math.random() * len * 0.8) + len * 0.9);
      var strippedDeck=deck.splice(i,j+1);
      deck.push(strippedDeck);
      iterations--;
    }
    return deck;
  },
  //Hindu Shuffle
  3: function(deck){
    var shuffledDeck=[];
    var i = deck.length-Math.floor((Math.random() * 7) + 3);
    var strippedDeck=deck.splice(i,deck.length);
    while(strippedDeck.length>4){
      shuffledDeck.push(strippedDeck);
      i-=Math.floor((Math.random() * 7) + 3);
      if(i>=0) strippedDeck=deck.splice(i,deck.length);
    }
    shuffledDeck.push(strippedDeck);
    return shuffledDeck;
  }
}

Shuffle=function(deck, amount){
  var shuffledDeck=deck;
  var end=(amount==null) ? 1 : amount;
  for(var i=0; i<end; i++){
    var method=Math.floor((Math.random() * 4) + 1);
    shuffledDeck=SHUFFLE_METHOD[method](shuffledDeck);
  }
}

initializeDeck=function(gameType){
  var deck = new Deck();
  for(var i=LOWEST_RANK; i<=HIGHEST_RANK; i++){
    for(var j=LOWEST_SUIT; j<=HIGHEST_SUIT; j++){
      var card;
      if(gameType==1)
        card=(i==HIGHEST_RANK) ? new Card(i,j,LOWEST_RANK) : new Card(i, j, j+1);
      else
        card=new Card(i,j);
      deck.add(card);
    }
  }
  return deck;
}

Deck = function(){
  this.cards=[];
  this.add=function(card){
    this.cards.push(card);
  }
}

Card = function(rank, suit, display){
  this.suit=suit;
  this.rank=rank;
  this.display = (display==null) ? rank : display;
  this.img=suit+"-"+display+".png";
  this.name=""+rank+":"+suit+"";
  deck.push(this);
}

Start= function(gameType){
  var deck=initializeDeck(gameType);

}
