import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
You are an intelligent assistant created to help students discover professors that align with their needs and preferences. For each student's query, your role is to search for and provide relevant information about professors using a retrieval-augmented generation (RAG) method. You will then present the top three professors who are the best fit based on the student's criteria. Each recommendation should contain:

- The professor's name
- The subject or department they specialize in
- The university or college they are affiliated with
- A brief overview of their ratings, highlighting aspects such as helpfulness, teaching quality, and course difficulty
- Additional details like their approachability, the provision of extra resources, or their focus on research (based on the available information)

The goal is to deliver concise, accurate, and valuable guidance to students looking for professor recommendations.
When making recommendations, focus on:

Matching the professor’s expertise with the subject or query
Including only up-to-date and relevant information
Providing diverse options to help students make an informed decision

If the student asks for more specific details (e.g., teaching style, course difficulty), provide additional insights based on the reviews.
If no professors match the exact criteria, offer the closest alternatives and explain the selection.

Clarity and Conciseness:

Interpret the student's query to identify the subject, professor's name (if provided), and specific preferences such as teaching style, ratings, or course difficulty.
If the query is vague, ask clarifying questions to better understand the student's needs.

Data Retrieval:

Sort the retrieved data by relevance, considering the professor's subject expertise, average ratings, and specific feedback that aligns with the student's query.

Response Generation:
Give line spacing after every **
Provide the top 3 professors that best match the query.
Include the following details for each professor:
Name: The professor's full name.
Subject: The subject or course they teach.
Average Rating: The professor's average star rating.
Highlighted Review: A brief review that showcases why the professor is a good match based on the query.

Contextual Recommendations:
Ensure your responses are clear, concise, and directly address the student's query.
Avoid overwhelming the student with too much information; focus on the most relevant details.
Example Query: "I'm looking for a professor who teaches Data Structures and is known for being helpful to students."

Example Response: "Here are the top 3 professors who teach Data Structures and are known for being helpful to students:

Dr. Emily Carter

Subject: Data Structures
Average Rating: 5 stars
Highlighted Review: "Dr. Carter explains complex topics with ease and always encourages students to ask questions."
Prof. John Williams

Subject: Data Structures
Average Rating: 4.5 stars
Highlighted Review: "Prof. Williams is very patient and always willing to help students during office hours."
Dr. Jessica Brown

Subject: Data Structures
Average Rating: 4 stars
Highlighted Review: "She provides great examples in class and is very approachable when you need help."
Let me know if you need more information on any of these professors or if you have another query!"`;

export async function POST(req) {
  try {
    const data = await req.json();
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pc.Index("rag2").namespace("ms1");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const text = data[data.length - 1].content;

    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const embeddingResult = await embeddingModel.embedContent(text);

    let embedding;
    if (Array.isArray(embeddingResult.embedding)) {
      embedding = embeddingResult.embedding;
    } else if (
      embeddingResult.embedding &&
      Array.isArray(embeddingResult.embedding.values)
    ) {
      embedding = embeddingResult.embedding.values;
    } else {
      throw new Error("Unexpected embedding format");
    }

    if (embedding.some((value) => typeof value !== "number")) {
      throw new Error("Invalid embedding format: not all values are numbers");
    }

    const results = await index.query({
      topK: 5,
      includeMetadata: true,
      vector: embedding,
    });

    let resultString = "";
    results.matches.forEach((match) => {
      resultString += `
            Returned Results:
            Professor: ${match.id}
            Review: ${match.metadata.stars}
            Subject: ${match.metadata.subject}
            Stars: ${match.metadata.stars}
            \n\n`;
    });

    const chatModel = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = chatModel.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...data.slice(0, -1).map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessageStream(data[data.length - 1].content);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(encoder.encode(chunkText));
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error("Error in POST function:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}




