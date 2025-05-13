// src/lib/profile.js
export async function fetchUserProfile(username, token = null) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    const response = await fetch(`/api/users/${username}`, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('User not found');
      } else {
        throw new Error('Failed to fetch profile data');
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}

export async function updateUserProfile(profileData, token) {
  try {
    if (!token) throw new Error('Authentication required');
    
    let responseData;
    
    // Handle file uploads if present
    if (profileData.profilePicture || profileData.profileBanner) {
      const formData = new FormData();
      
      // Add text data
      const profileDataToSend = {
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website,
        socialLinks: profileData.socialLinks
      };
      formData.append('profileData', JSON.stringify(profileDataToSend));
      
      // Add files if they exist
      if (profileData.profilePicture) {
        formData.append('profilePicture', profileData.profilePicture);
      }
      
      if (profileData.profileBanner) {
        formData.append('profileBanner', profileData.profileBanner);
      }
      
      const response = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      
      responseData = await response.json();
    } else {
      // Regular JSON update
      const response = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      
      responseData = await response.json();
    }
    
    // Dispatch profile-updated event to notify components about the update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('profile-updated'));
      console.log('Profile updated event dispatched');
    }
    
    return responseData;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}