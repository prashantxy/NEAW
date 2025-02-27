import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function POST(req) {
  const {
    name,
    uri,
    creator,
    mint,
    owner,
    description,
    language,
    stars,
    forks,
    created_at,
    html_url,
    full_name,
  } = await req.json();

  try {
    const nftData = {
      name: name || 'Untitled',
      uri,
      creator,
      mint,
      owner,
      description: description || null,
      language: language || 'None',
      stars: stars || 0,
      forks: forks || 0,
      created_at: created_at || new Date().toISOString(),
      html_url: html_url || '',
      full_name: full_name || '',
    };

    const { error } = await supabase.from('nfts').insert([nftData]);
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ success: true, data: nftData }), { status: 200 });
  } catch (error) {
    console.error('NFT insertion error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('nfts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error('NFT fetch error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function PATCH(req) {
  const { mint, price, for_sale, owner } = await req.json();

  try {
    if (!mint) throw new Error('Mint address is required');

    const updates = {};
    if (price !== undefined) updates.price = price;
    if (for_sale !== undefined) updates.for_sale = for_sale;
    if (owner !== undefined) updates.owner = owner;

    if (Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    const { error } = await supabase
      .from('nfts')
      .update(updates)
      .eq('mint', mint);

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('NFT update error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}