import { corsHeaders } from '../shared/cors.js';

export async function handleDomains(request, env, ctx) {
  const url = new URL(request.url);
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (method === 'GET' && url.pathname === '/api/domains/config') {
      return await getDomainConfig(request, env);
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Domain API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Get domain configuration for the current hostname
async function getDomainConfig(request, env) {
  try {
    const url = new URL(request.url);
    const hostname = url.searchParams.get('hostname') || request.headers.get('host') || 'localhost';
    
    // Clean up hostname (remove port if present)
    const cleanHostname = hostname.split(':')[0];
    
    console.log('Looking up domain config for:', cleanHostname);

    // Query the domains table for this hostname
    const query = `
      SELECT hostname, focus_user_id, record 
      FROM domains 
      WHERE hostname = ?
    `;
    
    const result = await env.DB.prepare(query).bind(cleanHostname).first();
    
    if (result) {
      console.log('Found domain config:', result);
      // Parse the JSON record and combine with promoted fields
      let recordData = {};
      try {
        recordData = result.record ? JSON.parse(result.record) : {};
      } catch (parseError) {
        console.error('Error parsing domain record JSON:', parseError);
        recordData = {};
      }
      
      const response = {
        hostname: result.hostname,
        focus_user_id: result.focus_user_id,
        ...recordData // Include all additional configuration from JSON record
      };
      
      console.log('Returning domain config:', response);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Return default configuration (show all artists)
      console.log('No domain config found, returning default');
      const defaultResponse = {
        hostname: cleanHostname,
        focus_user_id: '*', // '*' means show all artists
        site_title: null,
        site_description: null
      };
      
      console.log('Returning default config:', defaultResponse);
      return new Response(JSON.stringify(defaultResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error getting domain config:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get domain configuration',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}