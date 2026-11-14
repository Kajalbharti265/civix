import express from "express";
import { listNotifications, unreadCount, markRead, markAllRead } from "../controllers/notificationController.js";
import { requireUserAuth } from "../middleware/userAuth.js";

const router = express.Router();

router.get("/", requireUserAuth, listNotifications);
router.get("/unread-count", requireUserAuth, unreadCount);
router.patch("/read-all", requireUserAuth, markAllRead);
router.patch("/:id/read", requireUserAuth, markRead);

export default router;