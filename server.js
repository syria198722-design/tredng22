const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const localtunnel = require('localtunnel');
const path = require('path');

const PORT = process.env.PORT || 5000;

// Create Express app
const app = express();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to serve index.html from root if requested
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Configure Socket.io with CORS allowed
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const assets = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/JPY', 'BTC/USD', 'ETH/USD'];
const durations = ['1m', '2m', '5m'];

function getRealisticPrice(pair) {
    let base = 1.08500;
    if (pair.includes('JPY')) base = 155.60;
    else if (pair.includes('BTC')) base = 67320.00;
    else if (pair.includes('ETH')) base = 3450.00;
    else if (pair.includes('GBP')) base = 1.2720;
    else if (pair.includes('AUD')) base = 0.6650;
    else if (pair.includes('CAD')) base = 1.3680;

    const variation = (Math.random() - 0.5) * (base * 0.0015);
    const precision = pair.includes('BTC') || pair.includes('ETH') ? 2 : 5;
    return (base + variation).toFixed(precision);
}

// Socket Connection handling
io.on('connection', (socket) => {
    console.log(`[+] Client connected: ${socket.id}`);

    // Immediately send an introductory signal upon connection
    setTimeout(() => {
        const pair = 'EUR/USD';
        const signal = {
            id: 'sig_' + Date.now(),
            pair: pair,
            action: Math.random() > 0.5 ? 'BUY' : 'SELL',
            duration: '1m',
            entryPrice: getRealisticPrice(pair),
            time: new Date().toISOString()
        };
        socket.emit('new-signal', signal);
        console.log(`[*] Dispatched initial connection signal to client ${socket.id}`);
    }, 1500);

    socket.on('disconnect', () => {
        console.log(`[-] Client disconnected: ${socket.id}`);
    });
});

// Periodically generate and emit signals to all connected clients
setInterval(() => {
    if (io.sockets.sockets.size > 0) {
        const randomPair = assets[Math.floor(Math.random() * assets.length)];
        const randomAction = Math.random() > 0.5 ? 'BUY' : 'SELL';
        const randomDuration = durations[Math.floor(Math.random() * durations.length)];

        const signal = {
            id: 'sig_' + Date.now(),
            pair: randomPair,
            action: randomAction,
            duration: randomDuration,
            entryPrice: getRealisticPrice(randomPair),
            time: new Date().toISOString()
        };

        io.emit('new-signal', signal);
        console.log(`[Broadcast] New signal dispatched: ${signal.pair} - ${signal.action} @ ${signal.entryPrice}`);
    }
}, 12000); // Send every 12 seconds if clients are connected

server.listen(PORT, async () => {
    console.log(`=================================================`);
    console.log(`   MAMI SMART SIGNALS SERVER IS LIVE   `);
    console.log(`   Local Address: http://localhost:${PORT}        `);
    
    // Start localtunnel
    try {
        const tunnel = await localtunnel({ port: PORT });
        console.log(`   🌍 PUBLIC URL: ${tunnel.url}`);
        console.log(`   (Share this link with anyone to access the site)`);
        console.log(`=================================================`);

        tunnel.on('close', () => {
            console.log('Tunnel is closed');
        });
    } catch (err) {
        console.error('Failed to start localtunnel:', err.message);
        console.log(`=================================================`);
    }
});
