import Message from "../models/Message.js"
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js"
import { io, userSocketMap } from "../server.js";
import mongoose from 'mongoose'

//Get all users except the logged in user, prioritizing users who have chatted with the current user
export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find users who have sent or received messages from the current user
        const usersWithMessages = await Message.distinct("senderId", { receiverId: userId });
        const usersReceivedFrom = await Message.distinct("receiverId", { senderId: userId });

        const chattedUserIdsSet = new Set([...usersWithMessages, ...usersReceivedFrom].map(id => id.toString()).filter(id => id !== userId.toString()));

        // Get all other users (except the current user)
        const allOtherUsers = await User.find({ _id: { $ne: userId } }).select("-password");

        // Count number of unseen messages for each user (if any)
        const unseenMessages = {}
        const countPromises = allOtherUsers.map(async (user) => {
            const count = await Message.countDocuments({ senderId: user._id, receiverId: userId, seen: false });
            if (count > 0) unseenMessages[user._id] = count;
        });
        await Promise.all(countPromises);

        // Order users: first those who have chatted, then the rest
        const chattedUsers = allOtherUsers.filter(u => chattedUserIdsSet.has(u._id.toString()));
        const otherUsers = allOtherUsers.filter(u => !chattedUserIdsSet.has(u._id.toString()));

        const orderedUsers = [...chattedUsers, ...otherUsers];

        res.json({ success: true, users: orderedUsers, unseenMessages })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

//Get all messages for selected user
export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId },
            ]
        })
        await Message.updateMany({ senderId: selectedUserId, receiverId: myId }, { seen: true });

        res.json({
            success: true,
            messages
        })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

//api to mark messages as seen using message id
export const markMesageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, { seen: true })

        res.json({
            success: true
        })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

//send messages to selected user
export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image)
            imageUrl = uploadResponse.secure_url;
        }
        const newMessageDoc = await Message.create({
            senderId,
            receiverId,
            text,
            image: imageUrl
        })

        // Convert to plain object and normalize id fields to strings to avoid client-side mismatches
        const newMessage = newMessageDoc.toObject();
        newMessage._id = String(newMessage._id);
        newMessage.senderId = String(newMessage.senderId);
        newMessage.receiverId = String(newMessage.receiverId);

        // Emit the new message to receiver and sender (if connected) so both update via sockets
        const receiverSocketId = userSocketMap[String(receiverId)];
        const senderSocketId = userSocketMap[String(senderId)];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }
        if (senderSocketId) {
            io.to(senderSocketId).emit("newMessage", newMessage);
        }

        res.json({
            success: true,
            newMessage
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

//delete all messages between current user and selected user
export const deleteChat = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        console.log('Delete chat request', { myId: String(myId), selectedUserId, tokenHeader: req.headers.token });

        // Ensure consistent ObjectId usage when deleting to avoid type mismatches
        const aId = new mongoose.Types.ObjectId(myId);
        const bId = new mongoose.Types.ObjectId(selectedUserId);

        const result = await Message.deleteMany({
            $or: [
                { senderId: aId, receiverId: bId },
                { senderId: bId, receiverId: aId },
            ]
        })

        // Log deletion result for debugging
        console.log(`Deleted ${result.deletedCount} messages between ${myId} and ${selectedUserId}`)

        // Notify both participants (if connected) so their UIs can update immediately and include the partnerId
        const payload = { deletedBy: String(myId), partnerId: String(selectedUserId) };
        const otherSocketId = userSocketMap[String(selectedUserId)];
        const mySocketId = userSocketMap[String(myId)];
        if (otherSocketId) {
            io.to(otherSocketId).emit("chatDeleted", payload);
        }
        if (mySocketId) {
            io.to(mySocketId).emit("chatDeleted", payload);
        }

        res.json({
            success: true,
            message: "Chat deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}
