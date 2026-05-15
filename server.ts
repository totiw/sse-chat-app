import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: ["http://localhost:3000", "https://sse-next-app.vercel.app"],
    methods: ["GET", "POST"],
  }),
);
app.use(express.json());

type Client = {
  id: string;
  res: express.Response;
};

const clients: Client[] = [];

const onConnected = (newClient: Client) => {
  console.log(`Client connected: ${newClient.id}`);
  const data = JSON.stringify({
    type: "connected",
    userId: newClient.id,
  });
  clients.push(newClient);
  newClient.res.write(`data: ${data}\n\n`);
};

const onDisconnected = (clientId: string) => {
  const index = clients.findIndex((client) => client.id === clientId);
  if (index !== -1) {
    clients.splice(index, 1);
    console.log(`Client disconnected: ${clientId}`);
  }
};

const broadcastOnlineUsers = () => {
  const data = JSON.stringify({
    type: "online-users",
    count: clients.length,
  });
  clients.forEach((client) => {
    client.res.write(`data: ${data}\n\n`);
  });
};

// SSE endpoint
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders?.();

  const clientId = crypto.randomUUID();
  const newClient = {
    id: clientId,
    res,
  };

  // on connected new client
  onConnected(newClient);

  // broadcast online users ke semua client
  broadcastOnlineUsers();

  // handle client disconnect
  req.on("close", () => {
    onDisconnected(clientId);
    broadcastOnlineUsers();
    res.end();
  });
});

app.post("/notify", (req, res) => {
  const notification = {
    type: "notification",
    id: crypto.randomUUID(),
    userId: req.body.userId || null,
    message: req.body.message || "New notification",
    createdAt: new Date().toISOString(),
  };

  // broadcast ke semua client
  clients.forEach((client) => {
    client.res.write(`data: ${JSON.stringify(notification)}\n\n`);
  });
  res.status(200).json({
    success: true,
    notification,
  });
});

app.listen(PORT, () => {
  console.log(`SSE server running on port ${PORT}`);
});
