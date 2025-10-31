export const fileToBase64 = (
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; skipResizing?: boolean } = {}
): Promise<string> => {
  const defaultOptions = { maxWidth: 1280, maxHeight: 1280, quality: 0.75, skipResizing: false };
  const finalOptions = { ...defaultOptions, ...options };

  return new Promise((resolve, reject) => {
    // Skip resizing for non-images or if explicitly told to
    if (!file.type.startsWith('image/') || finalOptions.skipResizing) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Hasil FileReader bukan string'));
        }
      };
      reader.onerror = error => reject(error);
      return;
    }

    // Proses file gambar
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      if (!event.target?.result) {
        return reject(new Error('Gagal membaca file untuk diproses.'));
      }
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const { maxWidth, maxHeight } = finalOptions;

        if (width > maxWidth! || height > maxHeight!) {
          if (width > height) {
            if (width > maxWidth!) {
              height *= maxWidth! / width;
              width = maxWidth!;
            }
          } else {
            if (height > maxHeight!) {
              width *= maxHeight! / height;
              height = maxHeight!;
            }
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Tidak bisa mendapatkan konteks canvas'));
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Paksa ke JPEG untuk kompresi yang lebih baik
        const dataUrl = canvas.toDataURL('image/jpeg', finalOptions.quality);
        resolve(dataUrl);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
};