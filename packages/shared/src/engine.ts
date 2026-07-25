import type { RoomState } from "./room.js";
import type { DomainEvent } from "./events.js";

/**
 * Result of applying a Command to Room state. `state` is null when the
 * command was rejected before any Room existed to mutate (e.g. joining a
 * Room Code that has no matching Room).
 */
export interface EngineResult {
  state: RoomState | null;
  events: DomainEvent[];
}
