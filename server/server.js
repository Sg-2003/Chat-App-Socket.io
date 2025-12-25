import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";


// Create Express app and HTTP server
const app = express();
const server = http.createServer(app)

//Initialize socket.io server
export const io = new Server(server, {
    cors: { origin: "*" }
})

// Store online users
export const userSocketMap = {}; //{userId:socketId}

// Socket.io connection Handler
io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log("User Connected", userId, "socketId:", socket.id);

    if (userId) userSocketMap[userId] = socket.id;

    //Emit online users to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        console.log("User Disconnected", userId, "socketId:", socket.id);
        // Only remove the user mapping if this socket is the current one
        if (userSocketMap[userId] === socket.id) {
            delete userSocketMap[userId];
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap))
    })
})

// Middleware setup
// Increase JSON / urlencoded payload limits to allow base64 image uploads from client
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cors());

// Graceful handler for requests that exceed payload limits
app.use((err, req, res, next) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
        console.warn('Payload too large for request:', req.originalUrl);
        return res.status(413).json({ success: false, message: 'Payload too large. Reduce file size or configure larger limits.' });
    }
    return next(err);
});

//Routes setup
app.use("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// Connect to MongoDB
await connectDB();

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log("Server is running on PORT: " + PORT));
}

//Export server for vercel
export default server;