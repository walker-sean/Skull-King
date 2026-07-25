import type { RejectionEvent } from "@skull-king/shared";

export const REJECTION_MESSAGES: Record<RejectionEvent["reason"], string> = {
  RoomNotFound: "No Room exists with that code.",
  NameTaken: "That name is already taken in this Room.",
  RoomNotInLobby: "This Room has already started.",
  InvalidName: "Please enter a name.",
  AlreadyConnected: "That Player is already connected in this Room.",
  TooFewPlayers: "Need at least 3 Players to start.",
  TooManyPlayers: "At most 8 Players can play at once.",
  NotHost: "Only the Host can start the Game.",
  RoomNotActive: "The Round isn't active yet.",
  PlayerNotFound: "You're not recognized as a Player in this Room.",
  AlreadyBid: "You've already submitted your Bid for this Round.",
  InvalidBid: "That Bid isn't valid for your hand size.",
  BiddingIncomplete: "Everyone needs to Bid before play can begin.",
  NotYourTurn: "It's not your turn to play a card.",
  CardNotInHand: "That card isn't in your hand.",
  MustFollowSuit: "You must follow the led Suit if you can.",
  InvalidTigressDeclaration: "Declare the Tigress as a Pirate or an Escape before playing it.",
};
