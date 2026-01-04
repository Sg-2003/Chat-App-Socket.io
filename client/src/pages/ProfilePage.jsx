import React, { useContext, useState, useEffect } from 'react'
import assets from './../assets/assets';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import imageCompression from 'browser-image-compression';

const ProfilePage = () => {

  const { authUser, updateProfile } = useContext(AuthContext);

  const [selectedImg, setSelectedImg] = useState(null);
  const [preview, setPreview] = useState(null);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  // populate form when auth user becomes available (only set if form is empty)
  useEffect(() => {
    if (!authUser) return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setName(prev => prev || authUser.fullName || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setBio(prev => prev || authUser.bio || '');
  }, [authUser]);

  // create/revoke preview URL for selected image (clear preview in cleanup)
  useEffect(() => {
    let objectUrl;
    if (selectedImg) {
      objectUrl = URL.createObjectURL(selectedImg);
      setPreview(objectUrl);
    }
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setPreview(prev => (prev === objectUrl ? null : prev));
      }
    }
  }, [selectedImg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!selectedImg) {
        await updateProfile({ fullName: name, bio });
        navigate('/');
        return;
      }

      // Compress the image to reduce size and speed up upload
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      let compressedFile = selectedImg;
      try {
        compressedFile = await imageCompression(selectedImg, options);
      } catch (compressionError) {
        console.warn('Image compression failed, using original file:', compressionError);
      }

      const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
      });

      const base64Image = await toBase64(compressedFile);
      await updateProfile({ profilePic: base64Image, fullName: name, bio });
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to update profile');
    }
  }

  return (
    <div className='min-h-screen bg-cover bg-no-repeat flex items-center
    justify-center'>
      <div className='w-5/6 max-w-2xl backdrop-blur-2xl text-gray-300 border-2
       border-gray-600 flex items-center justify-between max-sm:flex-col-reverse rounded-lg'>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-10 flex-1">
          <h3 className='text-lg'>Profile details</h3>
          <label htmlFor="avatar" className='flex items-center gap-3
          cursor-pointer'>
            <input onChange={(e) => setSelectedImg(e.target.files[0])}
              type="file" id='avatar' accept='.png, .jpg, .jpeg' hidden />
            <img src={preview || authUser?.profilePic || assets.avatar_icon} alt=""
              className={`w-12 h-12 ${preview || authUser?.profilePic ? 'rounded-full' : ''}`} />
            upload profile image
          </label>
          <input onChange={(e) => setName(e.target.value)} value={name}
            type="text" required placeholder='Your name' className='p-2 border
          border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500'/>
          <textarea onChange={(e) => setBio(e.target.value)} value={bio} placeholder="Write profile bio"
            className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
            rows={4} required></textarea>
          <button type="submit" className='bg-linear-to-r from-purple-400 to-violet-600 text-white p-2 rounded-full text-lg cursor-pointer'>Save</button>
        </form>
        <img className={`max-w-44 aspect-square rounded-full mx-10 max-sm:mt-10
        ${selectedImg && 'rounded-full'}`}
          src={authUser?.profilePic || assets.logo_icon} alt="logo-icon" />
      </div>
    </div>
  )
}

export default ProfilePage