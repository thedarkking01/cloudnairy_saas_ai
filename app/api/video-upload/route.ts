// "use client"
// import { NextRequest, NextResponse } from 'next/server';
// import { v2 as cloudinary } from 'cloudinary';
// import { auth } from '@clerk/nextjs/server';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// // Configuration
// cloudinary.config({
//     cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// interface CloudinaryUploadResult {
//     public_id: string;
//     bytes: number;
//     duration?: number;
//     [key: string]: any;
// }

// export async function POST(request: NextRequest) {
//     try {
//         const { userId } = auth();

//         // Check if the user is authenticated
//         if (!userId) {
//             return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//         }

//         if (
//             !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
//             !process.env.CLOUDINARY_API_KEY ||
//             !process.env.CLOUDINARY_API_SECRET
//         ) {
//             return NextResponse.json({ error: "Cloudinary credentials not found" }, { status: 500 });
//         }

//         const formData = await request.formData();
//         const file = formData.get("file") as File | null;
//         const title = formData.get("title") as string;
//         const description = formData.get("description") as string;
//         const originalSize = formData.get("originalSize") as string;

//         if (!file) {
//             return NextResponse.json({ error: "File not found" }, { status: 400 });
//         }

//         const bytes = await file.arrayBuffer();
//         const buffer = Buffer.from(bytes);

//         const result = await new Promise<CloudinaryUploadResult>(
//             (resolve, reject) => {
//                 const uploadStream = cloudinary.uploader.upload_stream(
//                     {
//                         resource_type: "video",
//                         folder: "video-uploads",
//                         transformation: [
//                             { quality: "auto", fetch_format: "mp4" },
//                         ],
//                     },
//                     (error, result) => {
//                         if (error) reject(error);
//                         else resolve(result as CloudinaryUploadResult);
//                     }
//                 );
//                 uploadStream.end(buffer);
//             }
//         );

        
//         const video = await prisma.video.create({
//             data: {
//                 title,
//                 description,
//                 publicId: result.public_id,
//                 originalSize: originalSize,
//                 compressedSize: String(result.bytes),
//                 duration: result.duration || 0,
//             },
//         });

//         return NextResponse.json(video);

//     } catch (error) {
//         console.log("Upload video failed", error);
//         return NextResponse.json({ error: "Upload video failed" }, { status: 500 });
//     } finally {
//         await prisma.$disconnect();
//     }
// }

"use client";

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
    public_id: string;
    bytes: number;
    duration?: number;
    [key: string]: any;
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = auth();

        // Check if the user is authenticated
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check Cloudinary configuration
        if (
            !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
        ) {
            console.error("Cloudinary credentials not found");
            return NextResponse.json({ error: "Cloudinary credentials not found" }, { status: 500 });
        }

        // Extract and validate form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const originalSize = formData.get("originalSize") as string;

        if (!file) {
            console.error("File not found in the request");
            return NextResponse.json({ error: "File not found" }, { status: 400 });
        }

        console.log("Form data received:", { title, description, originalSize });

        // Convert file to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload video to Cloudinary
        console.log("Uploading file to Cloudinary...");
        const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: "video",
                    folder: "video-uploads",
                    transformation: [
                        { quality: "auto", fetch_format: "mp4" },
                    ],
                },
                (error, result) => {
                    if (error) {
                        console.error("Cloudinary Upload Error:", error);
                        reject(error);
                    } else {
                        resolve(result as CloudinaryUploadResult);
                    }
                }
            );
            uploadStream.end(buffer);
        });

        console.log("File uploaded to Cloudinary:", result);

        // Save video details to the database
        const video = await prisma.video.create({
            data: {
                title,
                description,
                publicId: result.public_id,
                originalSize: originalSize,
                compressedSize: String(result.bytes),
                duration: result.duration || 0,
            },
        });

        console.log("Video details saved to database:", video);

        return NextResponse.json(video);

    } catch (error) {
        console.error("Upload video failed:", error);
        return NextResponse.json({ error: "Upload video failed" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
