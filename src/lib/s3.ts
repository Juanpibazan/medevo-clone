import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const awsRegion = process.env.AWS_REGION;
const awsBucketName = process.env.AWS_S3_BUCKET_NAME;

const isS3Configured = !!(
  awsAccessKeyId &&
  awsSecretAccessKey &&
  awsRegion &&
  awsBucketName
);

let s3Client: S3Client | null = null;
if (isS3Configured) {
  s3Client = new S3Client({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId!,
      secretAccessKey: awsSecretAccessKey!,
    },
  });
}

export interface UploadDetails {
  uploadUrl: string;
  fileUrl: string;
  isLocalSimulation: boolean;
}

export async function getUploadPresignedUrl(
  filename: string,
  fileType: string,
): Promise<UploadDetails> {
  const uniqueId = crypto.randomUUID();
  const safeFilename = `${uniqueId}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  if (isS3Configured && s3Client && awsBucketName) {
    const key = `uploads/${safeFilename}`;
    const command = new PutObjectCommand({
      Bucket: awsBucketName,
      Key: key,
      ContentType: fileType,
    });

    // Signed URL valid for 15 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    const fileUrl = `https://${awsBucketName}.s3.${awsRegion}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      fileUrl,
      isLocalSimulation: false,
    };
  }

  // Fallback to local development simulation
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    uploadUrl: `${appUrl}/api/upload/simulate?filename=${encodeURIComponent(safeFilename)}`,
    fileUrl: `/uploads/${safeFilename}`,
    isLocalSimulation: true,
  };
}
