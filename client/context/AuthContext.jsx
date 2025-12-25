import { createContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [token,setToken] = useState(localStorage.getItem("token"));
    const [authUser,setAuthUser] = useState(null);
    const [onlineUsers,setOnlineUsers] = useState([]);
    const [socket,setSocket] = useState(null);
    const socketRef = useRef(null);


// Login Function to handle user authentication and Socket connection
    const login = async(state, credentials)=>{
        try{
            // server expects POST for signup/login
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if(data.success){
                setAuthUser(data.userData);
                connectSocket(data.userData);

                setToken(data.token);
                localStorage.setItem("token", data.token);
                toast.success(data.message);
            }else{
                toast.error(data.message);
            }
        } catch(error){
            // prefer server message when available
            toast.error(error.response?.data?.message || error.message);
        }
    }

// Logout Function to handle user logout and Socket disconnection
    const logout = async()=>{
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        axios.defaults.headers.common["token"] = null;
        toast.success("Logged out successfully");
        // guard against null socket and clear refs
        socketRef.current?.disconnect();
        socketRef.current = null;
        setSocket(null);
    }

// update profile function to handle user profile updates
    const updateProfile = async(body)=>{
        try{
            const {data} = await axios.put("/api/auth/update-profile",body);
            if(data.success){
                setAuthUser(data.user);
                toast.success("Profile updated successfully");
            }
        } catch(error){
            toast.error(error.message);
        }
    }

    // connect socket function to handle socket connection and online users updates
    const connectSocket = useCallback((userData)=>{
        if(!userData || socketRef.current?.connected) return;
        const newSocket = io(backendUrl,{
            query: {
                userId: userData._id,
            }
        });
        // track socket in a ref to avoid race conditions creating multiple sockets
        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on("getOnlineUsers",(userIds)=>{
            setOnlineUsers(userIds);
        })
    },[])
        useEffect(()=>{
            const checkAuth = async ()=>{
                try{
                    const{ data }=await axios.get("/api/auth/check");
                    if(data.success){
                        setAuthUser(data.user)
                        connectSocket(data.user)
                    }
                } catch(error){
                    toast.error(error.response?.data?.message || error.message)
                }
            }

            if(token){
                axios.defaults.headers.common["token"] = token;
                checkAuth();
            }
        },[token, connectSocket])

    const value ={
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile,
    }

return(
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
)
}