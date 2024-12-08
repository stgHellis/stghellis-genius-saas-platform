import { auth } from "@clerk/nextjs";
import mammoth from "mammoth";
import { NextResponse } from "next/server";
import { PDFDocument } from 'pdf-lib';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 4000;

const ACCEPTED_TYPES = {
  pdf: ["application/pdf", "application/x-pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/docx"
  ]
} as const;

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log("Début de l'extraction PDF avec pdf-lib...");
    
    // Charger le document PDF
    const pdfDoc = await PDFDocument.load(buffer);
    
    // Obtenir le nombre de pages
    const numberOfPages = pdfDoc.getPageCount();
    console.log(`Nombre de pages dans le PDF: ${numberOfPages}`);

    if (numberOfPages === 0) {
      throw new Error('Le PDF ne contient aucune page');
    }

    // Extraire le texte (note: pdf-lib a des capacités limitées d'extraction de texte)
    // On retourne au moins les informations de base du document
    const text = `Document PDF contenant ${numberOfPages} page(s). Pour une meilleure extraction de texte, nous recommandons d'utiliser un document DOCX.`;
    
    console.log("Extraction PDF terminée");
    return text;
  } catch (error: any) {
    console.error('Erreur détaillée lors de l\'extraction du PDF:', error);
    throw new Error(`Échec du traitement du PDF: ${error.message}`);
  }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (!result || typeof result.value !== 'string') {
      throw new Error('Échec de l\'extraction du texte du DOCX');
    }
    return result.value;
  } catch (error: any) {
    console.error('Erreur détaillée lors de l\'extraction du DOCX:', error);
    throw new Error(`Échec du traitement du DOCX: ${error.message}`);
  }
}

export async function POST(req: Request) {
  try {
    // 1. Vérification de l'authentification
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    // 2. Récupération du fichier
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return new NextResponse("Fichier manquant ou format invalide", { status: 400 });
    }

    // 3. Validation de base du fichier
    console.log("Information du fichier:", {
      type: file.type,
      size: file.size,
      name: file instanceof File ? file.name : 'unknown'
    });

    // 4. Validation du type de fichier
    const fileType = file.type.toLowerCase();
    if (!Object.values(ACCEPTED_TYPES).flat().includes(fileType)) {
      return new NextResponse(
        `Type de fichier non supporté. Types acceptés: PDF et DOCX. Type reçu: ${fileType}`,
        { status: 400 }
      );
    }

    // 5. Validation de la taille
    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse(
        `Fichier trop volumineux. Taille maximale: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        { status: 400 }
      );
    }

    // 6. Conversion en buffer
    console.log("Conversion du fichier en buffer...");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("Taille du buffer:", buffer.length);

    // 7. Extraction du texte selon le type
    let textContent: string;
    
    if (ACCEPTED_TYPES.pdf.includes(fileType)) {
      console.log("Début de l'extraction du texte PDF...");
      textContent = await extractTextFromPDF(buffer);
      console.log("Extraction PDF terminée");
    } else if (ACCEPTED_TYPES.docx.includes(fileType)) {
      console.log("Début de l'extraction du texte DOCX...");
      textContent = await extractTextFromDOCX(buffer);
      console.log("Extraction DOCX terminée");
    } else {
      return new NextResponse("Type de fichier non pris en charge", { status: 400 });
    }

    // 8. Validation du contenu extrait
    if (!textContent?.trim()) {
      return new NextResponse(
        "Impossible d'extraire le texte - le fichier est peut-être vide ou corrompu",
        { status: 422 }
      );
    }

    // 9. Troncature si nécessaire
    const originalLength = textContent.length;
    if (originalLength > MAX_TEXT_LENGTH) {
      textContent = textContent.substring(0, MAX_TEXT_LENGTH) + "...";
    }

    // 10. Réponse avec succès
    return NextResponse.json({
      content: textContent.trim(),
      status: 'success',
      fileType,
      originalLength,
      truncated: originalLength > MAX_TEXT_LENGTH
    });

  } catch (error: any) {
    console.error("Erreur lors du traitement:", error);
    return new NextResponse(
      `Une erreur s'est produite lors de l'analyse du fichier: ${error.message}`,
      { status: 500 }
    );
  }
}
