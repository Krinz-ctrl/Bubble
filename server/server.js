import http from 'http';

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('BUBBLE');
});

server.listen(PORT, () => {
  console.log(`BUBBLE server listening on port ${PORT}`);
});
