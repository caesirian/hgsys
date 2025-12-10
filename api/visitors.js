let clients = [];

export default function handler(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };

  clients.push(newClient);

  sendCount();

  req.on("close", () => {
    clients = clients.filter(c => c.id !== clientId);
    sendCount();
  });
}

function sendCount() {
  const message = `data: ${clients.length}\n\n`;

  clients.forEach(client => client.res.write(message));
}