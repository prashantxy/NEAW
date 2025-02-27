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
  const { error } = await supabase.from('nfts').insert([{
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
  }]);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

export async function GET() {
  const { data, error } = await supabase.from('nfts').select('*').order('created_at', { ascending: false });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function PATCH(req) {
  const { mint, price, for_sale, owner } = await req.json();
  const updates = {};
  if (price !== undefined) updates.price = price;
  if (for_sale !== undefined) updates.for_sale = for_sale;
  if (owner) updates.owner = owner;

  const { error } = await supabase.from('nfts').update(updates).eq('mint', mint);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}