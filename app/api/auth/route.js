// app/api/auth/route.js
import axios from 'axios';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response(JSON.stringify({ error: 'No code provided' }), { status: 400 });
  }

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

    if (!data.access_token) {
      return new Response(JSON.stringify({ error: 'Failed to obtain access token' }), { status: 500 });
    }

    const token = data.access_token;

    // Fetch user repos
    const reposResponse = await axios.get('https://api.github.com/user/repos', {
      headers: { Authorization: `token ${token}` },
    });

    // Return both token and repos for frontend use
    return new Response(
      JSON.stringify({
        accessToken: token,
        repos: reposResponse.data,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Authentication error:', error);
    return new Response(
      JSON.stringify({ error: 'Authentication failed', details: error.message }),
      { status: 500 }
    );
  }
}