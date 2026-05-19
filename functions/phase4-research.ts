
Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return new Response(JSON.stringify({ error: "Empty request body" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { action, department, payload } = body;
    const query = payload?.query || payload?.prompt || "General Research";

    // Helper to fetch from public sources
    const fetchPublicData = async (query: string) => {
      const findings = [];
      const sources = [];
      const keyDataPoints = [];
      let success = false;

      try {
        // 1. Wikipedia Search
        const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`, { signal: AbortSignal.timeout(5000) });
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          const searchResults = wikiData.query?.search || [];
          if (searchResults.length > 0) {
            success = true;
            searchResults.slice(0, 3).forEach((result: any) => {
              findings.push(result.snippet.replace(/<\/?[^>]+(>|$)/g, ""));
              sources.push({ title: result.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}` });
              keyDataPoints.push(`Wikipedia: ${result.title}`);
            });
          }
        }

        // 2. Hacker News Search
        const hnRes = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story`, { signal: AbortSignal.timeout(5000) });
        if (hnRes.ok) {
          const hnData = await hnRes.json();
          const hits = hnData.hits || [];
          if (hits.length > 0) {
            success = true;
            hits.slice(0, 3).forEach((hit: any) => {
              findings.push(hit.title);
              sources.push({ title: `HN: ${hit.title}`, url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}` });
              keyDataPoints.push(`Hacker News: ${hit.points} points, ${hit.num_comments} comments`);
            });
          }
        }

        // 3. GitHub Search
        const ghRes = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc`, { 
          headers: { "User-Agent": "VELO-Research-Agent" },
          signal: AbortSignal.timeout(5000) 
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const repos = ghData.items || [];
          if (repos.length > 0) {
            success = true;
            repos.slice(0, 3).forEach((repo: any) => {
              findings.push(`${repo.full_name}: ${repo.description || "No description"}`);
              sources.push({ title: `GitHub: ${repo.full_name}`, url: repo.html_url });
              keyDataPoints.push(`GitHub: ${repo.stargazers_count} stars, ${repo.language || "various languages"}`);
            });
          }
        }
      } catch (err) {
        console.error("[VELO] Public fetch error:", err);
      }

      if (!success) {
        return {
          success: false,
          summary: "No public data found for this query.",
          findings: "The search did not yield immediate results from Wikipedia, Hacker News, or GitHub. This may be due to the specificity of the query or temporary source unavailability.",
          key_data_points: ["Manual verification required"],
          sources: [],
          limitations: ["Public API search failed or returned no hits"],
          confidence: 0,
          fallback_used: true
        };
      }

      return {
        success: true,
        summary: `Research scan complete. Analyzed data from Wikipedia, Hacker News, and GitHub.`,
        findings: findings.join("\n\n"),
        key_data_points: keyDataPoints,
        sources: sources,
        limitations: ["Data restricted to public API responses", "Real-time market depth may be limited"],
        confidence: 85,
        fallback_used: false
      };
    };

    if (action === "market_scan" || action === "readiness_test" || action === "research_brief" || action === "signal_horizon") {
      const researchData = await fetchPublicData(query);
      
      return new Response(JSON.stringify({
        ...researchData,
        query
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action or department" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
