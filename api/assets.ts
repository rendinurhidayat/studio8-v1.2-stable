
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "100mb",
        },
    },
};

// --- Cloudinary Initialization ---
function initializeCloudinary() {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Server configuration error: Cloudinary credentials are not set.");
    }
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}


async function handleUpload(req: VercelRequest, res: VercelResponse) {
    const { imageBase64, folder, publicId } = req.body;
    if (!imageBase64 || !folder) {
        return res.status(400).json({ message: 'imageBase64 and folder are required.' });
    }
    try {
        const uploadResult = await cloudinary.uploader.upload(imageBase64, {
            folder: folder,
            public_id: publicId,
            resource_type: "auto",
            overwrite: true,
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        });

        if (!uploadResult?.secure_url) {
            console.error("Cloudinary upload failed to return a secure URL", uploadResult);
            throw new Error("Upload berhasil, namun gagal mendapatkan URL yang valid dari Cloudinary.");
        }

        return res.status(200).json({ secure_url: uploadResult.secure_url, public_id: uploadResult.public_id });
    } catch (error) {
        console.error("Error during Cloudinary upload:", error);
        throw new Error("Gagal mengunggah file ke server. Mohon coba lagi.");
    }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
    const { publicId } = req.body;
    if (!publicId) {
        return res.status(400).json({ message: 'publicId is required.' });
    }

    try {
        // By not specifying resource_type, Cloudinary will attempt to infer it.
        // This makes the endpoint more versatile for handling images, videos, and raw files like PDFs.
        const result = await cloudinary.uploader.destroy(publicId, { 
            invalidate: true 
        });

        if (result.result !== 'ok' && result.result !== 'not found') {
            console.warn(`Cloudinary did not return "ok" on deletion for publicId ${publicId}:`, result);
        }

        return res.status(200).json({ success: true, message: `Permintaan penghapusan aset ${publicId} telah diproses.` });
    } catch (error) {
        console.error(`Error deleting asset with publicId ${publicId}:`, error);
        throw new Error("Gagal menghapus aset dari server.");
    }
}


// --- Main Dispatcher ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action, ...payload } = req.body;
    if (!action) {
        return res.status(400).json({ message: `Action is required for asset management.` });
    }

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
            message: error.message || 'Terjadi kesalahan pada server saat mengelola aset.',
            error: error.message,
        });
    }
}
