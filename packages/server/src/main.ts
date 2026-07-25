import { openRoomStore } from "@skull-king/persistence";
import { createRealtimeServer } from "./createRealtimeServer.js";

const port = Number(process.env.PORT ?? 3001);
const dbPath = process.env.DB_PATH ?? "./skull-king.sqlite";

const store = openRoomStore(dbPath);
const { httpServer } = createRealtimeServer(store);

httpServer.listen(port, () => {
  console.log(`Skull King realtime server listening on port ${port}`);
});
