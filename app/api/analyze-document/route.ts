import { auth } from "@clerk/nextjs";
import mammoth from "mammoth";
import { NextResponse } from "next/server";
import pdf from "pdf-parse";

export async function POST(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      console.error("Invalid file format");
      return new NextResponse("Invalid file format", { status: 400 });
    }

    // Liste des types MIME acceptés
    const acceptedTypes = {
      pdf: ["application/pdf", "application/x-pdf"],
      docx: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/docx"
      ]
    };

    const fileType = file.type.toLowerCase();
    const isAcceptedType = Object.values(acceptedTypes).flat().includes(fileType);

    if (!isAcceptedType) {
      console.error("Unsupported file type:", fileType);
      return new NextResponse(
        `Unsupported file type. Accepted types are PDF and DOCX. Received: ${fileType}`,
        { status: 400 }
      );
    }


    console.log("File received:", {
      type: file.type,
      size: file.size,
      name: 'name' in file ? file.name : 'unknown'
    });

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // la taille maximale du document à uploader est de 10MB
    if (file.size > MAX_FILE_SIZE) {
      console.error("File too large:", file.size);
      return new NextResponse("File too large. Maximum size is 10MB", {
        status: 400,
      });
    }

    // Convertir le fichier en buffer
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let textContent = "";

      console.log("Processing file of type:", fileType);

      if (acceptedTypes.pdf.includes(fileType)) {
        const pdfData = await pdf(buffer);
        if (!pdfData || !pdfData.text) {
          throw new Error("Failed to extract text from PDF");
        }
        textContent = pdfData.text;
      } else if (acceptedTypes.docx.includes(fileType)) {
        const result = await mammoth.extractRawText({ buffer });
        if (!result || !result.value) {
          throw new Error("Failed to extract text from DOCX");
        }
        textContent = result.value;
      }

      if (!textContent || textContent.trim().length === 0) {
        console.error("No text content extracted from file");
        return new NextResponse("Could not extract text from file - file may be empty or corrupted", { status: 400 });
      }

      const maxLength = 4000;
      if (textContent.length > maxLength) {
        textContent = textContent.substring(0, maxLength) + "...";
      }

      console.log("Successfully processed file. Content length:", textContent.length);

      return NextResponse.json({
        content: textContent.trim(),
        status: 'success',
        fileType: fileType,
        contentLength: textContent.length
      });

    } catch (processingError: unknown) {
      console.error("Error processing file content:", processingError);
      return new NextResponse(
        `Error processing file content: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[DOCUMENT_ANALYSIS_ERROR]", error);
    return new NextResponse(
      `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}

//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);
//     let textContent = "";

//     console.log("Processing file of type:", file.type);

//     try {
//       if (file.type === "application/pdf") {
//         const pdfData = await pdf(buffer);
//         textContent = pdfData.text;
//       } else if (
//         file.type ===
//         "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//       ) {
//         const result = await mammoth.extractRawText({ buffer });
//         textContent = result.value;
//       } else {
//         console.error("Unsupported file type:", file.type);
//         return new NextResponse(`Unsupported file type: ${file.type}`, { status: 400 });
//       }

//       if (!textContent || textContent.length === 0) {
//         console.error("No text content extracted from file");
//         return new NextResponse("Could not extract text from file", { status: 400 });
//       }

//       const maxLength = 4000;
//       if (textContent.length > maxLength) {
//         textContent = textContent.substring(0, maxLength) + "...";
//       }

//       console.log("Successfully processed file. Content length:", textContent.length);

//       return NextResponse.json({
//         content: textContent,
//         status: 'success'
//       });

//     } catch (processingError) {
//       console.error("Error processing file content:", processingError);
//       return new NextResponse(
//         `Error processing file content: ${processingError.message}`,
//         { status: 500 }
//       );
//     }
//   } catch (error) {
//     console.error("[DOCUMENT_ANALYSIS_ERROR]", error);
//     return new NextResponse(
//       `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`,
//       { status: 500 }
//     );
//   }
// }
