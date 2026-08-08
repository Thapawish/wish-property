import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use the caller's JWT so RLS applies — this ensures the user only
    // sees data belonging to their own agency.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up the user's agency membership
    const { data: membership, error: memberError } = await supabase
      .from("agency_members")
      .select("agency_id, role, agencies(id, name, plan)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: "No agency membership found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const agencyId = membership.agency_id;

    // Fetch all data for the dashboard in parallel
    const [
      { data: properties },
      { data: leases },
      { data: payments },
      { data: rentReviews },
    ] = await Promise.all([
      supabase.from("properties").select("*").eq("agency_id", agencyId),
      supabase.from("leases").select("*").eq("agency_id", agencyId),
      supabase.from("payments").select("*").eq("agency_id", agencyId),
      supabase.from("rent_reviews").select("*").eq("agency_id", agencyId),
    ]);

    // Compute summary metrics
    const leasedCount = (properties ?? []).filter((p: any) => p.status === "leased").length;
    const vacantCount = (properties ?? []).filter((p: any) => p.status === "vacant").length;
    const pendingCount = (properties ?? []).filter((p: any) => p.status === "pending").length;
    const activeLeases = (leases ?? []).filter((l: any) => l.status === "active").length;
    const overduePayments = (payments ?? []).filter((p: any) => p.status === "overdue");
    const totalArrears = overduePayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const monthlyRent = (leases ?? [])
      .filter((l: any) => l.status === "active")
      .reduce((s: number, l: any) => s + Number(l.rent_amount), 0);
    const totalCollected = (payments ?? [])
      .filter((p: any) => p.status === "paid")
      .reduce((s: number, p: any) => s + Number(p.amount), 0);

    // Leases expiring within 30 days
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expiringSoon = (leases ?? []).filter((l: any) => {
      if (l.status !== "active") return false;
      const end = new Date(l.end_date);
      end.setHours(0, 0, 0, 0);
      const days = Math.round((end.getTime() - now.getTime()) / 86400000);
      return days >= 0 && days <= 30;
    }).map((l: any) => {
      const prop = (properties ?? []).find((p: any) => p.id === l.property_id);
      const end = new Date(l.end_date);
      end.setHours(0, 0, 0, 0);
      const days = Math.round((end.getTime() - now.getTime()) / 86400000);
      return {
        lease_id: l.id,
        property_address: prop?.address ?? "Unknown",
        property_suburb: prop?.suburb ?? null,
        end_date: l.end_date,
        days_remaining: days,
        rent_amount: Number(l.rent_amount),
      };
    });

    // Arrears trend (last 6 months)
    const arrearsTrend: { month: string; arrears: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("en-AU", { month: "short" });
      const monthPayments = (payments ?? []).filter((p: any) => {
        const pd = new Date(p.due_date);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      });
      const arrears = monthPayments
        .filter((p: any) => p.status === "overdue")
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      arrearsTrend.push({ month: label, arrears });
    }

    // Pending rent reviews
    const pendingReviews = (rentReviews ?? []).filter((r: any) => r.status === "pending").length;

    const summary = {
      agency: {
        id: membership.agencies.id,
        name: membership.agencies.name,
        plan: membership.agencies.plan,
      },
      user_role: membership.role,
      stats: {
        total_properties: (properties ?? []).length,
        leased_properties: leasedCount,
        vacant_properties: vacantCount,
        pending_properties: pendingCount,
        occupancy_rate: (properties ?? []).length
          ? Math.round((leasedCount / (properties ?? []).length) * 100)
          : 0,
        active_leases: activeLeases,
        monthly_rent: monthlyRent,
        total_arrears: totalArrears,
        total_collected: totalCollected,
        overdue_payments_count: overduePayments.length,
        pending_rent_reviews: pendingReviews,
      },
      arrears_trend: arrearsTrend,
      expiring_leases: expiringSoon,
      generated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(summary), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-API-Version": "v1.1.0",
        "X-Min-App-Version": "1.0.0",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
