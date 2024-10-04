import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import AttendanceNFTArtifact from '../contracts/AttendanceNFT.json';

const AttendanceNFT = () => {
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState(null);
    const [tokenMetadata, setTokenMetadata] = useState({});
    const [ownedTokens, setOwnedTokens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [mintedTokenId, setMintedTokenId] = useState(null);
    const [showTokenMetadata, setShowTokenMetadata] = useState({});

    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                try {
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    const address = await signer.getAddress();
                    setAccount(address);

                    const contractAddress = "0xdd7A83c8Cc75a1104AC9378024f01e398925489B";
                    const instance = new ethers.Contract(
                        contractAddress,
                        AttendanceNFTArtifact.abi,
                        signer
                    );
                    setContract(instance);

                    await loadOwnedTokens(instance, address);

                    window.ethereum.on('accountsChanged', handleAccountChange);
                    window.ethereum.on('chainChanged', () => window.location.reload());
                } catch (error) {
                    console.error('Error initializing:', error);
                    setError('Failed to initialize. Please make sure MetaMask is installed and connected to the correct network.');
                }
            } else {
                setError('MetaMask not detected. Please install MetaMask to use this application.');
            }
        };

        init();

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountChange);
                window.ethereum.removeListener('chainChanged', () => {});
            }
        };
    }, []);

    const handleAccountChange = async (accounts) => {
        if (accounts.length === 0) {
            setAccount(null);
            setOwnedTokens([]);
            setTokenMetadata({});
            setShowTokenMetadata({});
        } else {
            setAccount(accounts[0]);
            if (contract) {
                await loadOwnedTokens(contract, accounts[0]);
            }
        }
    };

    const loadOwnedTokens = async (contractInstance, ownerAddress) => {
        setLoading(true);
        setError('');
        try {
            const tokenIds = [];
            const totalSupply = await contractInstance.totalSupply();
            for (let i = 0; i < totalSupply; i++) {
                const tokenId = await contractInstance.tokenByIndex(i);
                const owner = await contractInstance.ownerOf(tokenId);
                if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
                    tokenIds.push(tokenId.toString());
                }
            }
            setOwnedTokens(tokenIds);
        } catch (error) {
            console.error('Error loading owned tokens:', error);
            setError('Failed to load owned tokens. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const mintNFT = async () => {
        setLoading(true);
        setError('');
        try {
            if (!account || !contract) {
                throw new Error('No account connected or contract not initialized');
            }
            const attendanceTimestamp = new Date().toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "long",
                timeStyle: "medium",
            });
            const metadata = `Attendance for ${attendanceTimestamp}`;
            const tx = await contract.mintAttendance(account, metadata);
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
                setMintedTokenId(tokenId);
                setShowSuccessModal(true);
                setOwnedTokens(prevTokens => [...prevTokens, tokenId]);
                setTokenMetadata(prevMetadata => ({ ...prevMetadata, [tokenId]: metadata }));
                setShowTokenMetadata(prevState => ({ ...prevState, [tokenId]: true }));
            } else {
                throw new Error('Failed to retrieve minted token ID');
            }
        } catch (error) {
            console.error('Error minting NFT:', error);
            setError(`Failed to mint NFT: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getMetadata = async (tokenId) => {
        try {
            if (!contract) {
                throw new Error('Contract not initialized');
            }
            const metadata = await contract.getTokenMetadata(tokenId);
            setTokenMetadata(prevMetadata => ({
                ...prevMetadata,
                [tokenId]: metadata,
            }));
        } catch (error) {
            console.error('Error getting metadata:', error);
            setError(`Failed to get metadata for token ${tokenId}: ${error.message}`);
        }
    };

    const toggleMetadata = async (tokenId) => {
        setShowTokenMetadata(prevState => ({
            ...prevState,
            [tokenId]: !prevState[tokenId]
        }));
        if (!tokenMetadata[tokenId]) {
            await getMetadata(tokenId);
        }
    };

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const address = await signer.getAddress();
                setAccount(address);
                if (contract) {
                    await loadOwnedTokens(contract, address);
                }
            } catch (error) {
                console.error('Failed to connect wallet:', error);
                setError('Failed to connect wallet. Please try again.');
            }
        } else {
            setError('MetaMask not detected. Please install MetaMask to use this application.');
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setOwnedTokens([]);
        setTokenMetadata({});
        setShowTokenMetadata({});
        setError('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 ">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-5xl font-bold mb-8 text-center text-green-500">Attendance NFT System</h1>
                <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
                    <p className="text-lg mb-4">Connected Account: <span className="font-mono text-green-400">{account || 'Not connected'}</span></p>
                    <div className="flex space-x-4">
                        {!account ? (
                            <button
                                onClick={connectWallet}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:-translate-y-1"
                            >
                                Connect Wallet
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={disconnectWallet}
                                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:-translate-y-1"
                                >
                                    Disconnect Wallet
                                </button>
                                <button
                                    onClick={mintNFT}
                                    disabled={loading}
                                    className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:-translate-y-1 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? 'Minting...' : 'Mint NFT'}
                                </button>
                            </>
                        )}
                    </div>
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                </div>
    
                <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-4 text-green-400">Your Attendance NFTs</h2>
                    {loading ? (
                        <p className="text-center">Loading...</p>
                    ) : ownedTokens.length === 0 ? (
                        <p className="text-center text-gray-400">You don't have any Attendance NFTs yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {ownedTokens.map((tokenId) => (
                                <li key={tokenId} className="bg-gray-700 rounded-lg p-4 flex flex-col">
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono text-white">Token ID: {tokenId}</span>
                                        <button
                                            onClick={() => toggleMetadata(tokenId)}
                                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm transition duration-300 ease-in-out"
                                        >
                                            {showTokenMetadata[tokenId] ? 'Hide Metadata' : 'View Metadata'}
                                        </button>
                                    </div>
                                    {showTokenMetadata[tokenId] && (
                                        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                                            <h3 className="text-xl font-bold mb-2 text-green-400">Token Metadata:</h3>
                                            <p className="font-mono break-all">{tokenMetadata[tokenId] || 'Loading...'}</p>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
    
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center">
                        <h3 className="text-2xl font-bold mb-4 text-green-400">NFT Minted Successfully!</h3>
                        <p className="mb-4">Token ID: <span className="font-mono text-green-400">{mintedTokenId}</span></p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceNFT;