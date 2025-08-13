import { createVectorPdf } from './VectorPdfHelper';

/**
 * Vektorbasierte PDF-Erstellung
 * Erstellt echte vektorbasierte PDFs mit perfekter Qualität
 */
export async function exportVectorPdf(props: {
  estimate: any;
  customer: any;
  items: any[];
  businessName: string;
  businessAddress: string;
  businessZipCity: string;
  businessPhone: string;
  businessEmail: string;
  logoUrl?: string;
}, filename: string = 'Kostenvoranschlag'): Promise<void> {
  try {
    const pdf = await createVectorPdf(props);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Fehler beim Erstellen der PDF:', error);
    throw error;
  }
}