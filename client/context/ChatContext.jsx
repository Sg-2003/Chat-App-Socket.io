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
    const [showRightSidebar, setShowRightSidebar] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState(null);

    const { socket, axios, authUser } = useContext(AuthContext);

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
    }, [axios, lastMessagedAt])

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
                // Update last messaged time and sort users using the updated timestamps map
                const now = Date.now();
                setLastMessagedAt(prev => {
                    const updated = { ...prev, [selectedUser._id]: now };
                    setUsers(prevUsers => {
                        return [...prevUsers].sort((a, b) => {
                            const aTime = a._id === selectedUser._id ? now : (updated[a._id] || 0);
                            const bTime = b._id === selectedUser._id ? now : (updated[b._id] || 0);
                            return bTime - aTime; // Most recent first
                        });
                    });
                    return updated;
                });
                // Reset unseen message count for the recipient in local UI
                setUnseenMessages(prev => ({ ...prev, [selectedUser._id]: 0 }));
                // Notify the user that the message was sent
                toast.success(`Message sent to ${selectedUser.fullName}`);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    }, [axios, selectedUser, setUnseenMessages])

    //function to delete chat with selected user
    const deleteChat = useCallback(async (userId) => {
        try {
            if (!axios) throw new Error('No axios instance');
            console.log('Deleting chat for userId:', userId);
            setDeletingUserId(userId);
            const { data } = await axios.delete(`/api/messages/delete/${userId}`);
            console.log('Delete response:', data);
            if (data.success) {
                // If no messages were deleted, still refresh to ensure ordering is updated
                if (data.deletedCount === 0) {
                    toast('No messages found to delete (already cleared). Refreshing view.', { icon: 'ℹ️' });
                } else {
                    toast.success('Chat deleted successfully');
                }
                // Clear local conversation-specific state
                setUnseenMessages(prev => ({ ...prev, [userId]: 0 }));
                setLastMessagedAt(prev => {
                    const copy = { ...prev };
                    delete copy[userId];
                    return copy;
                });
                if (selectedUser && String(selectedUser._id) === String(userId)) {
                    setSelectedUser(null);
                    setMessages([]);
                }
                // Refresh sidebar ordering and unseen counts from server
                await getUsers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Error deleting chat', error);
            toast.error(error.response?.data?.message || error.message || 'Delete failed');
        } finally {
            setDeletingUserId(null);
        }
    }, [axios, selectedUser, getUsers])

    // subscribe to socket messages and clean up the specific handler
    useEffect(() => {
        if (!socket) return;

        const handler = (newMessage) => {
            try {
                // normalize ids to strings to avoid type mismatches between server and client
                const senderId = String(newMessage.senderId);
                const now = Date.now();

                // Ignore server echoes for messages we sent ourselves to avoid duplicates and wrong unseen counts
                if (authUser && String(authUser._id) === senderId) return;

                if (selectedUser && String(selectedUser._id) === senderId) {
                    newMessage.seen = true;
                    setMessages((prevMessages) => prevMessages.some(m => String(m._id) === String(newMessage._id)) ? prevMessages : [...prevMessages, newMessage]);
                    axios?.put(`/api/messages/mark/${newMessage._id}`).catch(() => { });
                    // Update last messaged time and resort users using updated map
                    setLastMessagedAt(prev => {
                        const updated = { ...prev, [senderId]: now };
                        setUsers(prevUsers => {
                            return [...prevUsers].sort((a, b) => {
                                const aTime = String(a._id) === senderId ? now : (updated[a._id] || 0);
                                const bTime = String(b._id) === senderId ? now : (updated[b._id] || 0);
                                return bTime - aTime; // Most recent first
                            });
                        });
                        return updated;
                    });
                    // Refresh sidebar to reflect seen/unseen and ordering
                    getUsers();
                } else {
                    setUnseenMessages((prevUnseenMessages) => ({
                        ...prevUnseenMessages,
                        [senderId]: prevUnseenMessages[senderId] ? prevUnseenMessages[senderId] + 1 : 1
                    }));
                    // Update last messaged time and sort users for received message
                    setLastMessagedAt(prev => {
                        const updated = { ...prev, [senderId]: now };
                        setUsers(prevUsers => {
                            return [...prevUsers].sort((a, b) => {
                                const aTime = String(a._id) === senderId ? now : (updated[a._id] || 0);
                                const bTime = String(b._id) === senderId ? now : (updated[b._id] || 0);
                                return bTime - aTime; // Most recent first
                            });
                        });
                        return updated;
                    });
                    // Refresh sidebar to reflect unseen counts and ordering
                    getUsers();
                    // Show notification for new message
                    toast.success(`New message from ${newMessage.senderName || 'someone'}`);
                }
            } catch (err) {
                // don't let socket handler throw
                console.error('Error handling newMessage', err);
            }
        };

        const handleChatDeleted = ({ deletedBy, partnerId: payloadPartnerId }) => {
            try {
                const partnerId = String(payloadPartnerId || deletedBy);
                // reset unseen and timestamps for that partner
                setUnseenMessages(prev => ({ ...prev, [partnerId]: 0 }));
                setLastMessagedAt(prev => {
                    const copy = { ...prev };
                    delete copy[partnerId];
                    return copy;
                });
                // if currently viewing that partner, clear messages and deselect
                if (selectedUser && String(selectedUser._id) === partnerId) {
                    setSelectedUser(null);
                    setMessages([]);
                }
                // refresh users to update ordering and unseen counts
                getUsers();
            } catch (err) {
                console.error('Error handling chatDeleted', err);
            }
        };

        socket.on('newMessage', handler);
        socket.on('chatDeleted', handleChatDeleted);
        // Also update sidebar when we receive onlineUsers update (helps ordering)
        const handleOnline = () => getUsers();
        socket.on('getOnlineUsers', handleOnline);
        return () => {
            socket.off('newMessage', handler);
            socket.off('chatDeleted', handleChatDeleted);
            socket.off('getOnlineUsers', handleOnline);
        }
    }, [socket, selectedUser, axios, setUnseenMessages, getUsers]);

    const value = {
        messages,
        users,
        selectedUser,
        getUsers,
        getMessages,
        sendMessage,
        deleteChat,
        deletingUserId,
        setSelectedUser,
        setUsers,
        unseenMessages,
        setUnseenMessages,
        showRightSidebar,
        setShowRightSidebar,
    }
    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}
