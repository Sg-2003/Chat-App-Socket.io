import React, { useContext, useMemo } from 'react'
import assets from '../assets/assets'
import { ChatContext } from '../../context/ChatContextCore';
import { AuthContext } from '../../context/AuthContext';

const RightSidebar = () => {

    const { selectedUser, messages, showRightSidebar } = useContext(ChatContext);
    const { logout, onlineUsers } = useContext(AuthContext);
    // derive message images from messages to avoid extra state
    const msgImages = useMemo(() => (messages || []).filter(msg => msg.image).map(msg => msg.image), [messages]);

    return selectedUser && showRightSidebar && (
        <div className={`bg-[#818582]/10 text-white w-full h-full relative ${selectedUser ? "max-md:hidden" : ""} flex flex-col`}>
            <div className="pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto overflow-y-auto flex-1">
                <img src={selectedUser?.profilePic || assets.avatar_icon} alt=""
                    className='w-20 aspect-square rounded-full' />
                <h1 className="px-10 text-xl font-medium mx-auto flex items-center gap-2">
                    {onlineUsers.includes(String(selectedUser._id)) && <p className='w-2 h-2 rounded-full bg-green-500'></p>}
                    {selectedUser.fullName}
                </h1>
                <p className='px-10 mx-auto'>{selectedUser.bio}</p>
                <hr className='border-[#ffffff50] my-4 w-full' />
                <div className="px-5 text-xs w-full">
                    <p>Media</p>
                    <div className='mt-2 max-h-64 overflow-y-scroll grid grid-cols-2
                gap-4 opacity-80'>
                        {msgImages.map((url) => (
                            <div key={url} onClick={() => window.open(url, '_blank')}
                                className='cursor-pointer rounded'>
                                <img src={url} alt="" className='object-cover h-24 rounded-md w-full' />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 shrink-0">
                <button type="button" onClick={logout} className='mx-auto block bg-linear-to-r from-purple-400 to-violet-600 text-white border-none text-sm font-light py-2 px-20 rounded-full cursor-pointer z-10'>
                    Logout
                </button>
            </div>
        </div>
    )
}

export default RightSidebar