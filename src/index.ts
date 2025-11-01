import { PDFChatbot } from "./pdfChatbot";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("=== LLM PDF Chatbot (Local Ollama) ===\n");
  console.log("Using local Ollama with llama3.2 model");
  console.log("Make sure Ollama is running on your system!\n");

  const chatbot = new PDFChatbot("llama3.2");

  // Ask for PDF path
  const pdfPath = await askQuestion("Enter the path to your PDF file: ");

  try {
    await chatbot.loadPDF(pdfPath.trim());

    console.log("\nYou can now ask questions about the PDF!");
    console.log('Type "exit" to quit\n');

    // Chat loop
    while (true) {
      const question = await askQuestion("\nYou: ");

      if (question.toLowerCase() === "exit") {
        console.log("Goodbye!");
        break;
      }

      if (!question.trim()) {
        continue;
      }

      try {
        console.log("\nChatbot: Thinking...");
        const answer = await chatbot.ask(question);
        console.log(`\nChatbot: ${answer}`);
      } catch (error) {
        console.error("Error:", error);
      }
    }
  } catch (error) {
    console.error("Error loading PDF:", error);
  } finally {
    rl.close();
  }
}

main();
