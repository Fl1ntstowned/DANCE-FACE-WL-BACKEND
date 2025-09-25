"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path_1.default.join(__dirname, '..', 'wallets.json');
const LEADERBOARD_FILE = path_1.default.join(__dirname, '..', 'leaderboard.json');
// Configure CORS to allow frontend
const corsOptions = {
    origin: [
        'https://dance-face-wl.up.railway.app',
        'https://satoshibrowser.xyz',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3003' // Added for when port 3000 is busy
    ],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
const loadWallets = () => {
    try {
        if (fs_1.default.existsSync(DATA_FILE)) {
            const data = fs_1.default.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Error loading wallets:', error);
    }
    return [];
};
const saveWallets = (wallets) => {
    try {
        fs_1.default.writeFileSync(DATA_FILE, JSON.stringify(wallets, null, 2));
    }
    catch (error) {
        console.error('Error saving wallets:', error);
    }
};
const loadLeaderboard = () => {
    try {
        if (fs_1.default.existsSync(LEADERBOARD_FILE)) {
            const data = fs_1.default.readFileSync(LEADERBOARD_FILE, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Error loading leaderboard:', error);
    }
    return [];
};
const saveLeaderboard = (leaderboard) => {
    try {
        fs_1.default.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
    }
    catch (error) {
        console.error('Error saving leaderboard:', error);
    }
};
const validateTaprootAddress = (address) => {
    // Taproot addresses start with 'bc1p' for mainnet or 'tb1p' for testnet
    const taprootRegex = /^(bc1p|tb1p)[a-z0-9]{39,59}$/;
    return taprootRegex.test(address.toLowerCase());
};
app.post('/api/whitelist', (req, res) => {
    const { address, email, twitter } = req.body;
    if (!address) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }
    const wallets = loadWallets();
    const existingWallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (existingWallet) {
        return res.status(400).json({ error: 'This wallet is already whitelisted! 🎉' });
    }
    const newEntry = {
        address,
        timestamp: new Date().toISOString(),
        email,
        twitter
    };
    wallets.push(newEntry);
    saveWallets(wallets);
    res.json({
        success: true,
        message: 'Welcome to the DanceFace crew! 🕺💃',
        position: wallets.length
    });
});
app.get('/api/wallets', (req, res) => {
    const wallets = loadWallets();
    res.json(wallets);
});
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const ADMIN_USER = process.env.ADMIN_USER || 'danceface';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'ordinals2024';
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.json({ success: true, token: 'admin-token-' + Date.now() });
    }
    else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});
app.get('/api/admin/wallets', (req, res) => {
    const token = req.headers.authorization;
    if (!token || !token.startsWith('admin-token-')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const wallets = loadWallets();
    res.json({
        wallets,
        total: wallets.length,
        exportData: wallets.map(w => w.address).join('\n')
    });
});
app.get('/api/admin/leaderboard', (req, res) => {
    const token = req.headers.authorization;
    if (!token || !token.startsWith('admin-token-')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const leaderboard = loadLeaderboard();
    // Sort by score and assign ranks
    const sortedLeaderboard = [...leaderboard].sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }).map((entry, index) => ({
        ...entry,
        rank: index + 1
    }));
    // Get unique wallets
    const uniqueWallets = new Set(leaderboard.map(e => e.walletAddress));
    // Calculate stats
    const stats = {
        totalEntries: leaderboard.length,
        uniquePlayers: uniqueWallets.size,
        highScore: sortedLeaderboard[0]?.score || 0,
        totalGamesPlayed: leaderboard.length
    };
    res.json({
        leaderboard: sortedLeaderboard,
        stats,
        exportData: {
            csv: sortedLeaderboard.map(e => `${e.rank},${e.xHandle},${e.walletAddress},${e.score},${e.difficulty},${e.songTitle}`).join('\n'),
            wallets: Array.from(uniqueWallets).join('\n')
        }
    });
});
// Leaderboard endpoints
app.post('/api/leaderboard/submit', (req, res) => {
    const { xHandle, walletAddress, score, combo, accuracy, grade, difficulty, songTitle, perfect, great, good, miss } = req.body;
    // Validate required fields
    if (!xHandle || !walletAddress || score === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    // Validate taproot address
    if (!validateTaprootAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid taproot address. Must start with bc1p or tb1p' });
    }
    const leaderboard = loadLeaderboard();
    // Create new entry
    const newEntry = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        xHandle,
        walletAddress,
        score,
        combo,
        accuracy,
        grade,
        difficulty,
        songTitle,
        perfect,
        great,
        good,
        miss,
        timestamp: new Date().toISOString()
    };
    leaderboard.push(newEntry);
    // Sort leaderboard by score (highest first), then by timestamp (newest first)
    leaderboard.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    saveLeaderboard(leaderboard);
    // Find the rank of the new entry
    const rank = leaderboard.findIndex(entry => entry.id === newEntry.id) + 1;
    res.json({
        success: true,
        message: 'Score submitted successfully!',
        rank,
        totalEntries: leaderboard.length
    });
});
app.get('/api/leaderboard', (req, res) => {
    const { difficulty, timeFilter, limit = 100 } = req.query;
    let leaderboard = loadLeaderboard();
    // Filter by difficulty if specified
    if (difficulty && difficulty !== 'all') {
        leaderboard = leaderboard.filter(entry => entry.difficulty === difficulty);
    }
    // Filter by time if specified
    if (timeFilter && timeFilter !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        switch (timeFilter) {
            case 'daily':
                filterDate.setDate(filterDate.getDate() - 1);
                break;
            case 'weekly':
                filterDate.setDate(filterDate.getDate() - 7);
                break;
            case 'monthly':
                filterDate.setMonth(filterDate.getMonth() - 1);
                break;
        }
        leaderboard = leaderboard.filter(entry => new Date(entry.timestamp) >= filterDate);
    }
    // Re-sort and assign ranks
    leaderboard.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    // Assign ranks
    const rankedLeaderboard = leaderboard.slice(0, Number(limit)).map((entry, index) => ({
        ...entry,
        rank: index + 1
    }));
    res.json(rankedLeaderboard);
});
app.get('/api/leaderboard/user/:walletAddress', (req, res) => {
    const { walletAddress } = req.params;
    const leaderboard = loadLeaderboard();
    // Find all entries for this wallet
    const userEntries = leaderboard.filter(entry => entry.walletAddress.toLowerCase() === walletAddress.toLowerCase());
    if (userEntries.length === 0) {
        return res.json({ bestScore: null, totalGames: 0 });
    }
    // Find best score
    const bestEntry = userEntries.reduce((best, entry) => entry.score > best.score ? entry : best);
    // Find rank of best score
    const sortedLeaderboard = [...leaderboard].sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    const rank = sortedLeaderboard.findIndex(entry => entry.id === bestEntry.id) + 1;
    res.json({
        bestScore: {
            ...bestEntry,
            rank
        },
        totalGames: userEntries.length,
        allScores: userEntries.sort((a, b) => b.score - a.score)
    });
});
app.listen(PORT, () => {
    console.log(`🚀 DanceFace backend running on port ${PORT}`);
    console.log(`🕺 Ready to collect wallet addresses and leaderboard scores!`);
});
