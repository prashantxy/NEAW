import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { Connection, PublicKey } from '@solana/web3.js';
import Pinata from '@pinata/sdk';
import { createClient } from '@supabase/supabase-js';

const pinata = new Pinata(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function POST(req) {
  const { repo, wallet } = await req.json();

  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const walletKey = new PublicKey(wallet);
    const metaplex = Metaplex.make(connection).use(walletAdapterIdentity({ publicKey: walletKey }));

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
    };

    const { IpfsHash } = await pinata.pinJSONToIPFS(metadata);
    const uri = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;

    const { nft } = await metaplex.nfts().create({
      uri,
      name: repo.name || 'Untitled',
      sellerFeeBasisPoints: 500,
    });

    const nftData = {
      name: repo.name || 'Untitled',
      uri,
      creator: wallet,
      mint: nft.mint.toString(),
      owner: wallet,
      description: repo.description,
      language: repo.language || 'None',
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      created_at: repo.created_at,
      html_url: repo.html_url || '',
      full_name: repo.full_name || '',
    };

    await supabase.from('nfts').insert([nftData]);

    return new Response(JSON.stringify(nftData), { status: 200 });
  } catch (error) {
    console.error('Minting error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}