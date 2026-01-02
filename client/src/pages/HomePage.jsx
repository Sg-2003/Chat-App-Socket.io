import React, { useContext } from 'react'
import Sidebar from '../components/Sidebar'
import ChatContainer from '../components/ChatContainer'
import RightSidebar from '../components/RightSidebar'
import { ChatContext } from '../../context/ChatContextCore';

const HomePage = () => {

  const { selectedUser, showRightSidebar } = useContext(ChatContext);

  return (
    <div className='border w-full h-screen sm:px-[15%] sm:py-[5%]'>
      <div className={`backdrop-blur-xl border-2 border-gray-600 rounded-2xl
        overflow-hidden h-full grid grid-cols-1 gap-6 relative ${selectedUser ?
          (showRightSidebar ? 'md:grid-cols-[1fr_1.5fr_1fr] xl:grid-cols-[1fr_2fr_1fr]' : 'md:grid-cols-[1fr_2fr] xl:grid-cols-[1fr_3fr]') : 'md:grid-cols-2'}`}>
        <div className={`${selectedUser ? 'hidden md:block' : ''} h-full min-h-0 md:w-96`}>
          <Sidebar />
        </div>
        <div className="h-full min-h-0">
          <ChatContainer />
        </div>
        {showRightSidebar && <div className="h-full min-h-0"><RightSidebar /></div>}
      </div>
    </div>
  )
}

export default HomePage
