// Utility to upload images/videos to Cloudinary
// Usage: uploadToCloudinary(file, 'image' | 'video')

export async function uploadToCloudinary(file, resourceType = 'image', folder) {
    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD;
    const uploadPreset = process.env.REACT_APP_CLOUDINARY_PRESET;
    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary is not configured. Set REACT_APP_CLOUDINARY_CLOUD and REACT_APP_CLOUDINARY_PRESET.');
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    if (folder) formData.append('folder', folder);

    const res = await fetch(url, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        let message = 'Cloudinary upload failed';
        try {
            const err = await res.json();
            if (err && err.error && err.error.message) {
                message = err.error.message;
            }
        } catch (_) {}
        throw new Error(message);
    }
    const data = await res.json();
    return data.secure_url;
}