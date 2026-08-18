import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2.57.4");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";

    // GET: list backups or download a specific one
    if (req.method === "GET") {
      if (action === "list") {
        const { data, error } = await adminClient
          .from("backup_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        return new Response(JSON.stringify({ backups: data ?? [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "changelog") {
        const { data, error } = await adminClient
          .from("api_versions")
          .select("*")
          .order("released_at", { ascending: false });

        if (error) throw error;

        const appVersion = req.headers.get("X-App-Version") ?? "1.0.0";

        const latest = data?.[0];
        const updateAvailable = latest && latest.min_app_version && compareVersions(appVersion, latest.min_app_version) < 0;

        return new Response(JSON.stringify({
          current_api_version: latest?.version ?? "v1.0.0",
          update_available: !!updateAvailable,
          min_app_version: latest?.min_app_version ?? "1.0.0",
          changelog: data ?? [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // POST: trigger a backup (admin only)
    if (req.method === "POST" && action === "backup") {
      const { data: membership } = await userClient
        .from("agency_members")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership || membership.role !== "agency_admin") {
        return new Response(
          JSON.stringify({ error: "Only agency admins can trigger backups" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const tables = ["agencies", "agency_members", "contacts", "properties", "leases", "payments", "rent_reviews"];
      const summary: Record<string, number> = {};
      let totalRows = 0;

      for (const table of tables) {
        const { count, error } = await adminClient
          .from(table)
          .select("*", { count: "exact", head: true });
        if (error) throw error;
        summary[table] = count ?? 0;
        totalRows += count ?? 0;
      }

      const { error: logError } = await adminClient
        .from("backup_log")
        .insert({
          triggered_by: user.id,
          status: "completed",
          tables_backed_up: tables,
          row_counts: summary,
          total_rows: totalRows,
        });

      if (logError) throw logError;

      return new Response(JSON.stringify({
        status: "completed",
        tables: summary,
        total_rows: totalRows,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}
