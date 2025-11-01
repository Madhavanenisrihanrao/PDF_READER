import { ChatOllama } from "@langchain/ollama";
import { OllamaEmbeddings } from "@langchain/ollama";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RetrievalQAChain } from "langchain/chains";
import * as fs from "fs";

export class PDFChatbot {
  private chain: RetrievalQAChain | null = null;
  private model: ChatOllama;
  private embeddings: OllamaEmbeddings;

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
  }

  async loadPDF(pdfPath: string): Promise<void> {
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    console.log(`Loading PDF from: ${pdfPath}`);
    
    // Load PDF
    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();

    console.log(`Loaded ${docs.length} pages from PDF`);

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
