Deno.serve(async (req) => {
  return new Response(JSON.stringify({ status: "ok", renamed: true }));
});
