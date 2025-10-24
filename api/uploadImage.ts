import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb", // Allow larger files for images
        },
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { imageBase64, folder, publicId } = req.body;
        if (!imageBase64 || !folder) {
            return res.status(400).json({ message: 'imageBase64 and folder are required.' });
        }

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const uploadResult = await cloudinary.uploader.upload(imageBase64, {
            folder: folder,
            public_id: publicId, // Optional public_id for consistent naming
            resource_type: "auto",
        });

        if (!uploadResult?.secure_url) {
            console.error("Cloudinary upload failed to return a secure URL", uploadResult);
            throw new Error("Upload succeeded but no secure URL was returned.");
        }

        return res.status(200).json({ secure_url: uploadResult.secure_url });

    } catch (error: any) {
        console.error("API Error in uploadImage:", error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
