export async function exportCanvasAsPDF(
  canvasDataUrl: string,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdfFormat = orientation === 'portrait' ? 'p' : 'l';
  const pdf = new jsPDF(pdfFormat, 'mm', 'a4');

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const img = new Image();
  img.src = canvasDataUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo cargar la imagen del canvas'));
  });

  const imgRatio = img.width / img.height;
  const pageRatio = pageWidth / pageHeight;

  let imgWidth: number;
  let imgHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > pageRatio) {
    imgWidth = pageWidth;
    imgHeight = pageWidth / imgRatio;
    offsetY = (pageHeight - imgHeight) / 2;
  } else {
    imgHeight = pageHeight;
    imgWidth = pageHeight * imgRatio;
    offsetX = (pageWidth - imgWidth) / 2;
  }

  pdf.addImage(canvasDataUrl, 'PNG', offsetX, offsetY, imgWidth, imgHeight, undefined, 'FAST');
  pdf.save(`${filename}.pdf`);
}

export async function downloadPNG(dataUrl: string, filename: string): Promise<void> {
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function shareImage(dataUrl: string, title: string): Promise<void> {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `${title}.png`, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title,
      text: '¡Mira este circuito!',
      files: [file],
    });
  } else {
    await navigator.clipboard.writeText(window.location.href);
  }
}

export function canvasToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((res) => res.blob());
}
