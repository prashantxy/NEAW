'use client';
import Link from "next/link";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';

export default function LandingPage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [trendingRepos, setTrendingRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const features = [
    { id: 1, title: "Mint Repos", description: "Turn your GitHub repositories into valuable NFTs", icon: "📦" },
    { id: 2, title: "List & Trade", description: "List your repo NFTs on our marketplace", icon: "💱" },
    { id: 3, title: "Earn Royalties", description: "Get paid when others use your code", icon: "💰" },
    { id: 4, title: "Verify Ownership", description: "Blockchain-verified ownership of your code", icon: "✅" },
  ];

  useEffect(() => {
    setIsLoaded(true);
    fetchTrendingRepos();
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    const { solana } = window;
    if (solana?.isPhantom) {
      try {
        const resp = await solana.connect({ onlyIfTrusted: true });
        setWallet(resp.publicKey);
      } catch (e) {
        console.log('No previous wallet connection found');
      }
    }
  };

  const connectWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const { solana } = window;
      if (!solana?.isPhantom) throw new Error('Phantom wallet not found');
      const response = await solana.connect();
      if (!response.publicKey) throw new Error('No public key received');
      setWallet(response.publicKey);
      router.push('/app');
    } catch (err) {
      setError('Wallet connection failed: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get('/api/nfts');
      const nfts = Array.isArray(data) ? data : [];
      const trending = nfts
        .filter((nft) => nft.for_sale)
        .sort((a, b) => (b.stars || 0) - (a.stars || 0))
        .slice(0, 3)
        .map((nft) => ({
          id: nft.mint,
          name: nft.name,
          stars: nft.stars || 0,
          owner: nft.creator.slice(0, 8),
          price: `${nft.price || 'N/A'} SOL`,
        }));
      setTrendingRepos(trending);
    } catch (err) {
      setError('Failed to fetch trending repositories');
      console.error(err);
      setTrendingRepos([
        { id: 1, name: "web3-solana-tools", stars: 142, owner: "cryptoDev", price: "2.5 SOL" },
        { id: 2, name: "nft-marketplace-ui", stars: 87, owner: "designWiz", price: "1.8 SOL" },
        { id: 3, name: "smart-contract-lib", stars: 213, owner: "blockchainMaster", price: "3.2 SOL" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-full">
          {Array.from({ length: 20 }).map((_, i) => (
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
          className="flex justify-between items-center py-6 px-8 md:px-16 border-b border-gray-800"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center">
            <motion.div
              className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg mr-3"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <Link href="/" className="text-xl font-bold tracking-tight">
  NEAW
</Link>
          </div>
          <div className="hidden md:flex space-x-8">
            <a href="#features" className="hover:text-purple-400 transition-colors">Features</a>
            <a href="#trending" className="hover:text-purple-400 transition-colors">Trending Repos</a>
            <a href="#how-it-works" className="hover:text-purple-400 transition-colors">How It Works</a>
          </div>
          <button 
            className="px-4 py-2 bg-gray-800 rounded-md hover:bg-gray-700 transition-colors"
            onClick={connectWallet}
          >
            {wallet ? `Connected: ${wallet.toString().slice(0, 4)}...` : 'Connect Wallet'}
          </button>
        </motion.nav>

        <div className="flex flex-col md:flex-row justify-between items-center py-16 px-8 md:px-16 gap-8">
          <motion.div 
            className="md:w-1/2"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
              Turn Code Into Digital Assets
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Mint your GitHub repositories as NFTs on Solana. Own, trade, and monetize your code in the most innovative marketplace for developers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-lg shadow-lg hover:shadow-purple-500/20 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/app')}
              >
                Get Started
              </motion.button>
              <motion.button
                className="px-8 py-4 bg-gray-800 border border-gray-700 rounded-lg font-medium text-lg hover:bg-gray-700 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/app')}
              >
                Explore Repos
              </motion.button>
            </div>
          </motion.div>

          <motion.div 
            className="md:w-1/2 flex justify-center"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <motion.div
              className="w-full max-w-md h-80 bg-gray-800 rounded-xl p-6 shadow-xl relative overflow-hidden border border-gray-700"
              animate={{ 
                rotateY: [0, 5, 0, -5, 0],
                rotateX: [0, -5, 0, 5, 0],
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 z-0"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <span className="text-gray-400">github.com/</span>
                      <span className="font-semibold">defi-protocol/smart-contracts</span>
                    </div>
                    <h3 className="text-2xl font-bold mt-2">Smart Contract Library</h3>
                    <div className="flex items-center mt-1 text-sm text-gray-400">
                      <span className="flex items-center">
                        <span className="mr-1">★</span> 328
                      </span>
                      <span className="mx-2">•</span>
                      <span>Updated 2 days ago</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <span className="text-xl">P_19</span>
                  </div>
                </div>
                
                <div className="mt-6 border-t border-gray-700 pt-4">
                  <p className="text-gray-300">A comprehensive library of secure, audited smart contracts for DeFi applications.</p>
                </div>
                
                <div className="mt-6 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500"></div>
                    <span className="ml-2 font-medium">@cryptoMaster</span>
                  </div>
                  <div className="flex items-center text-xl font-bold">
                    <span>4.2</span>
                    <span className="text-purple-400 ml-1">SOL</span>
                  </div>
                </div>
                
                <motion.div 
                  className="mt-8 p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-center"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/app')}
                >
                  <span className="font-medium">Mint NFT</span>
                </motion.div>
              </div>
              
              {isLoaded && Array.from({ length: 15 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-gray-600 text-xs"
                  initial={{
                    x: Math.random() * 400,
                    y: Math.random() * 400,
                    opacity: 0
                  }}
                  animate={{
                    y: [null, -20],
                    opacity: [0, 0.7, 0],
                  }}
                  transition={{
                    duration: Math.random() * 2 + 1,
                    repeat: Infinity,
                    delay: Math.random() * 5,
                  }}
                >
                  {["{}", "const", "async", "</>", "git", "function", "import", "export", "=>", "[]"][i % 10]}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        <div id="features" className="py-16 px-8 md:px-16 bg-gray-800/50">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Revolutionary Features</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">Transform your repositories into valuable assets with our cutting-edge NFT marketplace</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-all duration-300"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5, boxShadow: "0 10px 30px -15px rgba(156, 39, 176, 0.3)" }}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div id="trending" className="py-16 px-8 md:px-16">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trending Repositories</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">Discover the most valuable and in-demand GitHub repositories on our marketplace</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trendingRepos.map((repo, index) => (
              <motion.div
                key={repo.id}
                className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                onHoverStart={() => setHoveredCard(repo.id)}
                onHoverEnd={() => setHoveredCard(null)}
                whileHover={{ y: -5 }}
              >
                <div className="h-2 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold">{repo.name}</h3>
                    <div className="flex items-center text-yellow-400">
                      <span className="mr-1">★</span>
                      <span>{repo.stars}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-400 mb-4">
                    <span>Owner: @{repo.owner}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-purple-400">{repo.price}</span>
                    <motion.button
                      className="px-4 py-2 bg-purple-600 rounded-lg text-sm font-medium"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push('/app')}
                    >
                      View Details
                    </motion.button>
                  </div>
                </div>
                <AnimatePresence>
                  {hoveredCard === repo.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 pointer-events-none"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <motion.button
              className="px-6 py-3 bg-gray-800 border border-gray-700 rounded-lg font-medium hover:bg-gray-700 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/app')}
            >
              Explore All Repositories
            </motion.button>
          </div>
        </div>

        <div id="how-it-works" className="py-16 px-8 md:px-16 bg-gray-800/50">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">Simple steps to turn your GitHub repositories into valuable NFTs</p>
          </motion.div>

          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500 transform -translate-y-1/2 hidden md:block"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { id: 1, title: "Connect", description: "Connect your GitHub account and Solana wallet", icon: "🔗" },
                { id: 2, title: "Select & Mint", description: "Choose a repository and mint it as an NFT", icon: "🔨" },
                { id: 3, title: "List & Earn", description: "List your NFT on the marketplace and earn from sales", icon: "💸" }
              ].map((step, index) => (
                <motion.div
                  key={step.id}
                  className="flex flex-col items-center relative z-10"
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <motion.div 
                    className="w-20 h-20 rounded-full bg-gray-900 border-4 border-purple-500 flex items-center justify-center text-3xl mb-6"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {step.icon}
                  </motion.div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-center">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="py-16 px-8 md:px-16">
          <motion.div 
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 md:p-12 border border-gray-700 overflow-hidden relative"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 overflow-hidden">
              {isLoaded && Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-purple-500 opacity-5"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    width: `${Math.random() * 200 + 50}px`,
                    height: `${Math.random() * 200 + 50}px`,
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
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center">
              <div className="md:w-2/3 mb-8 md:mb-0">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Code?</h2>
                <p className="text-gray-300 text-lg">Join the revolution of code ownership and monetization with our innovative NFT marketplace.</p>
              </div>
              <motion.button
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-lg shadow-lg hover:shadow-purple-500/20 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/app')}
              >
                Start Minting Now
              </motion.button>
            </div>
          </motion.div>
        </div>

        <footer className="py-12 px-8 md:px-16 border-t border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg mr-2" />
                <h3 className="text-lg font-bold">NFT Repo Marketplace</h3>
              </div>
              <p className="text-gray-400">The future of code ownership and monetization on Solana.</p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#how-it-works" className="hover:text-purple-400 transition-colors">How It Works</a></li>
                <li><a href="#trending" className="hover:text-purple-400 transition-colors">Marketplace</a></li>
                <li><a href="#features" className="hover:text-purple-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-purple-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">API</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Connect</h4>
              <ul>
  <li>
    <a
      href="https://www.linkedin.com/in/prashant-dubey-59826521b/"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-purple-400 transition-colors"
    >
      LinkedIn
    </a>
  </li>
  <li>
    <a
      href="https://x.com/pdubey1924"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-purple-400 transition-colors"
    >
      X (Twitter)
    </a>
  </li>
  <li>
    <a
      href="https://discord.com/users/prashantdubey1924_55932"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-purple-400 transition-colors"
    >
      Discord
    </a>
  </li>
  <li>
    <a
      href="mailto:pdubey1924@gmail.com"
      className="hover:text-purple-400 transition-colors"
    >
      Email
    </a>
  </li>
</ul>

            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
            <p>© 2025 NFT Repo Marketplace. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-purple-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-purple-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}