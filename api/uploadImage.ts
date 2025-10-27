import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb", // Biar bisa upload file lebih besar
    },
  },
};

// Setup Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error("Cloudinary environment variables are not configured on the server.");
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper: Retry upload function
async function safeUpload(base64: string, options: any, retries = 2) {
  try {
    return await cloudinary.uploader.upload(base64, { ...options, timeout: 60000 });
  } catch (err: any) {
    if (retries > 0) {
      console.warn(`Retrying upload due to failure: ${err.message}`);
      return safeUpload(base64, options, retries - 1);
    }
    throw err;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { images, folder } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'images array and folder are required.' });
    }

    const uploadPromises = images.map((img: { base64: string, publicId?: string }) => {
      const fullBase64 = img.base64.startsWith('data:') ? img.base64 : `data:image/png;base64,${img.base64}`;
      return safeUpload(fullBase64, {
        folder,
        public_id: img.publicId,
        resource_type: "auto",
        overwrite: true,
      });
    });

    // Jalankan semua upload dan tangkap hasil tiap gambar
    const results = await Promise.allSettled(uploadPromises);

    const successfulUploads = results
      .filter(r => r.status === 'fulfilled')
      .map((r: any) => ({ secure_url: r.value.secure_url, public_id: r.value.public_id }));

    const failedUploads = results
      .filter(r => r.status === 'rejected')
      .map((r: any) => ({ error: r.reason.message }));

    return res.status(200).json({
      success: successfulUploads.length > 0,
      uploaded: successfulUploads,
      failed: failedUploads,
    });

  } catch (error: any) {
    console.error("API Error in multiImageUpload:", error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
