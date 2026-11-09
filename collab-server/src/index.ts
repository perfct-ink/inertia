import { Server } from "@hocuspocus/server";
import { onAuthenticate } from "./auth.js";
import { afterUnloadDocument, onStateless } from "./roomHooks.js";
import { onLoadDocument, onStoreDocument } from "./persistence.js";

const server = new Server({
  port: Number(process.env.PORT ?? 1234),
  debounce: 2000, // ms of quiet before onStoreDocument fires
  maxDebounce: 10000, // upper bound so continuous typing still flushes periodically
  onAuthenticate,
  onLoadDocument,
  onStoreDocument,
  onStateless,
  afterUnloadDocument,
});

server.listen();
