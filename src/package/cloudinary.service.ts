import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly uploadFolder: string;
  private readonly isConfigured: boolean;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    this.uploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'packages';
    this.isConfigured = Boolean(cloudName && apiKey && apiSecret);

    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
    if (!files?.length) return [];

    if (!this.isConfigured) {
      throw new InternalServerErrorException(
        'Cloudinary configuration is missing',
      );
    }

    const uploadedUrls = await Promise.all(
      files.map((file) => this.uploadImage(file)),
    );

    return uploadedUrls;
  }

  private uploadImage(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: this.uploadFolder,
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            reject(
              new InternalServerErrorException(
                `Cloudinary upload failed: ${error.message}`,
              ),
            );
            return;
          }

          if (!result?.secure_url) {
            reject(
              new InternalServerErrorException(
                'Cloudinary did not return a secure URL',
              ),
            );
            return;
          }

          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
