import React, { useContext, useState, useEffect, useRef } from 'react'
import assets from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ChatContext } from '../../context/ChatContextCore';

const Sidebar = () => {

    const { getUsers, users, selectedUser, setSelectedUser,
        unseenMessages, setUnseenMessages, hideUser, hiddenUsers } = useContext(ChatContext);

    const { logout, onlineUsers, authUser } = useContext(AuthContext);

    const [input, setInput] = useState('');
    const searchRef = useRef(null);

    const navigate = useNavigate();

    const filteredUsers = (input.trim() ? users.filter(user =>
        user.fullName.toLowerCase().includes(input.trim().toLowerCase())) : users).filter(user => !hiddenUsers.includes(user._id));

    useEffect(() => {
        if (authUser) getUsers();
    }, [onlineUsers, getUsers, authUser])

    return (
        <div className={`bg-[#818582]/10 h-full w-full rounded-r-xl flex flex-col
    text-white border-r border-gray-700/30 shadow-inner`}>
            <div className='p-5 shrink-0'>
                <div className="flex justify-between items-center">
                    <img src={assets.logo} alt="logo" className='max-w-40' />
                    <div className="relative py-2 group flex items-center gap-3">
                        {authUser && (
                            <div className='flex items-center gap-3'>
                                <img src={authUser.profilePic || assets.avatar_icon} alt="profile" onClick={() => navigate('/profile')}
                                    className='w-8 h-8 rounded-full cursor-pointer' />
                                <div className='hidden sm:flex flex-col leading-tight'>
                                    <p className='text-sm text-white'>{authUser.fullName}</p>
                                    {onlineUsers.includes(String(authUser._id))
                                        ? <span className='text-xs text-green-400'>Online</span>
                                        : <span className='text-xs text-neutral-400'>Offline</span>}
                                </div>
                            </div>
                        )}
                        <img src={assets.menu_icon} alt="menu" className='max-h-5 cursor-pointer' />
                        <div className='absolute top-full right-0 z-20 w-40 p-4 rounded-md bg-[#282142] border border-gray-600 text-gray-100 opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all'>
                            <p onClick={() => navigate('/profile')} className='cursor-pointer text-sm'>Edit Profile</p>
                            <hr className="my-2 border-t border-gray-500" />
                            <p onClick={() => logout()} className="cursor-pointer text-sm">Logout</p>
                        </div>
                    </div>
                </div>
                {authUser && <div className='sm:hidden mt-2'><p className='text-white text-sm'>{authUser.fullName}</p></div>}
                <div className='bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-5'>
                    <img src={assets.search_icon} alt="search" className='w-3' />
                    <input ref={searchRef} value={input} onChange={(e) => setInput(e.target.value)} type="text" className='bg-transparent border-none outline-none
                text-white text-xs placeholder-[#c8c8c8] flex-1' placeholder='Search User..' />
                </div>
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto min-h-0 divide-y divide-gray-700/40 pr-3">
                {filteredUsers.length === 0 ? (
                    <div className='flex flex-col items-center justify-center gap-2 p-8 text-center text-neutral-400'>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <p className='text-white font-medium'>No users found</p>
                        {input.trim() && <p className='text-xs text-neutral-400'>No results for "{input.trim()}"</p>}
                        {input.trim() && <button type="button" onClick={() => { setInput(''); searchRef.current?.focus(); }} className='mt-3 px-3 py-1 bg-violet-600 text-white rounded text-xs'>Clear search</button>}
                    </div>
                ) : (
                    filteredUsers.map((user, index) => (
                        <div key={user._id || index} className={`relative group flex items-center gap-3 p-3 pl-6 rounded-md cursor-pointer text-sm transition ${selectedUser?._id === user._id ? 'bg-[#282142]/50' : 'hover:bg-[#282142]/30'}`}>
                            <img src={user?.profilePic || assets.avatar_icon} alt=""
                                className='w-10 h-10 rounded-full' />
                            <div className="flex flex-col leading-5 flex-1" onClick={() => { setSelectedUser(user); setUnseenMessages(prev => ({ ...prev, [user._id]: 0 })) }}>
                                <p className='text-sm text-white'>{user.fullName}</p>
                                {
                                    onlineUsers.includes(String(user._id))
                                        ? <span className='text-green-400 text-xs'>Online</span>
                                        : <span className='text-neutral-400 text-xs'>Offline</span>
                                }
                            </div>
                            <button type='button' onClick={(e) => {
                                e.stopPropagation();
                                if (!confirm(`Delete ${user.fullName} from sidebar? This will remove them from your view permanently.`)) return;
                                hideUser(String(user._id));
                            }} aria-label={`Delete ${user.fullName} from sidebar`} title={`Delete ${user.fullName} from sidebar`} className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-gray-300 transition'>
                                🗑️
                            </button>
                            {unseenMessages[user._id] > 0 &&
                                <p className='absolute right-10 top-1/2 -translate-y-1/2 text-xs h-5 w-5
                            flex justify-center items-center rounded-full bg-violet-500 text-white font-medium'>{unseenMessages[user._id]}</p>
                            }
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default Sidebar