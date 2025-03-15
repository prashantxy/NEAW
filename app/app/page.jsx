'use client';
import Link from "next/link";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import { ethers } from 'ethers';

export default function AppPage() {
  const [repos, setRepos] = useState([]);
  const [wallet, setWallet] = useState(null); // Stores PublicKey (Solana) or address (Ethereum)
  const [walletType, setWalletType] = useState(null); // 'phantom' or 'coinbase'
  const [publicNFTs, setPublicNFTs] = useState([]);
  const [userNFTs, setUserNFTs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [notification, setNotification] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [mintingRepo, setMintingRepo] = useState(null);
  const [processingMint, setProcessingMint] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceInputs, setPriceInputs] = useState({});
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  useEffect(() => {
    fetchPublicNFTs();
    setFadeIn(true);

    const checkWallet = async () => {
      const { solana } = window;
      if (solana?.isPhantom) {
        try {
          const resp = await solana.connect({ onlyIfTrusted: true });
          if (resp && resp.publicKey) {
            const publicKey = new PublicKey(resp.publicKey.toString());
            setWallet(publicKey);
            setWalletType('phantom');
            console.log('Initial Phantom wallet:', publicKey.toString());
          }
        } catch (e) {
          console.log('No previous Phantom connection:', e);
        }
      }
    };

    checkWallet();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      fetchRepos(code);
      window.history.pushState({}, document.title, '/app');
      showNotification('GitHub connected successfully!', 'success');
      setActiveTab('repositories');
    }
  }, [showNotification]);

  useEffect(() => {
    if (wallet) fetchUserNFTs();
  }, [wallet]);

  const connectGitHub = () => {
    if (!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID) {
      showNotification('GitHub integration not configured', 'error');
      return;
    }
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&scope=repo&redirect_uri=${window.location.origin}/app`;
    window.location.href = url;
  };

  const fetchRepos = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`/api/auth?code=${code}`);
      setRepos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch repositories');
      showNotification('Failed to fetch GitHub repositories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const connectPhantomWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const { solana } = window;
      if (!solana?.isPhantom) {
        throw new Error('Phantom wallet not found. Please install Phantom.');
      }
      const response = await solana.connect();
      if (!response || !response.publicKey) {
        throw new Error('Failed to retrieve public key from Phantom');
      }
      const publicKey = new PublicKey(response.publicKey.toString());
      setWallet(publicKey);
      setWalletType('phantom');
      console.log('Phantom wallet connected:', publicKey.toString());
      showNotification('Phantom wallet connected successfully!', 'success');
      setShowConnectModal(false);
      return publicKey;
    } catch (err) {
      setError('Phantom connection failed: ' + err.message);
      showNotification('Phantom connection failed: ' + err.message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const connectCoinbaseWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const coinbaseWallet = new CoinbaseWalletSDK({
        appName: 'NEAW',
        appLogoUrl: '', // Optional
        darkMode: false,
      });

      const provider = coinbaseWallet.makeWeb3Provider(); // v4.x syntax
      const ethersProvider = new ethers.BrowserProvider(provider);

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned by Coinbase Wallet');
      }

      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();

      setWallet(address);
      setWalletType('coinbase');
      console.log('Coinbase wallet connected:', address);
      showNotification('Coinbase wallet connected successfully!', 'success');
      setShowConnectModal(false);
      return address;
    } catch (err) {
      setError('Coinbase connection failed: ' + err.message);
      showNotification('Coinbase connection failed: ' + err.message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    if (walletType === 'phantom') {
      const { solana } = window;
      if (solana?.isPhantom) {
        solana.disconnect();
      }
    } else if (walletType === 'coinbase') {
      // Coinbase Wallet SDK v4.x doesn’t have a direct disconnect method; reset state
      // Future improvement: Use `coinbaseWallet.disconnect()` if added in later versions
    }
    setWallet(null);
    setWalletType(null);
    setUserNFTs([]);
    showNotification('Wallet disconnected', 'info');
  };

  const mintNFT = async (repo, walletKey) => {
    if (!walletKey) throw new Error('No wallet key provided');
    if (!walletType) throw new Error('Wallet type not set');

    if (walletType === 'phantom') {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const { solana } = window;
      if (!solana?.isPhantom) throw new Error('Phantom wallet not found');

      setProcessingMint({ step: 1, message: 'Preparing metadata...' });
      const response = await axios.post('/api/mint', {
        repo,
        wallet: walletKey.toString(),
      });
      const { uri } = response.data;

      setProcessingMint({ step: 2, message: 'Minting NFT...' });
      const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(solana));
      const { nft } = await metaplex.nfts().create({
        uri,
        name: repo.name || 'Untitled',
        sellerFeeBasisPoints: 500,
      });

      const nftData = {
        name: repo.name || 'Untitled',
        uri,
        creator: walletKey.toString(),
        mint: nft.mintAddress.toString(),
        owner: walletKey.toString(),
        description: repo.description,
        language: repo.language || 'None',
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        created_at: repo.created_at,
        html_url: repo.html_url || '',
        full_name: repo.full_name || '',
      };

      setProcessingMint({ step: 3, message: 'Saving to database...' });
      await axios.post('/api/nfts', nftData);

      return nftData;
    } else if (walletType === 'coinbase') {
      // Placeholder for Ethereum NFT minting (requires additional setup, e.g., ERC-721 contract)
      throw new Error('Ethereum NFT minting not yet implemented');
    }
  };

  const handleMint = async (repo) => {
    if (!repo?.id) return;

    setMintingRepo(repo);
    setSelectedRepo(repo);
    setLoading(true);
    setError(null);

    try {
      let connectedWallet = wallet;
      if (!connectedWallet) {
        setShowConnectModal(true);
        throw new Error('Please connect a wallet');
      }

      const nft = await mintNFT(repo, connectedWallet);

      setPublicNFTs((prev) => [nft, ...prev]);
      setUserNFTs((prev) => [nft, ...prev]);
      showNotification(`Successfully minted ${repo.name} as an NFT!`, 'success');
    } catch (err) {
      setError(err.message);
      showNotification('Minting failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setMintingRepo(null);
      setProcessingMint(null);
    }
  };

  const listForSale = async (mint, price) => {
    const parsedPrice = parseFloat(price);
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      showNotification('Please enter a valid price', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!wallet) throw new Error('Connect wallet first');
      if (!walletType) throw new Error('Wallet type not set');

      const walletString = walletType === 'phantom' ? wallet.toString() : wallet;
      await axios.patch('/api/nfts', { mint, price: parsedPrice, for_sale: true });

      setPublicNFTs((prev) =>
        prev.map((nft) => (nft.mint === mint ? { ...nft, price: parsedPrice, for_sale: true } : nft))
      );
      setUserNFTs((prev) =>
        prev.map((nft) => (nft.mint === mint ? { ...nft, price: parsedPrice, for_sale: true } : nft))
      );

      showNotification(`NFT listed for ${parsedPrice} SOL`, 'success');
      setPriceInputs((prev) => ({ ...prev, [mint]: '' }));
    } catch (err) {
      setError('Listing failed: ' + err.message);
      showNotification('Failed to list NFT', 'error');
    } finally {
      setLoading(false);
    }
  };

  const buyNFT = async (nft) => {
    if (!nft?.mint) return;

    setLoading(true);
    setError(null);
    try {
      if (!wallet) throw new Error('Connect wallet first');
      if (!walletType) throw new Error('Wallet type not set');

      if (walletType === 'phantom') {
        const walletString = wallet.toString();
        const toPublicKey = new PublicKey(walletString);
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const fromPublicKey = new PublicKey(nft.owner);

        setProcessingMint({ step: 1, message: 'Initiating transaction...' });
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: toPublicKey,
            toPubkey: fromPublicKey,
            lamports: Math.floor(nft.price * 1e9),
          })
        );

        setProcessingMint({ step: 2, message: 'Requesting signature...' });
        const { solana } = window;
        if (!solana) throw new Error('Wallet not found');

        const { signature } = await solana.signAndSendTransaction(transaction);

        setProcessingMint({ step: 3, message: 'Confirming transaction...' });
        await connection.confirmTransaction(signature);

        setProcessingMint({ step: 4, message: 'Transferring NFT...' });
        const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(solana));
        await metaplex.nfts().transfer({
          nftOrSft: { mintAddress: new PublicKey(nft.mint) },
          toOwner: toPublicKey,
        });

        setProcessingMint({ step: 5, message: 'Updating database...' });
        await axios.patch('/api/nfts', { mint: nft.mint, owner: walletString, for_sale: false });

        setPublicNFTs((prev) =>
          prev.map((n) => (n.mint === nft.mint ? { ...n, owner: walletString, for_sale: false, price: 0 } : n))
        );
        setUserNFTs((prev) => [...prev, { ...nft, owner: walletString, for_sale: false, price: 0 }]);

        showNotification(`Successfully purchased ${nft.name}!`, 'success');
      } else if (walletType === 'coinbase') {
        // Placeholder for Ethereum NFT purchase
        throw new Error('Ethereum NFT purchasing not yet implemented');
      }
    } catch (err) {
      setError('Buying failed: ' + err.message);
      showNotification('Purchase failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setProcessingMint(null);
    }
  };

  const fetchPublicNFTs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get('/api/nfts');
      setPublicNFTs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch NFTs');
      showNotification('Failed to load marketplace NFTs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserNFTs = async () => {
    if (!wallet || !walletType) return;

    setLoading(true);
    setError(null);
    try {
      const walletString = walletType === 'phantom' ? wallet.toString() : wallet;
      const { data } = await axios.get('/api/nfts');
      const ownedNFTs = Array.isArray(data)
        ? data.filter((nft) => nft.owner === walletString)
        : [];
      setUserNFTs(ownedNFTs);
    } catch (err) {
      setError('Failed to fetch user NFTs');
      showNotification('Failed to load your NFTs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (mint, value) => {
    setPriceInputs((prev) => ({
      ...prev,
      [mint]: value,
    }));
  };

  const filteredPublicNFTs = publicNFTs.filter((nft) =>
    nft.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false
  );

  const filteredRepos = repos.filter((repo) =>
    repo.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false
  );

  return (
    <motion.div
      className="min-h-screen bg-black text-white overflow-hidden relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: fadeIn ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-full">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-vercel-pink/5 opacity-10"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 100 + 50}px`,
                height: `${Math.random() * 100 + 50}px`,
              }}
              animate={{
                x: [0, Math.random() * 100 - 50],
                y: [0, Math.random() * 100 - 50],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-grid-pattern"></div>

      <div className="relative z-10">
        <motion.nav
          className="flex justify-between items-center py-4 px-6 md:px-12 border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-20"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center">
            <motion.div
              className="w-8 h-8 bg-black rounded-lg mr-3 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 19.5H22L12 2Z" fill="white"/>
              </svg>
            </motion.div>
            <Link href="/" className="text-xl font-bold tracking-tight">
              NEAW
            </Link>
          </div>
          <div className="flex items-center space-x-2 md:space-x-6">
            <div className="hidden md:flex space-x-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-md transition-colors text-sm ${activeTab === 'marketplace' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('marketplace')}
              >
                Marketplace
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-md transition-colors text-sm ${activeTab === 'portfolio' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                onClick={() => {
                  setActiveTab('portfolio');
                  if (!wallet) setShowConnectModal(true);
                }}
              >
                My Portfolio
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-md transition-colors text-sm ${activeTab === 'repositories' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('repositories')}
              >
                Repositories
              </motion.button>
            </div>

            <div className="flex items-center">
              {!wallet ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-4 py-2 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors"
                  onClick={() => setShowConnectModal(true)}
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : 'Connect'}
                </motion.button>
              ) : (
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-md text-sm font-medium hover:bg-white/20 transition-colors"
                    onClick={disconnectWallet}
                  >
                    {walletType === 'phantom'
                      ? `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)} (Phantom)`
                      : `${wallet.slice(0, 4)}...${wallet.slice(-4)} (Coinbase)`}
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </motion.nav>

        <div className="md:hidden flex justify-around py-3 bg-gray-800/80 backdrop-blur-sm sticky top-16 z-10 border-b border-gray-700">
          <button
            className={`px-3 py-2 text-sm ${activeTab === 'marketplace' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-300'}`}
            onClick={() => setActiveTab('marketplace')}
          >
            Marketplace
          </button>
          <button
            className={`px-3 py-2 text-sm ${activeTab === 'portfolio' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-300'}`}
            onClick={() => {
              setActiveTab('portfolio');
              if (!wallet) setShowConnectModal(true);
            }}
          >
            My Portfolio
          </button>
          <button
            className={`px-3 py-2 text-sm ${activeTab === 'repositories' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-300'}`}
            onClick={() => setActiveTab('repositories')}
          >
            Repos
          </button>
        </div>

        <div className="px-6 md:px-12 pt-6">
          <div className="relative w-full md:max-w-md mx-auto md:mx-0">
            <input
              type="text"
              placeholder={`Search ${activeTab === 'repositories' ? 'repositories' : 'NFTs'}...`}
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-12">
          <AnimatePresence>
            {notification && (
              <motion.div
                className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
                  notification.type === 'success'
                    ? 'bg-green-900/20 border border-green-500/20'
                    : notification.type === 'error'
                    ? 'bg-red-900/20 border border-red-500/20'
                    : 'bg-blue-900/20 border border-blue-500/20'
                }`}
                initial={{ opacity: 0, y: -20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: -20, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center">
                  {notification.type === 'success' && (
                    <svg
                      className="w-6 h-6 text-green-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {notification.type === 'error' && (
                    <svg
                      className="w-6 h-6 text-red-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                  {notification.type === 'info' && (
                    <svg
                      className="w-6 h-6 text-blue-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  <span>{notification.message}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showConnectModal && (
              <motion.div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowConnectModal(false)}
              >
                <motion.div
                  className="vercel-card p-6 max-w-md w-full mx-4"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
                  <p className="text-gray-400 mb-6">
                    Connect a wallet to mint and trade NFTs on our platform.
                  </p>
                  <div className="space-y-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-3 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors flex items-center justify-center space-x-2"
                      onClick={connectPhantomWallet}
                      disabled={loading}
                    >
                      <img src="/phantom.png" alt="Phantom" className="w-6 h-6" />
                      <span>{loading ? 'Connecting...' : 'Connect Phantom'}</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-3 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors flex items-center justify-center space-x-2"
                      onClick={connectCoinbaseWallet}
                      disabled={loading}
                    >
                      <img src="/coinbase.png" alt="Coinbase" className="w-6 h-6" /> {/* Add Coinbase logo */}
                      <span>{loading ? 'Connecting...' : 'Connect Coinbase'}</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-3 bg-transparent border border-white/20 rounded-md text-sm font-medium hover:bg-white/10 transition-colors"
                      onClick={() => setShowConnectModal(false)}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'marketplace' && (
              <motion.div
                key="marketplace"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-0">NFT Marketplace</h1>
                    <div className="relative w-full md:w-64">
                      <input
                        type="text"
                        placeholder="Search NFTs..."
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-vercel-pink/20 text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <svg
                        className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                    </div>
                  ) : error ? (
                    <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4 text-center">
                      <p className="text-red-400">{error}</p>
                    </div>
                  ) : publicNFTs.length === 0 ? (
                    <div className="vercel-card p-8 text-center">
                      <p className="text-gray-400 mb-4">No NFTs available in the marketplace yet</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors"
                        onClick={() => setActiveTab('repositories')}
                      >
                        Mint Your First NFT
                      </motion.button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredPublicNFTs.map((nft) => (
                        <motion.div
                          key={nft.mint}
                          className="vercel-card relative"
                          whileHover={{ y: -5 }}
                        >
                          <div className="h-1 bg-vercel-pink w-full absolute top-0 left-0 rounded-t-lg"></div>
                          <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="text-lg font-bold">{nft.name}</h3>
                              <div className="flex items-center text-yellow-400">
                                <span className="mr-1">★</span>
                                <span>{nft.stars || 0}</span>
                              </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                              {nft.description || 'No description available'}
                            </p>
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-sm text-gray-400">
                                Owner: {nft.owner?.slice(0, 6)}...
                              </span>
                              <span className="text-vercel-pink font-bold">{nft.price} SOL</span>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="w-full px-4 py-2 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors"
                              onClick={() => buyNFT(nft)}
                              disabled={!wallet || loading}
                            >
                              {loading === nft.mint ? 'Processing...' : 'Buy Now'}
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'portfolio' && (
              <motion.div
                key="portfolio"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-8">My NFT Portfolio</h1>

                  {!wallet ? (
                    <div className="vercel-card p-8 text-center">
                      <p className="text-gray-400 mb-4">Connect your wallet to view your NFTs</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors"
                        onClick={() => setShowConnectModal(true)}
                      >
                        Connect Wallet
                      </motion.button>
                    </div>
                  ) : loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                    </div>
                  ) : error ? (
                    <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4 text-center">
                      <p className="text-red-400">{error}</p>
                    </div>
                  ) : userNFTs.length === 0 ? (
                    <div className="vercel-card p-8 text-center">
                      <p className="text-gray-400 mb-4">You don't own any NFTs yet</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors"
                        onClick={() => setActiveTab('repositories')}
                      >
                        Mint Your First NFT
                      </motion.button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {userNFTs.map((nft) => (
                        <motion.div
                          key={nft.mint}
                          className="vercel-card relative"
                          whileHover={{ y: -5 }}
                        >
                          <div className="h-1 bg-vercel-blue w-full absolute top-0 left-0 rounded-t-lg"></div>
                          <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="text-lg font-bold">{nft.name}</h3>
                              <div className="flex items-center text-yellow-400">
                                <span className="mr-1">★</span>
                                <span>{nft.stars || 0}</span>
                              </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                              {nft.description || 'No description available'}
                            </p>
                            {nft.for_sale ? (
                              <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm text-gray-400">Listed Price:</span>
                                  <span className="text-vercel-pink font-bold">{nft.price} SOL</span>
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-md text-sm font-medium hover:bg-white/20 transition-colors"
                                  onClick={() => listForSale(nft.mint, 0)}
                                  disabled={loading}
                                >
                                  {loading === nft.mint ? 'Processing...' : 'Delist'}
                                </motion.button>
                              </div>
                            ) : (
                              <div className="mb-4">
                                <div className="flex items-center mb-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    placeholder="Price in SOL"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-vercel-pink/20 text-white"
                                    value={priceInputs[nft.mint] || ''}
                                    onChange={(e) => handlePriceChange(nft.mint, e.target.value)}
                                  />
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="w-full px-4 py-2 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors"
                                  onClick={() => listForSale(nft.mint, priceInputs[nft.mint])}
                                  disabled={loading || !priceInputs[nft.mint]}
                                >
                                  {loading === nft.mint ? 'Processing...' : 'List for Sale'}
                                </motion.button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'repositories' && (
              <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-0">GitHub Repositories</h1>
                  <div className="flex space-x-4">
                    <div className="relative w-full md:w-64">
                      <input
                        type="text"
                        placeholder="Search repositories..."
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-vercel-pink/20 text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <svg
                        className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors"
                      onClick={connectGitHub}
                    >
                      {repos.length > 0 ? 'Refresh Repos' : 'Connect GitHub'}
                    </motion.button>
                  </div>
                </div>

                {loading && !repos.length ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                  </div>
                ) : error ? (
                  <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4 text-center">
                    <p className="text-red-400">{error}</p>
                  </div>
                ) : repos.length === 0 ? (
                  <div className="vercel-card p-8 text-center">
                    <p className="text-gray-400 mb-4">Connect your GitHub account to mint your repositories as NFTs</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors"
                      onClick={connectGitHub}
                    >
                      Connect GitHub
                    </motion.button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredRepos.map((repo) => (
                      <motion.div
                        key={repo.id}
                        className="vercel-card relative"
                        whileHover={{ y: -5 }}
                      >
                        <div className="h-1 bg-vercel-cyan w-full absolute top-0 left-0 rounded-t-lg"></div>
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold">{repo.name}</h3>
                            <div className="flex items-center text-yellow-400">
                              <span className="mr-1">★</span>
                              <span>{repo.stargazers_count || 0}</span>
                            </div>
                          </div>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                            {repo.description || 'No description available'}
                          </p>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-gray-400">
                              Language: {repo.language || 'None'}
                            </span>
                            <span className="text-sm text-gray-400">
                              Updated: {new Date(repo.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full px-4 py-2 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors"
                            onClick={() => handleMint(repo)}
                            disabled={!wallet || loading || processingMint === repo.id}
                          >
                            {processingMint === repo.id ? 'Minting...' : 'Mint as NFT'}
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>

          {processingMint && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-xl">
                <h3 className="text-xl font-bold mb-4">Minting in Progress</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        processingMint.step >= 1 ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span className="text-white">1</span>
                    </div>
                    <p className="ml-3">{processingMint.step === 1 ? 'Preparing metadata...' : 'Metadata prepared'}</p>
                  </div>
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        processingMint.step >= 2 ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span className="text-white">2</span>
                    </div>
                    <p className="ml-3">{processingMint.step === 2 ? 'Minting NFT...' : 'NFT minted'}</p>
                  </div>
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        processingMint.step >= 3 ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span className="text-white">3</span>
                    </div>
                    <p className="ml-3">{processingMint.step === 3 ? 'Saving to database...' : 'Complete'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}