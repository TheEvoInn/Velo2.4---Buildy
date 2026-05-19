const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const projectId = "z4cf7gaghu9gyzx14bt";
  
  // Robust secret retrieval
  const getSecret = (name: string) => {
    const val = Deno.env.get(name);
    if (val) return val;
    
    // Fallback: search case-insensitively
    const allEnv = Deno.env.toObject();
    const foundKey = Object.keys(allEnv).find(k => k.toUpperCase() === name.toUpperCase());
    return foundKey ? allEnv[foundKey] : null;
  };

  const clientId = getSecret("GOOGLE_CLIENT_ID");
  const clientSecret = getSecret("GOOGLE_CLIENT_SECRET");
  
  // Use the canonical deployed function URL for redirect
  const redirectUri = `https://buildy.ai/api/apps/${projectId}/functions/google-connect-helper`;

  // Handle Google OAuth Callback (GET or POST if using form_post)
  if (req.method === "GET" || (req.method === "POST" && req.headers.get("content-type")?.includes("application/x-www-form-urlencoded"))) {
    let code = url.searchParams.get("code");
    let error = url.searchParams.get("error");
    let errorDescription = url.searchParams.get("error_description");
    let state = url.searchParams.get("state");

    // If it's a POST with form data (response_mode=form_post), parse body
    if (!code && !error && req.method === "POST") {
      try {
        const formData = await req.formData();
        code = formData.get("code")?.toString() || null;
        error = formData.get("error")?.toString() || null;
        errorDescription = formData.get("error_description")?.toString() || null;
        state = formData.get("state")?.toString() || null;
      } catch (e) {
        console.error("Failed to parse form data:", e);
      }
    }

    if (error) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Error</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #050505; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { text-align: center; border: 1px solid #ff4b2b22; padding: 40px; border-radius: 24px; background: #0a0a0a; max-width: 400px; width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
              h1 { color: #ff4b2b; font-size: 24px; margin-bottom: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; }
              p { color: #888; font-size: 14px; line-height: 1.5; }
              .error-box { margin: 30px 0; padding: 20px; background: #000; border-radius: 12px; font-family: "Geist Mono", monospace; font-size: 14px; border: 1px solid #ff4b2b33; color: #ff4b2b; word-break: break-all; }
              button { background: #333; color: white; border: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s; }
              button:hover { background: #444; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Connection Failed</h1>
              <p>Google returned an error during the authorization process.</p>
              <div class="error-box">${error}: ${errorDescription || "No description provided"}</div>
              <button onclick="window.close()">Close Window</button>
            </div>
          </body>
        </html>
      `;
      return new Response(errorHtml, { headers: { "Content-Type": "text/html", "Cache-Control": "no-store", ...CORS_HEADERS } });
    }

    if (code) {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Connection Successful</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #050505; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { text-align: center; border: 1px solid #1a1a1a; padding: 40px; border-radius: 24px; background: #0a0a0a; max-width: 400px; width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
              h1 { color: #00f2ff; font-size: 24px; margin-bottom: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; }
              p { color: #888; font-size: 14px; line-height: 1.5; }
              .code-box { margin: 30px 0; padding: 20px; background: #000; border-radius: 12px; font-family: "Geist Mono", monospace; font-size: 16px; border: 1px solid #00f2ff33; color: #00f2ff; word-break: break-all; }
              button { background: #00f2ff; color: black; border: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s; }
              button:hover { background: #00d2dd; transform: scale(1.02); }
              button:active { transform: scale(0.98); }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Connection Ready</h1>
              <p>You have successfully authorized VELO Station. Copy the security code below and return to your dashboard to complete the sync.</p>
              <div class="code-box" id="code">${code}</div>
              <button onclick="copyCode()">Copy Security Code</button>
              <script>
                function copyCode() {
                  const code = document.getElementById('code').innerText;
                  navigator.clipboard.writeText(code).then(() => {
                    const btn = document.querySelector('button');
                    btn.innerText = 'COPIED!';
                    btn.style.background = '#39ff14';
                    setTimeout(() => {
                      btn.innerText = 'Copy Security Code';
                      btn.style.background = '#00f2ff';
                    }, 2000);
                  });
                }
              </script>
            </div>
          </body>
        </html>
      `;
      return new Response(html, { headers: { "Content-Type": "text/html", "Cache-Control": "no-store", ...CORS_HEADERS } });
    }

    // If we are here and it's a GET, check if we need to "bridge" the params from the browser
    if (req.method === "GET") {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>VELO Connection Bridge</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #050505; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { text-align: center; border: 1px solid #1a1a1a; padding: 40px; border-radius: 24px; background: #0a0a0a; max-width: 400px; width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
              h1 { color: #00f2ff; font-size: 24px; margin-bottom: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; }
              p { color: #888; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
              .loader { width: 40px; height: 40px; border: 3px solid #1a1a1a; border-top-color: #00f2ff; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
              @keyframes spin { to { transform: rotate(360deg); } }
              .hidden { display: none; }
              .code-box { margin: 20px 0; padding: 20px; background: #000; border-radius: 12px; font-family: monospace; font-size: 16px; border: 1px solid #00f2ff33; color: #00f2ff; word-break: break-all; }
              button { background: #00f2ff; color: black; border: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s; margin-top: 10px; }
              button:hover { background: #00d2dd; transform: scale(1.02); }
              .secondary { background: transparent; color: #888; border: 1px solid #333; margin-top: 10px; }
              .secondary:hover { background: #111; color: white; }
            </style>
          </head>
          <body>
            <div class="card" id="status-card">
              <div id="loading-state">
                <h1>Processing</h1>
                <p>Establishing secure connection to VELO Station...</p>
                <div class="loader"></div>
              </div>
              <div id="ready-state" class="hidden">
                <h1>Connection Ready</h1>
                <p>Authorization confirmed. Copy the security code below to complete the setup in your dashboard.</p>
                <div class="code-box" id="code-display"></div>
                <button id="copy-btn">Copy Security Code</button>
              </div>
              <div id="error-state" class="hidden">
                <h1 style="color: #ff4b2b;">Incomplete</h1>
                <p>Google returned to this page, but some connection details are missing. Please try again from the dashboard.</p>
                <button onclick="window.close()">Close Window</button>
                <button class="secondary" onclick="window.location.href='https://buildy.ai'">Open Dashboard</button>
              </div>
            </div>
            <script>
              function show(id) {
                document.getElementById('loading-state').classList.add('hidden');
                document.getElementById('ready-state').classList.add('hidden');
                document.getElementById('error-state').classList.add('hidden');
                document.getElementById(id).classList.remove('hidden');
              }

              const params = new URLSearchParams(window.location.search);
              // Also check hash in case Google uses fragment response mode
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              
              const code = params.get('code') || hashParams.get('code');
              const error = params.get('error') || hashParams.get('error');

              if (code) {
                document.getElementById('code-display').innerText = code;
                show('ready-state');
                
                document.getElementById('copy-btn').onclick = function() {
                  navigator.clipboard.writeText(code).then(() => {
                    this.innerText = 'COPIED!';
                    this.style.background = '#39ff14';
                    setTimeout(() => {
                      this.innerText = 'Copy Security Code';
                      this.style.background = '#00f2ff';
                    }, 2000);
                  });
                };
              } else if (error) {
                show('error-state');
                const p = document.querySelector('#error-state p');
                p.innerText = "Error: " + error + (params.get('error_description') ? " - " + params.get('error_description') : "");
              } else {
                // If no params, we might be hitting the info page directly or something went wrong.
                // After 2 seconds, if nothing happened, show error.
                setTimeout(() => {
                  if (document.getElementById('ready-state').classList.contains('hidden')) {
                    show('error-state');
                  }
                }, 2000);
              }
            </script>
          </body>
        </html>
      `;
      
      if (!url.searchParams.has("info")) {
        return new Response(html, { headers: { "Content-Type": "text/html", ...CORS_HEADERS } });
      }

      const infoHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>VELO Google Helper</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #050505; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { text-align: center; border: 1px solid #1a1a1a; padding: 40px; border-radius: 24px; background: #0a0a0a; max-width: 400px; width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
              h1 { color: #00f2ff; font-size: 24px; margin-bottom: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; }
              p { color: #888; font-size: 14px; line-height: 1.5; margin-bottom: 30px; }
              .status { display: inline-flex; align-items: center; gap: 8px; background: #00f2ff11; color: #00f2ff; padding: 6px 16px; border-radius: 100px; font-size: 12px; font-weight: 600; margin-bottom: 20px; border: 1px solid #00f2ff33; }
              .dot { width: 8px; height: 8px; background: #39ff14; border-radius: 50%; box-shadow: 0 0 10px #39ff14; }
              button { background: #111; color: white; border: 1px solid #333; padding: 14px 28px; border-radius: 12px; font-weight: 800; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s; }
              button:hover { background: #222; border-color: #444; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="status"><span class="dot"></span> ACTIVE</div>
              <h1>Google Connect Helper</h1>
              <p>The secure bridge for VELO identity verification is operational. Please initiate the connection from your main VELO Station dashboard.</p>
              <button onclick="window.location.href='https://buildy.ai'">Return to Dashboard</button>
            </div>
          </body>
        </html>
      `;

      return new Response(infoHtml, { headers: { "Content-Type": "text/html", "Cache-Control": "no-store", ...CORS_HEADERS } });
    }
  }

  // Handle API calls from the app (POST JSON)
  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") || "";
    
    // If it's a form-urlencoded POST from Google callback, it should have been caught in the block above.
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return new Response(JSON.stringify({ error: "Missing authorization details in callback." }), { status: 400, headers: CORS_HEADERS });
    }

    try {
      const bodyText = await req.text();
      if (!bodyText) return new Response(JSON.stringify({ error: "Empty request body" }), { status: 400, headers: CORS_HEADERS });
        
      let body;
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON payload", details: e.message }), { status: 400, headers: CORS_HEADERS });
      }
        
      const { action, code: authCode } = body;

      if (!action) {
        return new Response(JSON.stringify({ error: "Missing action in request" }), { status: 400, headers: CORS_HEADERS });
      }

      if (action === "start") {
        if (!clientId || !clientSecret) {
          return new Response(JSON.stringify({ 
            error: "Google configuration incomplete. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in your project secrets." 
          }), { status: 500, headers: CORS_HEADERS });
        }
        const state = Math.random().toString(36).substring(2, 15);
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile%20email&access_type=offline&prompt=consent&state=${state}`;
        return new Response(JSON.stringify({ authUrl, state }), { headers: CORS_HEADERS });
      }

      if (action === "callback") {
        if (!authCode) return new Response(JSON.stringify({ error: "Missing authorization code" }), { status: 400, headers: CORS_HEADERS });
        if (!clientId || !clientSecret) {
          return new Response(JSON.stringify({ error: "Google OAuth configuration incomplete." }), { status: 500, headers: CORS_HEADERS });
        }

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: authCode,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        const tokens = await tokenResponse.json();
        if (!tokenResponse.ok) {
          console.error("Token exchange failed:", tokens);
          return new Response(JSON.stringify({ error: "Failed to exchange authorization code for tokens." }), { status: 400, headers: CORS_HEADERS });
        }

        const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        
        if (!profileResponse.ok) {
          return new Response(JSON.stringify({ error: "Failed to fetch user profile from Google." }), { status: 400, headers: CORS_HEADERS });
        }
        
        const profile = await profileResponse.json();

        return new Response(JSON.stringify({ 
          success: true, 
          profile: {
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
          },
          token_metadata: {
            has_refresh_token: !!tokens.refresh_token,
            expires_in: tokens.expires_in,
            scopes: tokens.scope,
          }
        }), { headers: CORS_HEADERS });
      }

      return new Response(JSON.stringify({ error: "Unknown action: " + action }), { status: 400, headers: CORS_HEADERS });
    } catch (err) {
      console.error("Google Helper Error:", err);
      return new Response(JSON.stringify({ error: "An internal security error occurred during the Google connection process." }), { status: 500, headers: CORS_HEADERS });
    }
  }

  return new Response(JSON.stringify({ 
    error: "Method not allowed",
    debug: {
      method: req.method,
      path: url.pathname
    }
  }), { status: 405, headers: CORS_HEADERS });
});