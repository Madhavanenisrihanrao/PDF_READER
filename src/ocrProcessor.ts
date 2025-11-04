import Tesseract from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import { pdfToPng } from 'pdf-to-png-converter';
import sharp from 'sharp';

interface OCRResult {
  text: string;
  confidence: number;
  pageNumber: number;
}

export class OCRProcessor {
  
  // Save preprocessed image for debugging
  async savePreprocessedImage(imageBuffer: Buffer, pageNum: number, outputDir: string = './ocr_debug'): Promise<void> {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputPath = path.join(outputDir, `page_${pageNum}_preprocessed.png`);
      await sharp(imageBuffer).toFile(outputPath);
      console.log(`  💾 Debug: Saved preprocessed image to ${outputPath}`);
    } catch (error) {
      console.error('Error saving preprocessed image:', error);
    }
  }
  
  // Advanced image preprocessing for maximum OCR accuracy
  async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Apply multiple preprocessing steps to enhance text clarity
      const processed = await sharp(imageBuffer)
        // Convert to grayscale for better text recognition
        .grayscale()
        // Increase resolution significantly for better character recognition
        .resize({
          width: 4000,
          fit: 'inside',
          withoutEnlargement: false,
          kernel: 'lanczos3' // Best quality resampling
        })
        // Remove noise with median filter
        .median(3)
        // Enhance contrast significantly
        .normalise({
          lower: 1,
          upper: 99
        })
        // Strong sharpening for handwritten text
        .sharpen({
          sigma: 2.0,
          m1: 1.5,
          m2: 0.5
        })
        // Increase brightness
        .modulate({
          brightness: 1.2,
          saturation: 0 // Remove all color, keep grayscale
        })
        // Strong contrast enhancement
        .linear(1.5, -(128 * 0.5))
        // Apply adaptive thresholding by using gamma
        .gamma(2.2)
        // Final normalization
        .normalise()
        // Output as highest quality PNG
        .png({ quality: 100, compressionLevel: 0, adaptiveFiltering: false })
        .toBuffer();
      
      return processed;
    } catch (error) {
      console.error('Error in image preprocessing:', error);
      return imageBuffer; // Return original if preprocessing fails
    }
  }
  
  async extractTextFromPDF(pdfPath: string): Promise<string> {
    console.log('Starting ADVANCED OCR processing for handwritten text...');
    console.log('Converting PDF pages to high-resolution images...');
    
    // Convert PDF to PNG images with maximum quality
    const pngPages = await pdfToPng(pdfPath, {
      disableFontFace: false,
      useSystemFonts: false,
      viewportScale: 4.0, // Very high scale for maximum quality
    });
    
    console.log(`Processing ${pngPages.length} pages with advanced OCR...`);
    console.log('Applying aggressive image enhancement for handwritten text...');
    console.log('='.repeat(60));
    
    let fullText = '';
    let totalConfidence = 0;
    const pageResults: OCRResult[] = [];
    
    // Process each page image with OCR
    for (let i = 0; i < pngPages.length; i++) {
      console.log(`\nProcessing page ${i + 1}/${pngPages.length}...`);
      console.log('  Step 1/2: Preprocessing image for maximum clarity...');
      
      try {
        const pageImage = pngPages[i];
        
        // Preprocess the image for better OCR accuracy
        const preprocessedImage = await this.preprocessImage(pageImage.content);
        
        // Save preprocessed image for debugging (optional - helps see what OCR sees)
        await this.savePreprocessedImage(preprocessedImage, i + 1);
        
        console.log('  Step 2/2: Running OCR with optimized settings...');
        
        // Use Tesseract with optimized settings for handwritten text
        const result = await Tesseract.recognize(
          preprocessedImage,
          'eng',
          {
            logger: (m: any) => {
              if (m.status === 'recognizing text') {
                process.stdout.write(`\r  OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            },
          }
        );
        
        const pageConfidence = result.data.confidence;
        totalConfidence += pageConfidence;
        
        console.log(`\n  ✓ Page ${i + 1} completed`);
        console.log(`  📊 Confidence: ${pageConfidence.toFixed(2)}%`);
        
        // Count words from text
        const wordCount = result.data.text.trim().split(/\s+/).filter(w => w.length > 0).length;
        console.log(`  📝 Words detected: ${wordCount}`);
        console.log(`  📄 Characters: ${result.data.text.length}`);
        
        // Show warning for low confidence pages
        if (pageConfidence < 70) {
          console.log(`  ⚠️  Low confidence detected on this page`);
          console.log(`     Consider improving image quality or trying different OCR settings`);
        }
        
        pageResults.push({
          text: result.data.text,
          confidence: pageConfidence,
          pageNumber: i + 1
        });
        
        fullText += `\n--- Page ${i + 1} ---\n${result.data.text}\n`;
      } catch (error) {
        console.error(`❌ Error processing page ${i + 1}:`, error);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 OCR ACCURACY SUMMARY');
    console.log('='.repeat(60));
    
    const avgConfidence = totalConfidence / pngPages.length;
    console.log(`Average Confidence: ${avgConfidence.toFixed(2)}%`);
    console.log(`Total Pages Processed: ${pageResults.length}`);
    
    // Show confidence distribution
    const highConf = pageResults.filter(p => p.confidence >= 80).length;
    const medConf = pageResults.filter(p => p.confidence >= 60 && p.confidence < 80).length;
    const lowConf = pageResults.filter(p => p.confidence < 60).length;
    
    console.log(`\nConfidence Distribution:`);
    console.log(`  High (≥80%): ${highConf} pages`);
    console.log(`  Medium (60-79%): ${medConf} pages`);
    console.log(`  Low (<60%): ${lowConf} pages`);
    
    if (lowConf > 0) {
      console.log(`\n⚠️  Pages with low confidence:`);
      pageResults
        .filter(p => p.confidence < 60)
        .forEach(p => console.log(`     Page ${p.pageNumber}: ${p.confidence.toFixed(2)}%`));
      
      console.log(`\n💡 TIPS TO IMPROVE ACCURACY:`);
      console.log(`   1. Check the preprocessed images in './ocr_debug/' folder`);
      console.log(`   2. Ensure handwriting is clear, dark, and on white background`);
      console.log(`   3. Scan/photograph at higher resolution (300+ DPI)`);
      console.log(`   4. Avoid shadows, creases, or skewed pages`);
      console.log(`   5. Consider using dedicated handwriting recognition services`);
      console.log(`      (Google Cloud Vision, Azure OCR, AWS Textract)`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ OCR processing completed!\n');
    
    return fullText;
  }
  
  async extractTextFromImage(imagePath: string): Promise<string> {
    console.log(`Processing image: ${imagePath}`);
    console.log('Applying advanced preprocessing...');
    
    // Read and preprocess the image
    const imageBuffer = fs.readFileSync(imagePath);
    const preprocessedImage = await this.preprocessImage(imageBuffer);
    
    const result = await Tesseract.recognize(
      preprocessedImage,
      'eng',
      {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      }
    );
    
    const wordCount = result.data.text.trim().split(/\s+/).filter(w => w.length > 0).length;
    console.log(`\n📊 Confidence: ${result.data.confidence.toFixed(2)}%`);
    console.log(`📝 Words detected: ${wordCount}`);
    
    return result.data.text;
  }
}
