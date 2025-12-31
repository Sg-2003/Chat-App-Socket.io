import { useState, useContext, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import toast from 'react-hot-toast';
import { ChatContext } from './ChatContextCore';


export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [lastMessagedAt, setLastMessagedAt] = useState({});
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const { socket, axios } = useContext(AuthContext);

    //function to get all users for sidebar
    const getUsers = useCallback(async () => {
        try {
            if (!axios) throw new Error('No axios instance');
            const { data } = await axios.get("/api/messages/users");
            if (data.success) {
                setUsers(data.users.sort((a, b) => {
                    const aTime = lastMessagedAt[a._id] || 0;
                    const bTime = lastMessagedAt[b._id] || 0;
                    return bTime - aTime; // Most recent first
                }));
                setUnseenMessages(data.unseenMessages);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    }, [axios])

    //function to get messages for selected user
    const getMessages = useCallback(async (userId) => {
        try {
            if (!axios) throw new Error('No axios instance');
            const { data } = await axios.get(`/api/messages/${userId}`);
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    }, [axios])

    //function to send messages to selected user
    const sendMessage = useCallback(async (messageData) => {
        try {
            if (!selectedUser) {
                toast.error('No recipient selected');
                return;
            }
            if (!axios) throw new Error('No axios instance');
            const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, messageData);
            if (data.success) {
                setMessages((prevMessages) => [...prevMessages, data.newMessage])
                // Update last messaged time and sort users
                const now = Date.now();
                setLastMessagedAt(prev => ({ ...prev, [selectedUser._id]: now }));
                setUsers(prevUsers => {
                    return [...prevUsers].sort((a, b) => {
                        const aTime = a._id === selectedUser._id ? now : (lastMessagedAt[a._id] || 0);
                        const bTime = b._id === selectedUser._id ? now : (lastMessagedAt[b._id] || 0);
                        return bTime - aTime; // Most recent first
                    });
                });
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    }, [axios, selectedUser])

    // subscribe to socket messages and clean up the specific handler
    useEffect(() => {
        if (!socket) return;

        const handler = (newMessage) => {
            try {
                if (selectedUser && newMessage.senderId === selectedUser._id) {
                    newMessage.seen = true;
                    setMessages((prevMessages) => [...prevMessages, newMessage]);
                    axios?.put(`/api/messages/mark/${newMessage._id}`).catch(() => { });
                } else {
                    setUnseenMessages((prevUnseenMessages) => ({
                        ...prevUnseenMessages,
                        [newMessage.senderId]: prevUnseenMessages[newMessage.senderId] ? prevUnseenMessages[newMessage.senderId] + 1 : 1
                    }))
                    // Update last messaged time and sort users for received message
                    const now = Date.now();
                    setLastMessagedAt(prev => ({ ...prev, [newMessage.senderId]: now }));
                    setUsers(prevUsers => {
                        return [...prevUsers].sort((a, b) => {
                            const aTime = a._id === newMessage.senderId ? now : (lastMessagedAt[a._id] || 0);
                            const bTime = b._id === newMessage.senderId ? now : (lastMessagedAt[b._id] || 0);
                            return bTime - aTime; // Most recent first
                        });
                    });
                    // Show notification for new message
                    toast.success(`New message from ${newMessage.senderName || 'someone'}`);
                }
            } catch (err) {
                // don't let socket handler throw
                console.error('Error handling newMessage', err);
            }
        };

        socket.on('newMessage', handler);
        return () => {
            socket.off('newMessage', handler);
        }
    }, [socket, selectedUser, axios]);

    const value = {
        messages,
        users,
        selectedUser,
        getUsers,
        getMessages,
        sendMessage,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
    }
    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}
