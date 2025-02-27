import Pinata from '@pinata/sdk';
import { createClient } from '@supabase/supabase-js';

const pinata = new Pinata(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function POST(req) {
  const { repo, wallet } = await req.json();

  try {
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

    return new Response(JSON.stringify({ uri }), { status: 200 });
  } catch (error) {
    console.error('Metadata upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}