import express from "express";
import { uploadGalleryImage, getVendorGallery, deleteGalleryImage } from "../controllers/galleryController.js";
import upload from "../middleware/upload.js";
import { requireVendorAuth } from "../middleware/vendorAuth.js";

const router = express.Router({ mergeParams: true });

router.get("/", getVendorGallery);
router.post("/", requireVendorAuth, upload.single("photo"), uploadGalleryImage);
router.delete("/:imageId", requireVendorAuth, deleteGalleryImage);

export default router;