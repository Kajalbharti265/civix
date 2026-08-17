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

// ---------- UPLOAD vendor logo/image ----------
export const uploadVendorLogo = async (req, res) => {
  try {
    const { vendorId } = req.body; // temporary: form me vendorId bhi bhejna hoga
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (!vendorId) return res.status(400).json({ message: "vendorId is required" });

    const fileName = `${vendorId}-${Date.now()}.${req.file.originalname.split(".").pop()}`;

    // Supabase Storage bucket me upload karo
    const { error: uploadError } = await supabase.storage
      .from("vendor-logos")
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) return res.status(500).json({ message: uploadError.message });

    // public URL nikalo
    const { data: publicUrlData } = supabase.storage
      .from("vendor-logos")
      .getPublicUrl(fileName);

    // vendors table me logo_url update karo
    const { data: vendor, error: updateError } = await supabase
      .from("vendors")
      .update({ logo_url: publicUrlData.publicUrl })
      .eq("id", vendorId)
      .select()
      .single();

    if (updateError) return res.status(500).json({ message: updateError.message });

    res.json({ message: "Logo uploaded successfully", vendor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// ---------- ADMIN: get all vendors (approved + pending) ----------
export const getAllVendorsAdmin = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json({ count: data.length, vendors: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- ADMIN: approve vendor ----------
export const approveVendor = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vendors")
      .update({ is_approved: true })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "Vendor approved", vendor: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- ADMIN: verify vendor (blue tick) ----------
export const verifyVendor = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vendors")
      .update({ is_verified: true })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "Vendor verified", vendor: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- GET my vendor profile (protected) ----------
export const getMyVendorProfile = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("auth_user_id", req.authUserId)
      .single();

    if (error) return res.status(404).json({ message: "Vendor profile not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- UPDATE my vendor profile (protected, optional logo) ----------
export const updateMyVendorProfile = async (req, res) => {
  try {
    const updates = {};
    const allowed = ["company_name", "owner_name", "phone", "role", "category", "city", "materials"];
    allowed.forEach((f) => {
      const bodyKey = f.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); // snake->camel match
      if (req.body[bodyKey] !== undefined) updates[f] = req.body[bodyKey];
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    // agar naya logo bheja hai to upload kar
    if (req.file) {
      const fileName = `${req.authUserId}-${Date.now()}.${req.file.originalname.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("vendor-logos")
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
      if (uploadError) return res.status(500).json({ message: uploadError.message });

      const { data: publicUrlData } = supabase.storage.from("vendor-logos").getPublicUrl(fileName);
      updates.logo_url = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("vendors")
      .update(updates)
      .eq("auth_user_id", req.authUserId)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "Profile updated successfully", vendor: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- ADMIN: analytics/stats ----------
export const getAnalytics = async (req, res) => {
  try {
    const { data: vendors, error: vError } = await supabase.from("vendors").select("*");
    if (vError) return res.status(500).json({ message: vError.message });

    const { data: rfqs, error: rError } = await supabase.from("rfqs").select("*");
    if (rError) return res.status(500).json({ message: rError.message });

    const { data: reviews } = await supabase.from("reviews").select("rating");

    const cityBreakdown = {};
    const categoryBreakdown = {};
    let approvedCount = 0;
    let verifiedCount = 0;

    vendors.forEach((v) => {
      cityBreakdown[v.city] = (cityBreakdown[v.city] || 0) + 1;
      categoryBreakdown[v.category] = (categoryBreakdown[v.category] || 0) + 1;
      if (v.is_approved) approvedCount++;
      if (v.is_verified) verifiedCount++;
    });

    const avgRating = reviews && reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    res.json({
      totalVendors: vendors.length,
      approvedVendors: approvedCount,
      pendingVendors: vendors.length - approvedCount,
      verifiedVendors: verifiedCount,
      totalRFQs: rfqs.length,
      totalReviews: reviews ? reviews.length : 0,
      avgRating,
      cityBreakdown,
      categoryBreakdown,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};