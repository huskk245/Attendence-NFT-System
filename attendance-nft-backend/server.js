require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const path = require('path');
const AttendanceNFTArtifact = require('./contracts/AttendanceNFT.json');

const app = express();

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'client/build')));

const provider = new ethers.JsonRpcProvider(process.env.GANACHE_URL || 'http://localhost:7545');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, AttendanceNFTArtifact.abi, wallet);

app.post('/api/mint', async (req, res) => {
    try {
        const { recipient, metadata } = req.body;
        const tx = await contract.mintAttendance(recipient, metadata);
        const receipt = await tx.wait();
        
        let tokenId = null;
        for (const log of receipt.logs) {
            try {
                const parsedLog = contract.interface.parseLog(log);
                if (parsedLog && parsedLog.name === 'Transfer' && parsedLog.args.from === ethers.ZeroAddress) {
                    tokenId = parsedLog.args.tokenId.toString();
                    break;
                }
            } catch (parseError) {
                console.error('Error parsing log:', parseError);
            }
        }
        
        if (tokenId) {
            res.json({ success: true, transactionHash: receipt.hash, tokenId });
        } else {
            throw new Error('Failed to retrieve minted token ID');
        }
    } catch (error) {
        console.error('Error minting NFT:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/metadata/:tokenId', async (req, res) => {
    try {
        const tokenId = req.params.tokenId;
        const metadata = await contract.getTokenMetadata(tokenId);
        res.json({
            name: `Attendance NFT #${tokenId}`,
            description: metadata,
            image: `https://your-image-server.com/nft-image/${tokenId}.png`, // Replace with actual image URL
            attributes: [
                {
                    trait_type: "Attendance Date",
                    value: metadata
                }
            ]
        });
    } catch (error) {
        console.error('Error fetching metadata:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));