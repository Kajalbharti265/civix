import express from "express";
import {
  getVendors, getVendorById, uploadVendorLogo,
  getAllVendorsAdmin, approveVendor, verifyVendor,
  getMyVendorProfile, updateMyVendorProfile,
} from "../controllers/vendorController.js";
import upload from "../middleware/upload.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { requireVendorAuth } from "../middleware/vendorAuth.js";

const router = express.Router();

router.get("/", getVendors);
router.post("/upload-logo", upload.single("logo"), uploadVendorLogo);

router.get("/admin/all", requireAdmin, getAllVendorsAdmin);
router.patch("/admin/:id/approve", requireAdmin, approveVendor);
router.patch("/admin/:id/verify", requireAdmin, verifyVendor);

router.get("/me", requireVendorAuth, getMyVendorProfile);
router.put("/me", requireVendorAuth, upload.single("logo"), updateMyVendorProfile);

router.get("/:id", getVendorById);

export default router;