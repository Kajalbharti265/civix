import supabase from "../config/supabaseClient.js";

// ---------- CUSTOMER SIGNUP ----------
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, city } = req.body;

    // 1. Supabase Auth me user banao
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) return res.status(400).json({ message: authError.message });

    // 2. profiles table me extra info save karo
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      name,
      phone,
      city,
    });
    if (profileError) return res.status(400).json({ message: profileError.message });

    res.status(201).json({
      message: "Signup successful",
      user: { id: authData.user.id, email, name, city },
      session: authData.session, // access_token yahan milega
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- CUSTOMER LOGIN ----------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ message: error.message });

    // profile bhi fetch kar lo saath me
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    res.json({
      message: "Login successful",
      user: { id: data.user.id, email: data.user.email, ...profile },
      session: data.session,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- VENDOR SIGNUP ----------
export const registerVendor = async (req, res) => {
  try {
    const { companyName, ownerName, email, password, phone, role, category, city, materials } = req.body;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) return res.status(400).json({ message: authError.message });

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .insert({
        auth_user_id: authData.user.id,
        company_name: companyName,
        owner_name: ownerName,
        email,
        phone,
        role,
        category,
        city,
        materials,
      })
      .select()
      .single();

    if (vendorError) return res.status(400).json({ message: vendorError.message });

    res.status(201).json({
      message: "Vendor signup successful. Pending admin approval.",
      vendor,
      session: authData.session,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- VENDOR LOGIN ----------
export const loginVendor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ message: error.message });

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("*")
      .eq("auth_user_id", data.user.id)
      .single();
    if (vendorError) return res.status(400).json({ message: "Vendor profile not found" });

    res.json({
      message: "Login successful",
      vendor,
      session: data.session,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- FORGOT PASSWORD (works for both customer & vendor, same auth system) ----------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_BASE_URL}/reset-password.html`,
    });

    if (error) return res.status(400).json({ message: error.message });
    res.json({ message: "If this email is registered, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};