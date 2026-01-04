import React, { useContext, useEffect, useRef, useState } from 'react'
import assets from '../assets/assets'
import toast from 'react-hot-toast';
import { formatMessageTime } from '../lib/utils'
import { ChatContext } from '../../context/ChatContextCore'
import { AuthContext } from '../../context/AuthContext'
import imageCompression from 'browser-image-compression';

const ChatContainer = () => {

    const { messages, users, selectedUser, setSelectedUser,
        sendMessage, getMessages, showRightSidebar, setShowRightSidebar, setUnseenMessages, deleteChat, deletingUserId } = useContext(ChatContext);

    const { authUser, onlineUsers } = useContext(AuthContext);

    const scrollEnd = useRef();

    const [input, setInput] = useState('');

    //Handle Sending a message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (input.trim() === "") return null;
        await sendMessage({ text: input.trim() });
        setInput("");
    }

    //Handle sending an image
    const handleSendImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type?.startsWith("image/")) {
            toast.error("Select an image file");
            return;
        }

        try {
            // Compress image before sending for faster upload
            const options = {
                maxSizeMB: 1, // Max file size in MB
                maxWidthOrHeight: 800, // Max width/height
                useWebWorker: true, // Use web worker for better performance
            };
            const compressedFile = await imageCompression(file, options);

            const reader = new FileReader();
            reader.onloadend = async () => {
                await sendMessage({ image: reader.result });
                // reset file input
                e.target.value = null;
            }
            reader.readAsDataURL(compressedFile);
        } catch (error) {
            console.error('Error compressing image:', error);
            toast.error("Failed to compress image");
        }
    }

    useEffect(() => {
        if (selectedUser) {
            getMessages(selectedUser._id)
        }
    }, [selectedUser, getMessages])


    useEffect(() => {
        if (scrollEnd.current && messages) {
            scrollEnd.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    return selectedUser ? (
        <div className='h-full flex flex-col backdrop-blur-lg'>
            {/* -----------header------------------ */}
            <div className='flex items-center gap-3 py-3 mx-4 border-b border-stone-500 shrink-0'>
                <img src={selectedUser.profilePic || assets.avatar_icon} alt="user-pic" className='w-8 rounded-full' />
                <p className='flex-1 text-lg text-white flex items-center gap-2'>
                    {selectedUser.fullName}
                    {onlineUsers.includes(String(selectedUser._id)) && <span className='w-2 h-2 rounded-full bg-green-500'></span>}
                </p>
                <img onClick={() => setSelectedUser(null)} src={assets.arrow_icon}
                    alt="arrow-icon" className='max-w-7 md:hidden' />
                <button
                    onClick={() => deleteChat(selectedUser._id)}
                    disabled={deletingUserId === selectedUser._id}
                    className='max-w-5 max-md:hidden cursor-pointer text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed p-1'
                    title="Delete Chat"
                >
                    🗑️
                </button>
                <img onClick={() => setShowRightSidebar(!showRightSidebar)} src={assets.help_icon} alt="help-icon" className='max-w-5 max-md:hidden cursor-pointer' />
            </div>
            {/* -------------------chat Area------------------- */}
            <div className="flex flex-col flex-1 overflow-y-auto p-3 pb-6">
                {messages.map((msg, index) => (
                    <div key={msg._id || index} className={`flex items-end gap-2 justify-end
            ${msg.senderId !== authUser._id && 'flex-row-reverse'}`}>
                        {
                            msg.image ? (
                                <img
                                    src={msg.image}
                                    alt="message-pic"
                                    className='max-w-57.5 border border-gray-700 rounded-lg overflow-hidden mb-8'
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.src = assets.avatar_icon; // Fallback image
                                        e.target.alt = 'Image failed to load';
                                    }}
                                />
                            ) : (
                                <p className={`p-2 max-w-50 md:text-sm font-light
                            rounded-lg mb-8 break-all bg-violet-500/30 text-white
                            ${msg.senderId === authUser._id ? 'rounded-br-none'
                                        : 'rounded-bl-none'}`}>{msg.text}</p>
                            )
                        }
                        <div className="text-center text-xs">
                            <img src={msg.senderId === authUser._id
                                ? authUser?.profilePic || assets.avatar_icon : selectedUser?.profilePic || assets.avatar_icon} alt="avatar-icon"
                                className='w-7 rounded-full' />
                            <p className='text-gray-500'>{formatMessageTime(msg.createdAt)}</p>
                        </div>
                    </div>
                ))}
                <div ref={scrollEnd}></div>
            </div>
            {/* -------------------Bottom Area------------------- */}
            <div className="flex items-center gap-3 p-3 shrink-0">
                <div className='flex-1 flex items-center bg-gray-100/12 px-3 rounded-full'>
                    <input onChange={(e) => setInput(e.target.value)} value={input} onKeyDown={(e) => e.key === "Enter" ? handleSendMessage(e) : null}
                        type="text" placeholder="Send a message"
                        className='flex-1 text-sm p-3 border-none rounded-lg outline-none
            text-white placeholder-gray-400'/>
                    <input onChange={handleSendImage} type="file" id="image" accept='image/png, image/jpeg' hidden />
                    <label htmlFor="image">
                        <img src={assets.gallery_icon} alt="galley-icon" className='w-5 mr-2 cursor-pointer' />
                    </label>
                </div>
                <img onClick={handleSendMessage} src={assets.send_button} alt="send-button" className='w-7 cursor-pointer' />
            </div>
        </div>
    ) : (
        <div className='flex flex-col items-center justify-center p-6'>
            <div className='w-full max-w-2xl p-8 rounded-2xl bg-linear-to-r from-[#2b1b4f]/40 via-[#4b2e9f]/30 to-transparent shadow-xl backdrop-blur-md border border-gray-700/30 flex flex-col overflow-hidden max-h-[65vh]'>
                <div className='flex flex-col items-center justify-center gap-4 text-center text-gray-400'>
                    <img src={assets.logo_icon} className='w-20' alt='logo-icon' />
                    <p className='text-2xl font-semibold text-white'>Chat Anytime, Anywhere!</p>
                    <p className='text-sm text-neutral-400 max-w-sm'>Select a user below to start a conversation or use the search on the left.</p>
                </div>

                <div className='mt-6 grid grid-cols-2 gap-4 w-full overflow-y-auto max-h-48 pr-2'>
                    {users && users.length > 0 ? users.map((u) => (
                        <button key={u._id} onClick={() => { setSelectedUser(u); setUnseenMessages(prev => ({ ...prev, [u._id]: 0 })) }}
                            className='flex items-center gap-3 p-3 rounded-lg bg-[#1f1732]/50 hover:bg-[#1f1732]/60 w-full text-left transition'>
                            <img src={u.profilePic || assets.avatar_icon} alt='' className='w-10 h-10 rounded-full' />
                            <div>
                                <p className='text-sm text-white'>{u.fullName}</p>
                                {onlineUsers.includes(String(u._id))
                                    ? <p className='text-xs text-green-400'>Online</p>
                                    : <p className='text-xs text-neutral-400'>Offline</p>}
                            </div>
                        </button>
                    )) : (
                        <p className='text-sm text-neutral-400'>No users available yet.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ChatContainer