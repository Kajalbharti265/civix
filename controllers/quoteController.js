import supabase from "../config/supabaseClient.js";

const COMMISSION_PERCENT = Number(process.env.COMMISSION_PERCENT || 2);

const getMyVendor = async (authUserId) => {
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return data;
};

// ---------- VENDOR: apni city + category ke open RFQs dekho ----------
export const getOpenRFQsForVendor = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.authUserId);
    if (!vendor) return res.status(403).json({ message: "Only vendors can view this" });

    // customer ka phone yahan jaanbujh ke select nahi kiya (privacy)
    const { data: rfqs, error } = await supabase
      .from("rfqs")
      .select("id, city, location, created_at, status, rfq_items(id, material, quantity, qty, unit, category_guess)")
      .eq("city", vendor.city)
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });

    // sirf wahi RFQ jisme koi item mere category ka ho (ya category unknown ho)
    const relevant = rfqs.filter((r) =>
      r.rfq_items.some((i) => !i.category_guess || i.category_guess === vendor.category)
    );

    const { data: myQuotes } = await supabase
      .from("quotes")
      .select("rfq_id, total_amount, status")
      .eq("vendor_id", vendor.id);
    const quoteMap = Object.fromEntries((myQuotes || []).map((q) => [q.rfq_id, q]));

    res.json({
      count: relevant.length,
      rfqs: relevant.map((r) => ({ ...r, my_quote: quoteMap[r.id] || null })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- VENDOR: quote submit/update karo ----------
export const submitQuote = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.authUserId);
    if (!vendor) return res.status(403).json({ message: "Only vendors can submit quotes" });
    if (!vendor.is_approved) {
      return res.status(403).json({ message: "Your listing is pending admin approval" });
    }

    const { rfqId } = req.params;
    const { items, delivery_charge = 0, delivery_days = 2, valid_until = null, note = "" } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Quote items are required" });
    }

    const { data: rfq } = await supabase
      .from("rfqs")
      .select("id, status, rfq_items(id, qty)")
      .eq("id", rfqId)
      .maybeSingle();

    if (!rfq) return res.status(404).json({ message: "RFQ not found" });
    if (rfq.status !== "open") return res.status(400).json({ message: "This RFQ is closed" });

    // fair comparison ke liye har item ka rate zaroori hai
    const itemMap = Object.fromEntries(rfq.rfq_items.map((i) => [i.id, i]));
    const pricedIds = new Set(items.map((i) => i.rfq_item_id));
    if (pricedIds.size !== rfq.rfq_items.length) {
      return res.status(400).json({ message: "Please price every item in the RFQ" });
    }

    let subtotal = 0;
    const rows = [];
    for (const it of items) {
      const rfqItem = itemMap[it.rfq_item_id];
      const price = Number(it.unit_price);
      if (!rfqItem || !(price > 0)) {
        return res.status(400).json({ message: "Invalid item or price" });
      }
      const qty = rfqItem.qty ? Number(rfqItem.qty) : 1;
      const lineTotal = Math.round(price * qty * 100) / 100;
      subtotal += lineTotal;
      rows.push({
        rfq_item_id: it.rfq_item_id,
        brand: it.brand || "",
        unit_price: price,
        line_total: lineTotal,
      });
    }

    const total = Math.round((subtotal + Number(delivery_charge || 0)) * 100) / 100;

    // pehle se quote hai to replace karo (accepted wala nahi)
    const { data: existing } = await supabase
      .from("quotes")
      .select("id, status")
      .eq("rfq_id", rfqId)
      .eq("vendor_id", vendor.id)
      .maybeSingle();

    if (existing?.status === "accepted") {
      return res.status(400).json({ message: "Your quote was already accepted" });
    }
    if (existing) await supabase.from("quotes").delete().eq("id", existing.id);

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert({
        rfq_id: rfqId,
        vendor_id: vendor.id,
        delivery_charge: Number(delivery_charge || 0),
        delivery_days: Number(delivery_days || 2),
        valid_until,
        note,
        total_amount: total,
      })
      .select()
      .single();

    if (quoteError) return res.status(500).json({ message: quoteError.message });

    const { error: itemsError } = await supabase
      .from("quote_items")
      .insert(rows.map((r) => ({ ...r, quote_id: quote.id })));

    if (itemsError) return res.status(500).json({ message: itemsError.message });

    res.status(201).json({ message: "Quote submitted", quote });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- BUYER: apne RFQ ke saare quotes compare karo ----------
export const getQuotesForRFQ = async (req, res) => {
  try {
    const { rfqId } = req.params;

    const { data: rfq } = await supabase
      .from("rfqs")
      .select("*, rfq_items(*)")
      .eq("id", rfqId)
      .maybeSingle();

    if (!rfq) return res.status(404).json({ message: "RFQ not found" });
    if (rfq.customer_id !== req.authUserId) {
      return res.status(403).json({ message: "This is not your RFQ" });
    }

    const { data: quotes, error } = await supabase
      .from("quotes")
      .select("*, vendors(id, company_name, rating, is_verified, city, logo_url), quote_items(*)")
      .eq("rfq_id", rfqId)
      .order("total_amount", { ascending: true });

    if (error) return res.status(500).json({ message: error.message });

    // sabse sasta (L1) mark karo
    const submitted = quotes.filter((q) => q.status === "submitted");
    const lowestId = submitted.length ? submitted[0].id : null;
    const withFlag = quotes.map((q) => ({ ...q, is_lowest: q.id === lowestId }));

    res.json({ rfq, count: withFlag.length, quotes: withFlag });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- BUYER: quote accept karo -> order ban jaata hai ----------
export const acceptQuote = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { delivery_address } = req.body;

    if (!delivery_address) {
      return res.status(400).json({ message: "Delivery address is required" });
    }

    const { data: quote } = await supabase
      .from("quotes")
      .select("*, rfqs(id, customer_id, status)")
      .eq("id", quoteId)
      .maybeSingle();

    if (!quote) return res.status(404).json({ message: "Quote not found" });
    if (quote.rfqs.customer_id !== req.authUserId) {
      return res.status(403).json({ message: "This is not your RFQ" });
    }
    if (quote.rfqs.status !== "open" || quote.status !== "submitted") {
      return res.status(400).json({ message: "This quote can no longer be accepted" });
    }

    const commission = Math.round(quote.total_amount * COMMISSION_PERCENT) / 100;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        rfq_id: quote.rfq_id,
        quote_id: quote.id,
        customer_id: req.authUserId,
        vendor_id: quote.vendor_id,
        total_amount: quote.total_amount,
        commission_amount: commission,
        delivery_address,
      })
      .select()
      .single();

    if (orderError) return res.status(500).json({ message: orderError.message });

    await supabase.from("quotes").update({ status: "accepted" }).eq("id", quoteId);
    await supabase
      .from("quotes")
      .update({ status: "rejected" })
      .eq("rfq_id", quote.rfq_id)
      .neq("id", quoteId);
    await supabase.from("rfqs").update({ status: "closed" }).eq("id", quote.rfq_id);

    res.status(201).json({ message: "Order confirmed!", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};