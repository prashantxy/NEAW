import Pinata from '@pinata/sdk';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { Readable } from 'stream'; // Add this import for Readable stream

const pinata = new Pinata(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export async function POST(req) {
  const { repo, wallet } = await req.json();

  try {
    // Step 1: Fetch the repository ZIP from GitHub
    const repoUrl = `https://api.github.com/repos/${repo.full_name}/zipball`;
    const headers = GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {};
    
    const response = await axios.get(repoUrl, {
      headers,
      responseType: 'arraybuffer', // Get the ZIP as a binary buffer
    });

    // Step 2: Convert Buffer to Readable Stream
    const codeBuffer = Buffer.from(response.data);
    const readableStream = new Readable({
      read() {
        this.push(codeBuffer);
        this.push(null); // Signal end of stream
      },
    });

    // Step 3: Upload to Pinata using the readable stream
    const codeUpload = await pinata.pinFileToIPFS(readableStream, {
      pinataMetadata: { name: `${repo.full_name}-codebase.zip` },
    });
    const codeIpfsHash = codeUpload.IpfsHash;
    const codeUri = `https://gateway.pinata.cloud/ipfs/${codeIpfsHash}`;

    // Step 4: Create metadata with the codebase link
    const metadata = {
      name: repo.name || 'Untitled',
      description: repo.description || `GitHub repository: ${repo.name}`,
      external_url: repo.html_url || '',
      creator: wallet,
      image: `https://opengraph.githubassets.com/1/${repo.full_name || ''}`,
      attributes: [
        { trait_type: 'Language', value: repo.language || 'None' },
        { trait_type: 'Stars', value: repo.stargazers_count || 0 },
        { trait_type: 'Forks', value: repo.forks_count || 0 },
        { trait_type: 'Created Date', value: repo.created_at ? new Date(repo.created_at).toLocaleDateString() : 'Unknown' },
      ],
      codebase: codeUri,
    };

    // Step 5: Upload metadata to IPFS
    const { IpfsHash } = await pinata.pinJSONToIPFS(metadata);
    const uri = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;

    return new Response(JSON.stringify({ uri }), { status: 200 });
  } catch (error) {
    console.error('Error during minting:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 