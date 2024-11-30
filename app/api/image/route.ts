import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { prompt, prompt2, amount = 1, resolution = "1024x1024", model = "dall-e-2"} = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!openai.apiKey) {
      return new NextResponse("OpenAI API Key not configured.", {
        status: 500,
      });
    }

    if (!prompt && !prompt2) {
      return new NextResponse("At least one prompt is required", { status: 400 });
    }

    if (!amount) {
      return new NextResponse("Amount is required", { status: 400 });
    }

    if (!resolution) {
      return new NextResponse("Resolution is required", { status: 400 });
    }

    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();

    if (!freeTrial && !isPro) {
      return new NextResponse(
        "Free trial has expired. Please upgrade to pro.",
        { status: 403 }
      );
    }

    // Générer les images pour le premier prompt
    const response = await openai.images.generate({
      prompt,
      n: parseInt(amount, 10),
      size: resolution,
      model: model,
      quality: model === "dall-e-3" ? "hd" : "standard",
    });

    let data = response.data;

    // Si un second prompt est fourni, générer les images correspondantes
    if (prompt2) {
      const response2 = await openai.images.generate({
        prompt: prompt2,
        n: parseInt(amount, 10),
        size: resolution,
        model: model,
        quality: model === "dall-e-3" ? "hd" : "standard",
      });
      data = [...data, ...response2.data];
    }

    if (!isPro) {
      // Incrémenter deux fois si deux prompts ont été utilisés
      await incrementApiLimit();
      if (prompt2) {
        await incrementApiLimit();
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.log("[IMAGE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
