import type { VercelRequest, VercelResponse } from '@vercel/node';
export declare const config: {
    api: {
        bodyParser: {
            sizeLimit: string;
        };
    };
};
export default function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse>;
