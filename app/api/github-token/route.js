// app/api/github-token/route.js
import axios from 'axios';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  try {
    const { data } = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );
    return new Response(JSON.stringify({ accessToken: data.access_token }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get token' }), { status: 500 });
  }
}