import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, '..', 'wallets.json');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

interface WalletEntry {
  address: string;
  timestamp: string;
  email?: string;
  twitter?: string;
}

const loadWallets = (): WalletEntry[] => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading wallets:', error);
  }
  return [];
};

const saveWallets = (wallets: WalletEntry[]) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(wallets, null, 2));
  } catch (error) {
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

  const newEntry: WalletEntry = {
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
  } else {
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