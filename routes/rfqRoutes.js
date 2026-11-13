import express from "express";
import { postRFQ, getMyRFQs } from "../controllers/rfqController.js";
import { requireUserAuth } from "../middleware/userAuth.js";

const router = express.Router();

router.post("/", requireUserAuth, postRFQ);
router.get("/my", requireUserAuth, getMyRFQs);

export default router;