import Database from "better-sqlite3";
import type { RoomState } from "@skull-king/shared";

export interface RoomStore {
  saveRoom(state: RoomState): void;
  loadRoom(roomCode: string): RoomState | null;
  listNonCompletedRoomCodes(): string[];
  close(): void;
}

interface RoomRow {
  state_json: string;
}

interface RoomCodeRow {
  room_code: string;
}

export function openRoomStore(path: string): RoomStore {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_code TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      state_json TEXT NOT NULL
    )
  `);

  const upsert = db.prepare(`
    INSERT INTO rooms (room_code, status, state_json)
    VALUES (@roomCode, @status, @stateJson)
    ON CONFLICT(room_code) DO UPDATE SET
      status = excluded.status,
      state_json = excluded.state_json
  `);
  const selectByCode = db.prepare<[string], RoomRow>(
    "SELECT state_json FROM rooms WHERE room_code = ?",
  );
  const selectNonCompletedCodes = db.prepare<[], RoomCodeRow>(
    "SELECT room_code FROM rooms WHERE status != 'Completed'",
  );

  return {
    saveRoom(state: RoomState): void {
      upsert.run({
        roomCode: state.roomCode,
        status: state.status,
        stateJson: JSON.stringify(state),
      });
    },

    loadRoom(roomCode: string): RoomState | null {
      const row = selectByCode.get(roomCode);
      return row ? (JSON.parse(row.state_json) as RoomState) : null;
    },

    listNonCompletedRoomCodes(): string[] {
      return selectNonCompletedCodes.all().map((row) => row.room_code);
    },

    close(): void {
      if (db.open) {
        db.close();
      }
    },
  };
}
