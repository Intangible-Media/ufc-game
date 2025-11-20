// app/api/server-time/route.js
export async function GET() {
  return new Response(
    JSON.stringify({ serverTime: Date.now() }), // ms since epoch from server
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
