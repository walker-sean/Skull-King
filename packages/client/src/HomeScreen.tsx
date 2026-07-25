import { useState, type FormEvent } from "react";

export interface HomeScreenProps {
  error: string | null;
  onCreateRoom: (hostName: string) => void;
  onJoinRoom: (roomCode: string, displayName: string) => void;
}

export function HomeScreen({ error, onCreateRoom, onJoinRoom }: HomeScreenProps) {
  const [hostName, setHostName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateRoom(hostName);
  }

  function handleJoinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onJoinRoom(roomCode, displayName);
  }

  return (
    <div>
      <h1>Skull King</h1>
      {error && <p role="alert">{error}</p>}

      <section>
        <h2>Create a Room</h2>
        <form onSubmit={handleCreateSubmit}>
          <label htmlFor="host-name">Your name</label>
          <input
            id="host-name"
            value={hostName}
            onChange={(event) => setHostName(event.target.value)}
          />
          <button type="submit">Create Room</button>
        </form>
      </section>

      <section>
        <h2>Join a Room</h2>
        <form onSubmit={handleJoinSubmit}>
          <label htmlFor="room-code">Room code</label>
          <input
            id="room-code"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value)}
          />
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <button type="submit">Join Room</button>
        </form>
      </section>
    </div>
  );
}
