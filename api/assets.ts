
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';
// Fix: Removed .ts extension for proper module resolution.
import { initializeCloudinary } from './_lib/services';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "100mb",
        },
    },
};

async function handleUpload(req: VercelRequest, res: VercelResponse) {
    const { imageBase64, folder, publicId } = req.body;
    if (!imageBase64 || !folder) {
        return res.status(400).json({ message: 'imageBase64 and folder are required.' });
    }

    const uploadResult = await cloudinary.uploader.upload(imageBase64, {
        folder: folder,
        public_id: publicId,
        resource_type: "auto",
        overwrite: true,
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
    });

    if (!uploadResult?.secure_url) {
        console.error("Cloudinary upload failed to return a secure URL", uploadResult);
        throw new Error("Upload succeeded but no secure URL was returned.");
    }

    return res.status(200).json({ secure_url: uploadResult.secure_url, public_id: uploadResult.public_id });
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
    const { publicId } = req.body;
    if (!publicId) {
        return res.status(400).json({ message: 'publicId is required.' });
    }

    // By not specifying resource_type, Cloudinary will attempt to infer it.
    // This makes the endpoint more versatile for handling images, videos, and raw files like PDFs.
    const result = await cloudinary.uploader.destroy(publicId, { 
        invalidate: true 
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
        console.warn('Cloudinary did not return "ok" on deletion:', result);
    }

    return res.status(200).json({ success: true, message: `Asset ${publicId} deletion process initiated.` });
}


// --- Main Dispatcher ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action, ...payload } = req.body;

    try {
        initializeCloudinary();
        req.body = payload;

        switch (action) {
            case 'upload':
                return await handleUpload(req, res);
            case 'delete':
                return await handleDelete(req, res);
            default:
                return res.status(400).json({ message: `Unknown asset action: ${action}` });
        }
    } catch (error: any) {
        console.error(`API Error in assets handler (action: ${action}):`, error);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message || String(error),
        });
    }
}
