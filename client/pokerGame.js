//Spade > Heart > Clover > Diamond
const MIN_SUIT_VALUE=1;
const MAX_SUIT_VALUE=4;
const MIN_RANK_VALUE=1;
const MAX_RANK_VALUE=13;
const JACK="J";
const QUEEN="Q";
const KING="K";
const ACE="A";
const SPADE="spade";
const HEART="heart";
const CLUB="club";
const DIAMOND="diamond";
const CHINESE_POKER_RANK_VAL={
  1:3,2:4,3:5,4:6,5:7,6:8,7:9,
  8:10,9:JACK,10:QUEEN,11:KING,12:ACE,13:2
}
const CHINESE_POKER_SUIT_VAL={
  1:DIAMOND,2:CLUB,3:HEART,4:SPADE
}
const GAME_TYPE={
  1:{valueRank:CHINESE_POKER_RANK_VAL, valueSuit:CHINESE_POKER_SUIT_VAL}
};
const CARD_WIDTH=69;
const CARD_HEIGHT=94;
const IMG_DIR="/client/img/";
const IMG_EXT=".png";
//Hand Names
var ROYAL_FLUSH="RoyalFlush";
var STRAIGHT_FLUSH="StraightFlush";
var FOUR_KIND="FourOfAKind";
var FULL_HOUSE="FullHouse";
var FLUSH="Flush";
var STRAIGHT="Straight";
var TRIPLE="Triple";
var PAIR="Pair";
var HIGH_CARD="HighCard";
//Hand Rankings
const ROYAL_FLUSH_RANK=9;
const STR8_FLUSH_RANK=8;
const FOUR_KIND_RANK=7;
const FULL_HOUSE_RANK=6;
const FLUSH_RANK=5;
const STRAIGHT_RANK=4;
const TRIPLE_RANK=3;
const PAIR_RANK=2;
const HIGH_CARD_RANK=1;

const RANK="rank";
const SUIT="suit";
const HAND_RANKING={
  RoyalFlush: function(hand){
    return (hasSameCardAmount(hand, SUIT, 5) &&
    isConsecutive(hand,true)&& hand.length==5)?ROYAL_FLUSH_RANK:-1;
  },
  StraightFlush: function(hand){
    return (hasSameCardAmount(hand, SUIT, 5) && isConsecutive(hand)&&
     hand.length==5)?STR8STR8_FLUSH_RANK:-1;
  },
  FourOfAKind: function(hand){
    return hasSameCardAmount(hand,RANK, 4)&& hand.length==5 ?FOUR_KIND_RANK:-1;
  },
  FullHouse: function(hand){
    return hasSameCardAmount(hand, RANK, 3) &&
    hasSameCardAmount(hand, RANK, 2) && hand.length==5?FULL_HOUSE_RANK:-1;
  },
  Flush:function(hand){
    return hasSameCardAmount(hand, SUIT,5)&& hand.length==5?FLUSH_RANK:-1;
  },
  Straight: function(hand){
    return (isConsecutive(hand) && hand.length==5)?STRAIGHT_RANK:-1;
  },
  Triple: function(hand){
    return (hasSameCardAmount(hand, RANK, 3) && hand.length==3)?TRIPLE_RANK:-1;
  },
  Pair: function(hand){
    return (hasSameCardAmount(hand, RANK, 2) && hand.length==2)?PAIR_RANK:-1;
  },
  HighCard: function(hand){
    return (hand.length==1)?hand[0].rankValue:-1;
  }
};
const SHUFFLE_METHOD={
  //Ripple Shuffle
  1: function rippleShuffle(shuffledDeck, deck, boolSwitch){
    if(shuffledDeck.length==52){
      return shuffledDeck;
    }else{
      var cardAmt=Math.floor(Math.random()*2)+1;
      var cardMarker=(boolSwitch) ? deck.length/2 : 0;
      shuffledDeck=shuffledDeck.concat(deck.splice(cardMarker, cardAmt));
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
      var start=Math.floor((Math.random() * 5) + (len * 0.05));
      var amt=Math.floor((Math.random() * 5) + (len * 0.8));
      var strippedDeck=deck.splice(start,amt);
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

function getCardDataAmount(hand, dataType){
  var cardCounter={};
  for(var i=0; i<hand.length; i++){
    var key;
    switch(dataType){
      case RANK:
        key=hand[i].rankValue;
        break;
      case SUIT:
        key=hand[i].suitValue;
        break;
    }
    (cardCounter[key]==null) ? cardCounter[key]=1 : cardCounter[key]++;
  }
  return cardCounter;
}

function getCardAmountRank(hand, amount){
  var cardCounter=getCardDataAmount(hand,RANK);
  for(var cardRankVal in cardCounter){
    var cardAmount=cardCounter[cardRankVal];
    if(cardAmount===amount)
      return cardRankVal;
  }
  return 0;
}

function hasSameCardAmount(hand, dataType, amount){
  var cardCounter=getCardDataAmount(hand,dataType);
  console.log("counter", cardCounter);
  for(var cardRank in cardCounter){
    if(cardCounter[cardRank]===amount) return true;
  }
  return false;
}

function isConsecutive(hand, isRoyalty){
  var sortedHand=hand.slice(0, hand.length);
  sortedHand.sort(function(a, b){return a.rankValue-b.rankValue});
  var len=sortedHand.length-1;
  for(var i=0; i<len; i++){
    if((sortedHand[i].rankValue+1)!=sortedHand[i+1].rankValue) return false;
  }
  if(isRoyalty){
    return (sortedHand[0].rank==10 && sortedHand[len].rank==ACE)?true:false;
  }
  return true;
}

function getHighestValue(hand, type, returnCardObj){
  var highestValue=0;
  var highestCard;
  for(var c in hand){
    var card=hand[c];
    switch(type){
      case RANK:
        if(card.rankValue>highestValue){
          highestValue=card.rankValue;
          highestCard=card;
        }
        break;
      case SUIT:
        if(card.suitValue>highestValue){
          highestValue=card.suitValue;
          highestCard=card;
        }
        break;
    }
  }
  return (returnCardObj)?highestCard:highestValue;
}

function getHandRanking(hand){
  for(var r in HAND_RANKING){
    var rankingFunc=HAND_RANKING[r];
    var rank=rankingFunc(hand);
    if(rank>0) return rank;
  }
  return 0;
}


function distributeCards(deck, players,numOfPlayers){
  var cards=deck.cards;
  var amount=(numOfPlayers==2)?cards.length/2:cards.length;
  for(var i=0; i<amount; i++){
    players[i%numOfPlayers].addCard(cards[i]);
  }
}

function isHighestCard(hand){
  return hand[0].rankValue==MAX_RANK_VALUE && hand[0].suitValue==MAX_SUIT_VALUE;
}

function compareHand(hand1, hand2){
  var hand1Rank=getHandRanking(hand1);
  var hand2Rank=getHandRanking(hand2);
  console.log("ranks",hand1Rank, hand2Rank);
  if(hand1Rank===hand2Rank && hand1.length>1 && hand2.length>1){
    switch(hand1Rank){
      case ROYAL_FLUSH_RANK:
        return hand1[0].suitValue - hand2[0].suitValue;
        break;
      case STR8_FLUSH_RANK:
        var result=getHighestValue(hand1, RANK) - getHighestValue(hand2, RANK);
        return (result!=0)? result:hand1[0].suitValue - hand2[0].suitValue;
        break;
      case FOUR_KIND_RANK:
        return getCardAmountRank(hand1, 4) - getCardAmountRank(hand1, 4);
        break;
      case FULL_HOUSE_RANK:
        return getCardAmountRank(hand1, 3) - getCardAmountRank(hand1, 3);
        break;
      case FLUSH_RANK:
        var result=hand1[0].suitValue - hand2[0].suitValue;
        return (result!=0)? result : getHighestValue(hand1, RANK) - getHighestValue(hand2, RANK);
        break;
      case STRAIGHT_RANK:
        var hand1HighCard=getHighestValue(hand1, RANK, true);
        var hand2HighCard=getHighestValue(hand2, RANK, true);
        var result=hand1HighCard.rankValue-hand2HighCard.rankValue;
        return (result!=0)?result: hand1HighCard.suitValue-hand2HighCard.suitValue;
        break;
      case TRIPLE_RANK:
        return getHighestValue(hand1, RANK) - getHighestValue(hand2, RANK);
        break;
      case PAIR_RANK:
        var result=getHighestValue(hand1, RANK) - getHighestValue(hand2, RANK);
        return (result!=0)?result: getHighestValue(hand1, SUIT) - getHighestValue(hand2, SUIT);
        break;
    }
  }
  return (hand1Rank===hand2Rank)?hand1[0].suitValue-hand2[0].suitValue:hand1Rank - hand2Rank;
}

Deck = function(){
  this.cards=[];
  this.add=function(card){
    this.cards.push(card);
  }
}

initializeDeck = function(gameType){
  var deck = new Deck();
  var gameMapObj=GAME_TYPE[gameType];
  var rankMap=gameMapObj.valueRank;
  var suitMap=gameMapObj.valueSuit;
  for(var i=MIN_RANK_VALUE; i<=MAX_RANK_VALUE; i++){
    for(var j=MIN_SUIT_VALUE; j<=MAX_SUIT_VALUE; j++){
      var card= new Card(rankMap[i], suitMap[j],i,j);
      deck.add(card);
    }
  }
  return deck;
}

Card = function(rank, suit, rankValue, suitValue){
  this.suit=suit;
  this.rank=rank;
  this.rankValue=rankValue;
  this.suitValue=suitValue;
  this.display = rank+"-"+suit;
  this.width=CARD_WIDTH;
  this.height=CARD_HEIGHT;
  this.selected=false;
  this.src=IMG_DIR+this.display+IMG_EXT;
}

module.exports={
  initializeDeck: initializeDeck,
  shuffleDeck: shuffleDeck,
  distributeCards: distributeCards,
  compareHand: compareHand,
  isHighestCard: isHighestCard
};
