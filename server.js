// Minimal HTTP/2 static + API server with per-session/stream logging
// Shows that many requests share a single TCP/TLS connection (one h2 session)
const fs = require('fs');
const path = require('path');
const http2 = require('http2');

// --- TLS certs (self-signed ok for local). Place files in ./cert
const keyPath = path.join(__dirname, 'cert', 'server.key');
const certPath = path.join(__dirname, 'cert', 'server.crt');
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error('\n[!] Missing TLS certs in ./cert. See instructions below to generate with openssl.');
}

const server = http2.createSecureServer({
    key: fs.existsSync(keyPath) ? fs.readFileSync(keyPath) : undefined,
    cert: fs.existsSync(certPath) ? fs.readFileSync(certPath) : undefined,
    allowHTTP1: true, // ALPN negotiates h2 if possible, otherwise http/1.1
});

let nextSessionId = 1;
const sessions = new Map();


server.on('session', (session) => {
    const id = nextSessionId++;
    sessions.set(session, id);
    const alpn = session.socket.alpnProtocol; // 'h2' or 'http/1.1'
    const remote = `${session.socket.remoteAddress}:${session.socket.remotePort}`;
    console.log(`\n[session #${id}] opened from ${remote} via ALPN=${alpn}`);

    session.on('close', () => {
        console.log(`[session #${id}] closed`);
        sessions.delete(session);
    });
});

server.on('stream', (stream, headers) => {
    const method = headers[':method'];
    const reqPath = headers[':path'];
    const sessionId = sessions.get(stream.session) || '?';
    const streamId = stream.id; // Unique within a session
    console.log(`[session #${sessionId}] stream ${streamId}: ${method} ${reqPath}`);


    // Simple router
    if (reqPath.startsWith('/api/thing')) {
        // e.g., /api/thing?id=5
        const url = new URL(`https://dummy${reqPath}`);
        const id = url.searchParams.get('id') || '0';


        // Simulate a tiny bit of work
        setTimeout(() => {
            const payload = JSON.stringify({ id, ts: Date.now(), msg: 'Hello from HTTP/2!' });
            stream.respond({
                'content-type': 'application/json',
                ':status': 200,
            });
            stream.end(payload);
        }, Math.random() * 100);
        return;
    }


    // Static files from /public
    let filePath = reqPath === '/' ? '/index.html' : reqPath;
    filePath = path.normalize(filePath).replace(/^\\.\\.|^\.\.|\0/g, ''); // naive safety
    const abs = path.join(__dirname, 'public', filePath);


    fs.stat(abs, (err, stat) => {
        if (err || !stat.isFile()) {
            stream.respond({ ':status': 404 });
            stream.end('Not found');
            return;
        }
        const ext = path.extname(abs).toLowerCase();
        const ctype = ext === '.html' ? 'text/html; charset=utf-8'
            : ext === '.js' ? 'application/javascript; charset=utf-8'
                : ext === '.css' ? 'text/css; charset=utf-8'
                    : ext === '.png' ? 'image/png'
                        : 'application/octet-stream';


        stream.respond({
            'content-type': ctype,
            ':status': 200,
            'cache-control': 'no-store',
        });
        fs.createReadStream(abs).pipe(stream);
    });
});

const PORT = 8443;
server.listen(PORT, () => {
    console.log(`\nHTTPS server listening on https://localhost:${PORT}`);
    console.log('ALPN will negotiate HTTP/2 automatically.');
    console.log('Open the page and then watch this console: many \'stream\' lines should share one \'session\'.');
});