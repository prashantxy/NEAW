'use client';
import Link from "next/link";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

export default function AppPage() {
  const [repos, setRepos] = useState([]);
  const [wallet, setWallet] = useState(null); // Will store PublicKey instance
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
          if (resp.publicKey) {
            const publicKey = new PublicKey(resp.publicKey); // Ensure PublicKey instance
            setWallet(publicKey);
            console.log('Initial wallet:', publicKey, publicKey instanceof PublicKey);
          }
        } catch (e) {
          console.log('No previous wallet connection found:', e);
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

  const connectWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const { solana } = window;
      if (!solana?.isPhantom) {
        throw new Error('Phantom wallet not found. Please install Phantom.');
      }
      const response = await solana.connect();
      console.log('Phantom response:', response);
      console.log('Phantom publicKey:', response.publicKey, typeof response.publicKey);
      if (!response.publicKey) {
        throw new Error('Failed to retrieve public key from wallet');
      }
      const publicKey = new PublicKey(response.publicKey); // Normalize to PublicKey
      setWallet(publicKey);
      console.log('Wallet set to:', publicKey, publicKey instanceof PublicKey);
      showNotification('Wallet connected successfully!', 'success');
      setShowConnectModal(false);
      return publicKey;
    } catch (err) {
      setError('Wallet connection failed: ' + err.message);
      showNotification('Wallet connection failed: ' + err.message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    const { solana } = window;
    if (solana?.isPhantom) {
      solana.disconnect();
      setWallet(null);
      setUserNFTs([]);
      showNotification('Wallet disconnected', 'info');
    }
  };

  const mintNFT = async (repo, walletKey) => {
    // Validate walletKey and convert to PublicKey if necessary
    if (!walletKey) {
      throw new Error('No wallet key provided');
    }
    const normalizedWalletKey = walletKey instanceof PublicKey ? walletKey : new PublicKey(walletKey);

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const { solana } = window;
    if (!solana?.isPhantom) throw new Error('Phantom wallet not found');

    setProcessingMint({ step: 1, message: 'Preparing metadata...' });
    const response = await axios.post('/api/mint', {
      repo,
      wallet: normalizedWalletKey.toString(),
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
      creator: normalizedWalletKey.toString(),
      mint: nft.mintAddress.toString(),
      owner: normalizedWalletKey.toString(),
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
        connectedWallet = await connectWallet();
        if (!connectedWallet) {
          throw new Error('Wallet connection failed or was canceled');
        }
      }
      // Normalize to PublicKey if not already
      const normalizedWallet = connectedWallet instanceof PublicKey ? connectedWallet : new PublicKey(connectedWallet);
      console.log('Connected wallet:', normalizedWallet, normalizedWallet instanceof PublicKey);

      const nft = await mintNFT(repo, normalizedWallet);

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

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const fromPublicKey = new PublicKey(nft.owner);
      const toPublicKey = wallet;

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
      await axios.patch('/api/nfts', { mint: nft.mint, owner: wallet.toString(), for_sale: false });

      setPublicNFTs((prev) =>
        prev.map((n) => (n.mint === nft.mint ? { ...n, owner: wallet.toString(), for_sale: false, price: 0 } : n))
      );
      setUserNFTs((prev) => [...prev, { ...nft, owner: wallet.toString(), for_sale: false, price: 0 }]);

      showNotification(`Successfully purchased ${nft.name}!`, 'success');
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
    if (!wallet) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get('/api/nfts');
      const ownedNFTs = Array.isArray(data)
        ? data.filter((nft) => nft.owner === wallet.toString())
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
      className="min-h-screen bg-gray-900 text-white overflow-hidden relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: fadeIn ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-full">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-purple-500 opacity-10"
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

      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div className="relative z-10">
        <motion.nav
          className="flex justify-between items-center py-4 px-6 md:px-12 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center">
            <motion.div
              className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg mr-3"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <Link href="/" className="text-xl font-bold tracking-tight">
              NEAW
            </Link>
          </div>
          <div className="flex items-center space-x-2 md:space-x-6">
            <div className="hidden md:flex space-x-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'marketplace' ? 'bg-gray-800 text-purple-400' : 'text-gray-300 hover:text-white'}`}
                onClick={() => setActiveTab('marketplace')}
              >
                Marketplace
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'portfolio' ? 'bg-gray-800 text-purple-400' : 'text-gray-300 hover:text-white'}`}
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
                className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'repositories' ? 'bg-gray-800 text-purple-400' : 'text-gray-300 hover:text-white'}`}
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
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-md font-medium text-white shadow-lg hover:shadow-purple-500/20 transition-all"
                  onClick={() => setShowConnectModal(true)}
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : 'Connect'}
                </motion.button>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="hidden md:flex items-center bg-gray-800 px-3 py-2 rounded-md">
                    <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                    <span className="text-sm font-medium">{wallet.toString().slice(0, 4)}...{wallet.toString().slice(-4)}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-gray-800 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors md:hidden"
                    onClick={disconnectWallet}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm5 4a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm-2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 5a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="hidden md:block px-4 py-2 bg-gray-800 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    onClick={disconnectWallet}
                  >
                    Disconnect
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
                className={`fixed top-20 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg ${
                  notification.type === 'success'
                    ? 'bg-green-800'
                    : notification.type === 'error'
                    ? 'bg-red-800'
                    : 'bg-blue-800'
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
                      ></path>
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
                      ></path>
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
                      ></path>
                    </svg>
                  )}
                  <p className="text-white">{notification.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showConnectModal && (
              <motion.div
                className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowConnectModal(false)}
              >
                <motion.div
                  className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-xl mx-4"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", damping: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Connect to Continue</h2>
                    <button
                      onClick={() => setShowConnectModal(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center justify-center w-full p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-purple-500/20 transition-all"
                      onClick={connectWallet}
                      disabled={loading}
                    >
                      <svg
                        className="w-6 h-6 mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M22 7L12 13L2 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Connect Phantom Wallet
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center justify-center w-full p-3 bg-gray-700 rounded-lg font-medium text-white hover:bg-gray-600 transition-all"
                      onClick={connectGitHub}
                      disabled={loading}
                    >
                      <svg
                        className="w-6 h-6 mr-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 0C5.37 0 0 5.37 0 12C0 17.31 3.435 21.795 8.205 23.385C8.805 23.49 9.03 23.13 9.03 22.815C9.03 22.53 9.015 21.585 9.015 20.58C6 21.135 5.22 19.845 4.98 19.17C4.845 18.825 4.26 17.76 3.75 17.475C3.33 17.25 2.73 16.695 3.735 16.68C4.68 16.665 5.355 17.55 5.58 17.91C6.66 19.725 8.385 19.215 9.075 18.9C9.18 18.12 9.495 17.595 9.84 17.295C7.17 16.995 4.38 15.96 4.38 11.37C4.38 10.065 4.845 8.985 5.61 8.145C5.49 7.845 5.07 6.615 5.73 4.965C5.73 4.965 6.735 4.65 9.03 6.195C9.99 5.925 11.01 5.79 12.03 5.79C13.05 5.79 14.07 5.925 15.03 6.195C17.325 4.635 18.33 4.965 18.33 4.965C18.99 6.615 18.57 7.845 18.45 8.145C19.215 8.985 19.68 10.05 19.68 11.37C19.68 15.975 16.875 16.995 14.205 17.295C14.64 17.67 15.015 18.39 15.015 19.515C15.015 21Z"
                        />
                      </svg>
                      Connect GitHub
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
                <h2 className="text-2xl md:text-3xl font-bold mb-6">NFT Marketplace</h2>
                {loading && !publicNFTs.length ? (
                  <p className="text-gray-400">Loading NFTs...</p>
                ) : error ? (
                  <p className="text-red-400">{error}</p>
                ) : filteredPublicNFTs.length === 0 ? (
                  <p className="text-gray-400">No NFTs available</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPublicNFTs.map((nft) => (
                      <motion.div
                        key={nft.mint}
                        className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors"
                        whileHover={{ y: -5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <img
                          src={`https://opengraph.githubassets.com/1/${nft.full_name || ''}`}
                          alt={nft.name || 'NFT'}
                          className="w-full h-48 object-cover"
                          onError={(e) => (e.target.src = '/fallback-image.png')}
                        />
                        <div className="p-4">
                          <h3 className="text-lg font-semibold truncate">{nft.name || 'Unnamed NFT'}</h3>
                          <p className="text-sm text-gray-400 truncate">{nft.description || 'No description'}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="text-gray-400">Language:</span> {nft.language || 'None'}
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-400">Stars:</span> {nft.stars || 0}
                            </p>
                          </div>
                          {nft.for_sale && (
                            <div className="mt-4">
                              <p className="text-purple-400 font-medium">{nft.price} SOL</p>
                              {nft.owner !== wallet?.toString() && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="mt-2 w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors"
                                  onClick={() => buyNFT(nft)}
                                  disabled={loading}
                                >
                                  {loading ? 'Processing...' : 'Buy Now'}
                                </motion.button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
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
                <h2 className="text-2xl md:text-3xl font-bold mb-6">My Portfolio</h2>
                {!wallet ? (
                  <p className="text-gray-400">Connect your wallet to view your NFTs</p>
                ) : loading && !userNFTs.length ? (
                  <p className="text-gray-400">Loading your NFTs...</p>
                ) : error ? (
                  <p className="text-red-400">{error}</p>
                ) : userNFTs.length === 0 ? (
                  <p className="text-gray-400">You don’t own any NFTs yet</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {userNFTs.map((nft) => (
                      <motion.div
                        key={nft.mint}
                        className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors"
                        whileHover={{ y: -5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <img
                          src={`https://opengraph.githubassets.com/1/${nft.full_name || ''}`}
                          alt={nft.name || 'NFT'}
                          className="w-full h-48 object-cover"
                          onError={(e) => (e.target.src = '/fallback-image.png')}
                        />
                        <div className="p-4">
                          <h3 className="text-lg font-semibold truncate">{nft.name || 'Unnamed NFT'}</h3>
                          <p className="text-sm text-gray-400 truncate">{nft.description || 'No description'}</p>
                          {!nft.for_sale ? (
                            <div className="mt-4">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={priceInputs[nft.mint] || ''}
                                onChange={(e) => handlePriceChange(nft.mint, e.target.value)}
                                placeholder="Price in SOL"
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="mt-2 w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors"
                                onClick={() => listForSale(nft.mint, priceInputs[nft.mint])}
                                disabled={loading}
                              >
                                {loading ? 'Listing...' : 'List for Sale'}
                              </motion.button>
                            </div>
                          ) : (
                            <p className="mt-4 text-purple-400 font-medium">Listed for {nft.price} SOL</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'repositories' && (
              <motion.div
                key="repositories"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold">My Repositories</h2>
                  {repos.length === 0 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                      onClick={connectGitHub}
                      disabled={loading}
                    >
                      Connect GitHub
                    </motion.button>
                  )}
                </div>
                {loading && !repos.length ? (
                  <p className="text-gray-400">Loading repositories...</p>
                ) : error ? (
                  <p className="text-red-400">{error}</p>
                ) : repos.length === 0 ? (
                  <p className="text-gray-400">Connect your GitHub to see your repositories</p>
                ) : filteredRepos.length === 0 ? (
                  <p className="text-gray-400">No repositories match your search</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredRepos.map((repo) => (
                      <motion.div
                        key={repo.id || Math.random()}
                        className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors"
                        whileHover={{ y: -5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <img
                          src={`https://opengraph.githubassets.com/1/${repo.full_name || ''}`}
                          alt={repo.name || 'Repository'}
                          className="w-full h-48 object-cover"
                          onError={(e) => (e.target.src = '/fallback-image.png')}
                        />
                        <div className="p-4">
                          <h3 className="text-lg font-semibold truncate">{repo.name || 'Unnamed Repo'}</h3>
                          <p className="text-sm text-gray-400 truncate">{repo.description || 'No description'}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="text-gray-400">Language:</span> {repo.language || 'None'}
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-400">Stars:</span> {repo.stargazers_count || 0}
                            </p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="mt-4 w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors"
                            onClick={() => handleMint(repo)}
                            disabled={loading && mintingRepo?.id === repo.id}
                          >
                            {loading && mintingRepo?.id === repo.id ? 'Minting...' : 'Mint NFT'}
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
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