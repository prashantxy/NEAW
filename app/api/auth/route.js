import axios from 'axios';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  try {
    const { data } = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }, { headers: { Accept: 'application/json' } });

    const token = data.access_token;
    const repos = await axios.get('https://api.github.com/user/repos', {
      headers: { Authorization: `token ${token}` },
    });

    return new Response(JSON.stringify(repos.data), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 500 });
  }
}