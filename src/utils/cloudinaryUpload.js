// Utility to upload images/videos to Cloudinary
// Usage: uploadToCloudinary(file, 'image' | 'video')

export async function uploadToCloudinary(file, resourceType = 'image') {
    const url = `https://api.cloudinary.com/v1_1/<your-cloud-name>/${resourceType}/upload`;
    const uploadPreset = '<your-upload-preset>';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(url, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    const data = await res.json();
    return data.secure_url;
}