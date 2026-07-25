import type { RejectionEvent } from "@skull-king/shared";

export const REJECTION_MESSAGES: Record<RejectionEvent["reason"], string> = {
  RoomNotFound: "No Room exists with that code.",
  NameTaken: "That name is already taken in this Room.",
  RoomNotInLobby: "This Room has already started.",
  InvalidName: "Please enter a name.",
  TooFewPlayers: "Need at least 3 Players to start.",
  TooManyPlayers: "At most 8 Players can play at once.",
  NotHost: "Only the Host can start the Game.",
};
