
'use client';

import { CeramicClient } from '@ceramicnetwork/http-client';

const ceramic = new CeramicClient('https://ceramic.plurality.network'); 

export async function initSmartProfile(walletAddress, githubToken = null) {
  console.warn('Plurality SDK not available; using mock initSmartProfile');
  return {
    wallet: walletAddress,
    connectedPlatforms: githubToken ? [{ name: 'github', token: githubToken }] : [],
    extendedPrivateData: { nfts: [] },
  };
}

export async function getProfile(walletAddress) {
  console.warn('Plurality SDK not available; using mock getProfile');
  return {
    wallet: walletAddress,
    connectedPlatforms: [],
    extendedPrivateData: { nfts: [] },
  };
}