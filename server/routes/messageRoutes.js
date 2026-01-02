import express from "express";
import { getMessages, getUsersForSidebar, markMesageAsSeen, sendMessage, deleteChat } from "../controllers/messageController.js";
import { protectRoute } from './../middleware/auth.js';

const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUsersForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark/:id", protectRoute, markMesageAsSeen);
messageRouter.post("/send/:id", protectRoute, sendMessage);
messageRouter.delete("/delete/:id", protectRoute, deleteChat);

export default messageRouter;
