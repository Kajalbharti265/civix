import express from "express";
import { postRFQ, getMyRFQs } from "../controllers/rfqController.js";

const router = express.Router();

router.post("/", postRFQ);
router.get("/my", getMyRFQs);

export default router;