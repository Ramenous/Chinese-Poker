
//Spade > Heart > Clover > Diamond
const LOWEST_SUIT=1;
const HIGHEST_SUIT=4;
const LOWEST_RANK=2;
const HIGHEST_RANK=14;
const CARD_WIDTH=71;
const CARD_HEIGHT=96;
const SUITS={1:"Diamond", 2:"Clover", 3:"Heart", 4:"Spade"};
const RANKS={11:"Jack", 12:"Queen", 13:"King", 14:"Ace"};
const CARD_SPACING=1;
const RANKING={
  "RoyalFlush": function(hand){
    return sameCardAmount(hand, 5, false) && isConsecutive(hand, 10, 15);
  },
  "StraightFlush": function(hand){
    return sameCardAmount(hand, 5, false) && isConsecutive(hand);
  },
  "FourOfAKind": function(hand){
    return sameCardAmount(hand, 4, true);
  },
  "FullHouse": function(hand){
    return sameCardAmount(hand, 3, true, true) && sameCardAmount(hand, 2, true, true);
  },
  "Flush":function(hand){
    return sameCardAmount(hand, 5, false);
  },
  "Straight": function(hand){
    return isConsecutive(hand);
  },
  "Triple": function(hand){
    return sameCardAmount(hand, 3, true);
  },
  "Pair": function(){
    return sameCardAmount(hand, 2, true);
  }
};
const HIERARCHY={
  9:"RoyalFlush",
  8:"StraightFlush",
  7:"FourOfAKind",
  6:"FullHouse",
  5:"Flush",
  4:"Straight",
  3:"Triple",
  2:"Pair",
  1:"HighCard",
};
const CARDS=new Image();
const SHUFFLE_METHOD={
  //Ripple Shuffle
  1: function rippleShuffle(shuffledDeck, deck, boolSwitch){
    if(shuffledDeck.length==52){
      return shuffledDeck;
    }else{
      var consecutivePushes=Math.round(Math.random());
      var cardMarker=(boolSwitch) ? deck.length/2 : 0;
      shuffledDeck=shuffledDeck.concat(deck.splice(cardMarker, cardMarker+consecutivePushes+1));
      return rippleShuffle(shuffledDeck, deck, !boolSwitch);
    }
  },
  //Strip Shuffle
  2: function stripShuffle(shuffledDeck, deck, boolSwitch){
    if(shuffledDeck.length==52){
      return shuffledDeck;
    }else if(deck.length<= 52 * 0.15){
      shuffledDeck=shuffledDeck.concat(deck);
      return shuffledDeck;
    }else{
      var len=deck.length;
      var i=Math.floor((Math.random() * 5) + (len * 0.05));
      var j=Math.floor((Math.random() * 5) + (len * 0.8));
      var strippedDeck=deck.splice(i,j+1);
      shuffledDeck=shuffledDeck.concat(deck);
      return stripShuffle(shuffledDeck, strippedDeck);
    }
  },
  //Overhand Shuffle
  3: function overHandShuffle(shuffledDeck, deck, boolSwitch){
    if(deck.length<=7){
      shuffledDeck=shuffledDeck.concat(deck);
      return shuffledDeck;
    }else{
      var marker = deck.length-Math.floor((Math.random() * 6) + 3);
      var strippedDeck=deck.splice(marker,deck.length);
      shuffledDeck=shuffledDeck.concat(strippedDeck);
      return overHandShuffle(shuffledDeck,deck,boolSwitch);
    }
  }
};

function shuffleDeck(deck, amount, shuffleMethod){
  var timesShuffled=(amount==null) ? 1 : amount;
  for(var i=0; i<timesShuffled; i++){
    var method=(shuffleMethod==null) ? Math.floor((Math.random() * 3) + 1) : shuffleMethod;
    var shuffledDeck=[];
    shuffledDeck=SHUFFLE_METHOD[method](shuffledDeck, deck.cards, true);
    deck.cards=shuffledDeck;
  }
}

sameCardAmount=function(hand, amount, checkingRank, exact){
  var cardCounter={};
  for(var i=0; i<hand.length; i++){
    if(checkingRank){
      (cardCounter[hand[i].rank]==null) ? cardCounter[hand[i].rank]=1 : cardCounter[hand[i].rank]++;
    }else{
      (cardCounter[hand[i].suit]==null) ? cardCounter[hand[i].suit]=1 : cardCounter[hand[i].suit]++;
    }
  }
  for(var card in cardCounter){
    if(exact){
      if(cardCounter[card]==amount) return true;
    }else{
      if(cardCounter[card]>=amount) return true;
    }
  }
  return false;
}

isConsecutive=function(hand, start, end){
  var sortedHand=hand.slice(0, hand.length);
  sortedHand.sort(function(a, b){return a.rank-b.rank});
  var lowest=(start==null) ? 0 : start;
  var highest=(end==null) ? sortedHand.length : end;
  console.log(sortedHand);
  if(sortedHand[0].rank==lowest && sortedHand[sortedHand.length].rank==highest){
    for(var i=0; i<sortedHand.length-1; i++){
      if((sortedHand[i].rank+1)!=sortedHand[i+1].rank) return false;
    }
  }
  return true;
}

getHierarchyRank=function(ranking){
  for(var rank in HIERARCHY){
    if(ranking==HIERARCHY[rank])return rank;
  }
}

findHandRanking=function(hand, ranking){
  if(ranking==null) ranking=9;
  if(hand.length==2){
    return RANKING[HIERARCHY[2]](hand);
  }else if(hand.length==3){
    return RANKING[HIERARCHY[3]](hand);
  }else if(hand.length==5 && ranking>3){
    return (RANKING[HIERARCHY[ranking]](hand)) ? ranking : findHandRanking(hand, ranking--);
  }else{
    return 0;
  }
}

Deck = function(){
  this.cards=[];
  this.add=function(card){
    this.cards.push(card);
  }
  this.displayCards=function(){
    var ctx=document.getElementById("canvas").getContext('2d');
    var i=j=0;
    for(var card in this.cards){
      if(i%13==0 && i>0){
        i=0;
        j++;
      }
      var suit=this.cards[card].suit;
      var rank=this.cards[card].display;
      ctx.drawImage(CARDS, (rank-LOWEST_RANK)*CARD_WIDTH, (suit-LOWEST_SUIT)*CARD_HEIGHT, CARD_WIDTH, CARD_HEIGHT,
            i*CARD_WIDTH, j*CARD_HEIGHT, CARD_WIDTH, CARD_HEIGHT);
      i++;
    }
  }
}

initializeDeck=function(gameType){
  var deck = new Deck();
  for(var i=LOWEST_RANK; i<=HIGHEST_RANK; i++){
    for(var j=LOWEST_SUIT; j<=HIGHEST_SUIT; j++){
      var card;
      if(gameType==1)
        card=(i==HIGHEST_RANK) ? new Card(i,j,LOWEST_RANK) : new Card(i, j, i+1);
      else
        card=new Card(i,j);
      deck.add(card);
    }
  }
  return deck;
}

Card = function(rank, suit, display){
  this.suit=suit;
  this.rank=rank;
  this.display = (display==null) ? rank : display;
  this.width=CARD_WIDTH;
  this.height=CARD_HEIGHT;
  this.name=""+rank+":"+suit+"";
}

initialize=function(){
  CARDS.src="img/poker.png";
}

document.getElementById("shuffle").onclick=function(){
  shuffleDeck(deckMain, 1,3);
}
var pair=[new Card(5,3), new Card (5,2)];
var trip=[new Card(5,3), new Card (5,2), new Card(5,4)];
var deckMain;
Start= function(gameType, shuffled, amount){
  initialize();
  deckMain=initializeDeck(gameType);
  console.log(RANKING[HIERARCHY[3]](pair));
  console.log(RANKING[HIERARCHY[2]](trip));
  setInterval(function(){ deckMain.displayCards(); }, 2000);
}

Start(1,true,1);
