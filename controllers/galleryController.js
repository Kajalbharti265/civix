import supabase from "../config/supabaseClient.js";

// ---------- UPLOAD gallery image (protected — vendor only) ----------
export const uploadGalleryImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // vendor ka id nikaal lo auth token se
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id")
      .eq("auth_user_id", req.authUserId)
      .single();
    if (vendorError || !vendor) return res.status(404).json({ message: "Vendor profile not found" });

    const fileName = `${vendor.id}-${Date.now()}-${req.file.originalname.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage
      .from("vendor-gallery")
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadError) return res.status(500).json({ message: uploadError.message });

    const { data: publicUrlData } = supabase.storage.from("vendor-gallery").getPublicUrl(fileName);

    const { data: image, error: insertError } = await supabase
      .from("gallery_images")
      .insert({
        vendor_id: vendor.id,
        image_url: publicUrlData.publicUrl,
        caption: req.body.caption || "",
      })
      .select()
      .single();

    if (insertError) return res.status(500).json({ message: insertError.message });
    res.status(201).json({ message: "Photo added to gallery", image });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- GET gallery for a vendor (public) ----------
export const getVendorGallery = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json({ count: data.length, images: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- DELETE own gallery image (protected — vendor only) ----------
export const deleteGalleryImage = async (req, res) => {
  try {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("auth_user_id", req.authUserId)
      .single();
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });

    const { error } = await supabase
      .from("gallery_images")
      .delete()
      .eq("id", req.params.imageId)
      .eq("vendor_id", vendor.id); // safety: apni hi image delete kar sake

    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: "Photo removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};