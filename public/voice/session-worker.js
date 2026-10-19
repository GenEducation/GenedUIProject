// The session worker: a dedicated worker that runs `Session` (session.js), so the socket and the audio path never wait for the page.
import { Session } from "./session.js";

const session = new Session({ WebSocketImpl: WebSocket, now: () => performance.now() / 1000, toMain: (m) => self.postMessage(m) });
self.onmessage = (e) => session.message(e.data);
