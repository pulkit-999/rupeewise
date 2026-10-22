import { describe, it, expect, vi } from 'vitest';
import { uploadReceiptFile } from '../src/lib/receipt-upload';

describe('Receipt Upload Utility', () => {
  it('throws an error if a non-image file is provided', async () => {
    const invalidFile = new File(['dummy content'], 'document.exe', { type: 'application/x-msdownload' });
    await expect(uploadReceiptFile(invalidFile)).rejects.toThrow('Please select an image file');
  });

  it('rejects text files that are not images', async () => {
    const textFile = new File(['hello world'], 'notes.txt', { type: 'text/plain' });
    await expect(uploadReceiptFile(textFile)).rejects.toThrow('Please select an image file');
  });

  it('rejects non-image files with empty MIME type (common on some mobile pickers)', async () => {
    const unknownFile = new File(['dummy'], 'archive.zip', { type: '' });
    await expect(uploadReceiptFile(unknownFile)).rejects.toThrow('Please select an image file');
  });

  it('rejects executable scripts even with generic MIME type', async () => {
    const jsFile = new File(['alert(1)'], 'script.js', { type: 'application/octet-stream' });
    await expect(uploadReceiptFile(jsFile)).rejects.toThrow('Please select an image file');
  });
});

