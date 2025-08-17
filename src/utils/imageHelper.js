export function getPrimaryImage(product) {
    if (!product) return null;
    // prefer image_urls array
    if (Array.isArray(product.image_urls) && product.image_urls.length > 0) return product.image_urls[0];
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
    if (product.image_url) return product.image_url;
    if (product.imageUrl) return product.imageUrl;
    if (product.image) return product.image;
    // some raw shapes
    if (product.raw && product.raw.image_urls && Array.isArray(product.raw.image_urls) && product.raw.image_urls.length > 0) return product.raw.image_urls[0];
    if (product.raw && product.raw.imageUrl) return product.raw.imageUrl;
    if (product.raw && product.raw.image) return product.raw.image;
    return null;
}

export function getPrimaryImageOrPlaceholder(product, width = 300, height = 200) {
    const url = getPrimaryImage(product);
    if (url) return url;
    return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="Arial, Helvetica, sans-serif" font-size="18">No Image</text></svg>`)}`;
}