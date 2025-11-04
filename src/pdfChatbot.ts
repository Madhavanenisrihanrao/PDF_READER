import { ChatOllama } from "@langchain/ollama";
import { OllamaEmbeddings } from "@langchain/ollama";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RetrievalQAChain } from "langchain/chains";
import { Document } from "@langchain/core/documents";
import * as fs from "fs";
import { OCRProcessor } from "./ocrProcessor";

export class PDFChatbot {
  private chain: RetrievalQAChain | null = null;
  private model: ChatOllama;
  private embeddings: OllamaEmbeddings;
  private ocrProcessor: OCRProcessor;

  constructor(modelName: string = "llama3.2") {
    this.model = new ChatOllama({
      model: modelName,
      temperature: 0.7,
      baseUrl: "http://localhost:11434",
    });

    this.embeddings = new OllamaEmbeddings({
      model: modelName,
      baseUrl: "http://localhost:11434",
    });

    this.ocrProcessor = new OCRProcessor();
  }

  async loadPDF(pdfPath: string, useOCR: boolean = true): Promise<void> {
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    console.log(`Loading PDF from: ${pdfPath}`);
    
    let docs: Document[];

    if (useOCR) {
      // Use OCR to extract text from handwritten/scanned PDFs
      console.log("Using OCR to extract text...");
      const ocrText = await this.ocrProcessor.extractTextFromPDF(pdfPath);
      
      docs = [
        new Document({
          pageContent: ocrText,
          metadata: { source: pdfPath, method: "ocr" },
        }),
      ];
    } else {
      // Standard PDF text extraction
      const loader = new PDFLoader(pdfPath);
      docs = await loader.load();
    }

    console.log(`Loaded ${docs.length} document(s) from PDF`);

    // Split documents into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`Split into ${splitDocs.length} chunks`);

    // Create vector store
    const vectorStore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      this.embeddings
    );

    // Create retrieval chain
    this.chain = RetrievalQAChain.fromLLM(
      this.model,
      vectorStore.asRetriever()
    );

    console.log("PDF loaded and indexed successfully!");
  }

  async ask(question: string): Promise<string> {
    if (!this.chain) {
      throw new Error("Please load a PDF first using loadPDF()");
    }

    const response = await this.chain.call({
      query: question,
    });

    return response.text;
  }

  isReady(): boolean {
    return this.chain !== null;
  }
}
