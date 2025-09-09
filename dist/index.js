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
// Configure CORS to allow frontend
const corsOptions = {
    origin: [
        'https://dance-face-wl.up.railway.app',
        'http://localhost:3000',
        'http://localhost:3001'
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
app.listen(PORT, () => {
    console.log(`🚀 DanceFace backend running on port ${PORT}`);
    console.log(`🕺 Ready to collect wallet addresses!`);
});
