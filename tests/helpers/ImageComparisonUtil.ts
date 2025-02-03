import type { PNG as PNGType } from 'pngjs';

interface ComparisonResult {
  mismatchedPixels: number;
  diffImage?: Buffer;
}

/**
 * Compare two images using pixelmatch and generate a diff image
 * @param image1 First image buffer to compare
 * @param image2 Second image buffer to compare
 * @param threshold Matching threshold (0 to 1, higher means more tolerance)
 * @returns Object containing number of mismatched pixels and diff image buffer
 */
export async function compareImages(
  image1: Buffer,
  image2: Buffer,
  threshold: number
): Promise<ComparisonResult> {
  // Dynamically import pixelmatch and PNG
  const [{ default: pixelmatch }, { PNG }] = await Promise.all([
    import('pixelmatch'),
    import('pngjs')
  ]);

  // Read images into PNG format
  const img1 = PNG.sync.read(image1);
  const img2 = PNG.sync.read(image2);
  
  const { width, height } = img1;
  
  // Create output diff image
  const diff = new PNG({ width, height });
  
  // Compare images
  const mismatchedPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { 
      threshold,
      // Highlight differences in red
      diffColor: [255, 0, 0],
      // Make diff more visible
      diffMask: true,
      alpha: 0.7
    }
  );

  // If there are differences, return the diff image
  if (mismatchedPixels > 0) {
    return {
      mismatchedPixels,
      diffImage: PNG.sync.write(diff)
    };
  }

  return { mismatchedPixels };
}
