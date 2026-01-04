import Message from "../models/Message.js"
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js"
import { io, userSocketMap } from "../server.js";
import mongoose from 'mongoose'

//Get all users except the logged in user, prioritizing users who have chatted with the current user
export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;

        // Use aggregation pipeline to efficiently get all data in one query
        const usersWithData = await User.aggregate([
            // Match all users except the current user
            {
                $match: {
                    _id: { $ne: userId }
                }
            },
            // Lookup messages to calculate unseen counts and determine if chatted
            {
                $lookup: {
                    from: 'messages',
                    let: { userId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $and: [{ $eq: ['$senderId', '$$userId'] }, { $eq: ['$receiverId', userId] }] },
                                        { $and: [{ $eq: ['$senderId', userId] }, { $eq: ['$receiverId', '$$userId'] }] }
                                    ]
                                }
                            }
                        },
                        // Group to get unseen count and last message timestamp
                        {
                            $group: {
                                _id: null,
                                unseenCount: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ['$senderId', '$$userId'] },
                                                    { $eq: ['$receiverId', userId] },
                                                    { $eq: ['$seen', false] }
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                lastMessageAt: { $max: '$createdAt' },
                                messageCount: { $sum: 1 }
                            }
                        }
                    ],
                    as: 'messageData'
                }
            },
            // Add computed fields
            {
                $addFields: {
                    unseenMessages: {
                        $ifNull: [{ $arrayElemAt: ['$messageData.unseenCount', 0] }, 0]
                    },
                    lastMessageAt: {
                        $ifNull: [{ $arrayElemAt: ['$messageData.lastMessageAt', 0] }, null]
                    },
                    hasChatted: {
                        $gt: [{ $ifNull: [{ $arrayElemAt: ['$messageData.messageCount', 0] }, 0] }, 0]
                    }
                }
            },
            // Remove password field
            {
                $project: {
                    password: 0,
                    messageData: 0
                }
            },
            // Sort: chatted users first (by last message time), then others
            {
                $sort: {
                    hasChatted: -1,
                    lastMessageAt: -1
                }
            }
        ]);

        // Extract unseen messages for backward compatibility
        const unseenMessages = {};
        usersWithData.forEach(user => {
            if (user.unseenMessages > 0) {
                unseenMessages[user._id] = user.unseenMessages;
            }
        });

        res.json({ success: true, users: usersWithData, unseenMessages })
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
            // Upload with aggressive optimization for faster processing
            const uploadResponse = await cloudinary.uploader.upload(image, {
                transformation: [
                    { width: 600, height: 600, crop: 'limit' }, // Smaller dimensions
                    { quality: 'auto:eco' }, // Eco quality for faster loading
                    { fetch_format: 'auto' }, // Auto format
                    { progressive: true } // Progressive loading
                ],
                // Remove eager transformations to speed up upload
                resource_type: 'auto' // Auto detect resource type
            })
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
