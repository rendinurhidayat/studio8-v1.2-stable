import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { publicId } = req.body;
        if (!publicId) {
            return res.status(400).json({ message: 'publicId is required.' });
        }

        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new Error("Server configuration error: Cloudinary credentials are not set.");
        }
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        // For PDFs/certificates, Cloudinary often treats them as 'image' type.
        // We also invalidate to remove from CDN cache.
        const result = await cloudinary.uploader.destroy(publicId, { 
            resource_type: "image",
            invalidate: true 
        });

        if (result.result !== 'ok') {
            console.warn('Cloudinary did not return "ok" on deletion:', result);
        }

        return res.status(200).json({ success: true, message: `Asset ${publicId} deletion process initiated.` });

    } catch (error: any) {
        console.error("API Error in deleteAsset:", error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}