'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

export function WalletButton({ onConnect }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);

  const handleWalletConnect = useCallback(async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
     
      const APP_NAME = 'NEAW';
      const APP_LOGO_URL = ''; // Optional

      // Initialize Coinbase Wallet SDK
      const coinbaseWallet = new CoinbaseWalletSDK({
        appName: APP_NAME,
        appLogoUrl: APP_LOGO_URL,
        darkMode: false,
      });

      // Debug SDK instance
      console.log('SDK Instance:', coinbaseWallet);

      // Create Web3 provider (v4.x: no RPC/chainId args)
      const provider = coinbaseWallet.makeWeb3Provider();
      console.log('Provider:', provider);

      // Wrap with ethers.js BrowserProvider
      const ethersProvider = new ethers.BrowserProvider(provider);

      // Request account access
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned by Coinbase Wallet');
      }
      console.log('Accounts:', accounts);

      // Get signer and address
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();
      console.log('Connected Address:', address);

      // Update state
      setWalletAddress(address);
      if (onConnect) onConnect({ wallet: address });
    } catch (err) {
      if (err.code === 4001) {
        setError('Connection rejected by user');
      } else {
        setError(`Connection failed: ${err.message}`);
        console.error('Connection Error:', err);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, onConnect]);

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onClick={handleWalletConnect}
        disabled={isConnecting}
        className={`px-6 py-3 rounded-xl text-white font-semibold transition duration-300 ease-in-out shadow-md ${
          isConnecting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isConnecting
          ? 'Connecting...'
          : walletAddress
          ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
          : 'Connect Coinbase Wallet'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}