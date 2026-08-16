import supabase from "../config/supabaseClient.js";

// ---------- GET vendors (public) — city/category/search filter ----------
export const getVendors = async (req, res) => {
  try {
    const { city, category, search } = req.query;

    let query = supabase
      .from("vendors")
      .select("*")
      .eq("is_approved", true)
      .order("is_verified", { ascending: false })
      .order("rating", { ascending: false });

    if (city && city !== "all") query = query.eq("city", city);
    if (category && category !== "all") query = query.eq("category", category);
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,materials.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ message: error.message });

    res.json({ count: data.length, vendors: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- GET single vendor ----------
export const getVendorById = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) return res.status(404).json({ message: "Vendor not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};