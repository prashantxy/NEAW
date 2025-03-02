'use client';
import Link from "next/link";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';
import { initSmartProfile, getProfile } from '@/components/ui/lib/plurality';

export default function LandingPage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [profile, setProfile] = useState(null);
  const [trendingRepos, setTrendingRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [animationStyles, setAnimationStyles] = useState([]);
  const [hoverButton, setHoverButton] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    fetchTrendingRepos();
    checkWalletConnection();

    // Generate animation styles on client-side only
    const styles = Array.from({ length: 20 }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 100 + 50}px`,
      height: `${Math.random() * 100 + 50}px`,
      x: [0, Math.random() * 100 - 50],
      y: [0, Math.random() * 100 - 50],
      duration: Math.random() * 10 + 10,
    }));
    setAnimationStyles(styles);

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      fetchGithubToken(code).then(() => {
        window.history.pushState({}, document.title, '/');
      });
    }
  }, []);

  const checkWalletConnection = async () => {
    const { solana } = window;
    if (solana?.isPhantom) {
      try {
        const resp = await solana.connect({ onlyIfTrusted: true });
        const walletAddr = resp.publicKey.toString();
        setWallet(resp.publicKey);
        await loadProfile(walletAddr);
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
      const walletAddr = response.publicKey.toString();
      setWallet(response.publicKey);
      await loadProfile(walletAddr);
      router.push('/app');
    } catch (err) {
      setError('Wallet connection failed: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (walletAddress) => {
    let userProfile = await getProfile(walletAddress);
    if (!userProfile) {
      const githubToken = await fetchGithubToken();
      userProfile = await initSmartProfile(walletAddress, githubToken);
    }
    setProfile(userProfile);
  };

  const fetchGithubToken = async (code) => {
    try {
      const { data } = await axios.get(`/api/auth${code ? `?code=${code}` : ''}`, { withCredentials: true });
      return data.accessToken || null;
    } catch (error) {
      console.error('Failed to fetch GitHub token:', error);
      return null;
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

  const features = [
    { id: 1, title: "Mint Repos", description: "Turn your GitHub repositories into valuable NFTs", icon: "📦" },
    { id: 2, title: "List & Trade", description: "List your repo NFTs on our marketplace", icon: "💱" },
    { id: 3, title: "Earn Royalties", description: "Get paid when others use your code", icon: "💰" },
    { id: 4, title: "Verify Ownership", description: "Blockchain-verified ownership of your code", icon: "✅" },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-full">
          {animationStyles.map((style, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-vercel-pink/5 opacity-10"
              style={{
                top: style.top,
                left: style.left,
                width: style.width,
                height: style.height,
              }}
              animate={{
                x: style.x,
                y: style.y,
              }}
              transition={{
                duration: style.duration,
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
          className="flex justify-between items-center py-6 px-8 md:px-16 border-b border-gray-800"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center">
            <motion.div
              className="w-10 h-10 bg-black rounded-lg mr-3 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 19.5H22L12 2Z" fill="white"/>
              </svg>
            </motion.div>
            <Link href="/" className="text-xl font-bold tracking-tight">NEAW</Link>
          </div>
          <div className="hidden md:flex space-x-8">
            <a href="#features" className="text-sm hover:text-white/70 transition-colors">Features</a>
            <a href="#trending" className="text-sm hover:text-white/70 transition-colors">Trending Repos</a>
            <a href="#how-it-works" className="text-sm hover:text-white/70 transition-colors">How It Works</a>
          </div>
          
          <div className="relative">
            {!wallet ? (
              <motion.button 
                className="px-4 py-2 bg-white text-black rounded-md font-medium text-sm hover:bg-white/90 transition-colors"
                onClick={connectWallet}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setHoverButton(true)}
                onHoverEnd={() => setHoverButton(false)}
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
                {hoverButton && (
                  <motion.span
                    className="absolute inset-0 rounded-md bg-vercel-pink/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </motion.button>
            ) : (
              <div>
                <motion.button
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-md text-sm font-medium hover:bg-white/20 transition-colors"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {profile ? `${profile.connectedPlatforms?.github?.username || 'Profile'} (${wallet.toString().slice(0, 4)}...)` : 'Loading...'}
                </motion.button>
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-64 vercel-card p-4 z-20"
                    >
                      <h3 className="text-lg font-bold mb-2">Smart Profile</h3>
                      <p className="text-sm text-gray-400">
                        <strong>Wallet:</strong> {wallet.toString().slice(0, 6)}...{wallet.toString().slice(-4)}
                      </p>
                      {profile?.connectedPlatforms?.github?.username && (
                        <p className="text-sm text-gray-400">
                          <strong>GitHub:</strong> {profile.connectedPlatforms.github.username}
                        </p>
                      )}
                      <p className="text-sm text-gray-400">
                        <strong>NFTs Minted:</strong> {profile?.extendedPrivateData?.nfts?.length || 0}
                      </p>
                      <motion.button
                        className="mt-4 w-full px-4 py-2 bg-white text-black rounded-md text-sm hover:bg-white/90 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push('/app')}
                      >
                        Go to App
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.nav>

        <div className="flex flex-col md:flex-row justify-between items-center py-16 px-8 md:px-16 gap-8">
          <motion.div 
            className="md:w-1/2"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Turn Code Into <span className="text-vercel-pink">Digital Assets</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Mint your GitHub repositories as NFTs on Solana. Own, trade, and monetize your code in the most innovative marketplace for developers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                className="px-8 py-4 bg-white text-black rounded-lg font-medium text-lg shadow-lg transition-all relative overflow-hidden group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/app')}
              >
                <span className="relative z-10">Get Started</span>
                <motion.div 
                  className="absolute inset-0 bg-vercel-pink opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  initial={false}
                />
              </motion.button>
              <motion.button
                className="px-8 py-4 bg-transparent border border-white/20 rounded-lg font-medium text-lg hover:bg-white/10 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
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
              className="w-full max-w-md h-80 vercel-card p-6 relative overflow-hidden"
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
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-vercel-pink/5 to-vercel-blue/5 z-0"></div>
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
                      <span className="mx-2">P_19</span>
                      <span>Updated 2 days ago</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-black border border-white/20 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 19.5H22L12 2Z" fill="white"/>
                    </svg>
                  </div>
                </div>
                
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="text-gray-300">A comprehensive library of secure, audited smart contracts for DeFi applications.</p>
                </div>
                
                <div className="mt-6 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-vercel-blue"></div>
                    <span className="ml-2 font-medium">@cryptoMaster</span>
                  </div>
                  <div className="flex items-center text-xl font-bold">
                    <span>4.2</span>
                    <span className="text-vercel-pink ml-1">SOL</span>
                  </div>
                </div>
                
                <motion.div 
                  className="mt-8 p-2 bg-white text-black rounded-lg text-center"
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

        <div id="features" className="py-16 px-8 md:px-16 bg-black/30 backdrop-blur-sm">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Revolutionary Features</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Transform your repositories into valuable assets with our cutting-edge NFT marketplace</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                className="vercel-card p-6 hover:border-vercel-pink/50 transition-all duration-300"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
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
            <p className="text-gray-400 max-w-2xl mx-auto">Discover the most valuable and in-demand GitHub repositories on our marketplace</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trendingRepos.map((repo, index) => (
              <motion.div
                key={repo.id}
                className="vercel-card relative"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                onHoverStart={() => setHoveredCard(repo.id)}
                onHoverEnd={() => setHoveredCard(null)}
                whileHover={{ y: -5 }}
              >
                <div className="h-1 bg-vercel-pink w-full absolute top-0 left-0 rounded-t-lg"></div>
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
                    <span className="text-xl font-bold text-vercel-pink">{repo.price}</span>
                    <motion.button
                      className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium"
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
                      className="absolute inset-0 bg-gradient-to-br from-vercel-pink/5 to-vercel-blue/5 pointer-events-none rounded-lg"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <motion.button
              className="px-6 py-3 bg-transparent border border-white/20 rounded-lg font-medium hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/app')}
            >
              Explore All Repositories
            </motion.button>
          </div>
        </div>

        <div id="how-it-works" className="py-16 px-8 md:px-16 bg-black/30 backdrop-blur-sm">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Simple steps to turn your GitHub repositories into valuable NFTs</p>
          </motion.div>

          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 transform -translate-y-1/2 hidden md:block"></div>
            
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
                    className="w-20 h-20 rounded-full bg-black border border-white/20 flex items-center justify-center text-3xl mb-6 relative"
                    whileHover={{ scale: 1.1 }}
                  >
                    {step.icon}
                    <motion.div 
                      className="absolute inset-0 rounded-full border border-vercel-pink opacity-0"
                      animate={{ 
                        opacity: [0, 0.5, 0],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        delay: index * 0.3,
                      }}
                    />
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
            className="vercel-card p-8 md:p-12 relative overflow-hidden"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 overflow-hidden">
              {isLoaded && Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-vercel-pink opacity-5"
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
                <p className="text-gray-400 text-lg">Join the revolution of code ownership and monetization with our innovative NFT marketplace.</p>
              </div>
              <motion.button
                className="px-8 py-4 bg-white text-black rounded-lg font-medium text-lg shadow-lg transition-all relative overflow-hidden group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/app')}
              >
                <span className="relative z-10">Start Minting Now</span>
                <motion.div 
                  className="absolute inset-0 bg-vercel-pink opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  initial={false}
                />
              </motion.button>
            </div>
          </motion.div>
        </div>

        <footer className="py-12 px-8 md:px-16 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-black rounded-lg mr-2 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 19.5H22L12 2Z" fill="white"/>
                  </svg>
                </div>
                <h3 className="text-lg font-bold">NEAW</h3>
              </div>
              <p className="text-gray-400 text-sm">The future of code ownership and monetization on Solana.</p>
              <div className="flex space-x-4 mt-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.54 0c1.356 0 2.46 1.104 2.46 2.472v19.056c0 1.368-1.104 2.472-2.46 2.472h-15.080c-1.356 0-2.46-1.104-2.46-2.472v-19.056c0-1.368 1.104-2.472 2.46-2.472h15.080zm-7.54 8.188c-2.944 0-5.332 2.388-5.332 5.332 0 2.944 2.388 5.332 5.332 5.332 2.944 0 5.332-2.388 5.332-5.332 0-2.944-2.388-5.332-5.332-5.332zm0 1.77c1.968 0 3.563 1.595 3.563 3.562 0 1.968-1.595 3.563-3.563 3.563-1.968 0-3.563-1.595-3.563-3.563 0-1.967 1.595-3.562 3.563-3.562zm6.208-4.958c.792 0 1.434.642 1.434 1.434 0 .792-.642 1.434-1.434 1.434-.792 0-1.434-.642-1.434-1.434 0-.792.642-1.434 1.434-1.434z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-4 text-gray-300">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#trending" className="hover:text-white transition-colors">Marketplace</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-4 text-gray-300">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-4 text-gray-300">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://www.linkedin.com/in/prashant-dubey-59826521b/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a></li>
                <li><a href="https://x.com/pdubey1924" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">X (Twitter)</a></li>
                <li><a href="https://discord.com/users/prashantdubey1924_55932" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Discord</a></li>
                <li><a href="mailto:pdubey1924@gmail.com" className="hover:text-white transition-colors">Email</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-gray-400 text-xs">
            <p>© {new Date().getFullYear()} NEAW. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}