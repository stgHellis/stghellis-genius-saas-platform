import * as z from "zod";

export const formSchema = z.object({
  prompt: z.string().min(1, {
    message: "First Prompt is required.",
  }),
  prompt2: z.string().min(1, {
    message: "Second Prompt is required.",
  }),
  amount: z.string().min(1),
  resolution: z.string().min(1),
  model: z.string().min(1),
});

export const modelOptions = [
  {
    value: "dall-e-2",
    label: "DALL-E 2 (Rapide)",
  },
  {
    value: "dall-e-3",
    label: "DALL-E 3 (Haute qualité)",
  }
];

// Possibilité de choisir une photo parmis celles générées
export const amountOptions = [
  {
    value: "1",
    label: "1 Photo",
  },
  {
    value: "2",
    label: "2 Photos",
  },
  {
    value: "3",
    label: "3 Photos",
  },
  {
    value: "4",
    label: "4 Photos",
  },
  {
    value: "5",
    label: "5 Photos",
  },
];

// Choix des résolutions
export const resolutionOptions = [
  {
    value: "256x256",
    label: "256x256 (Petite)",
  },
  {
    value: "512x512",
    label: "512x512 (Moyenne)",
  },
  {
    value: "1024x1024",
    label: "1024x1024 (Haute qualité)",
  },
  {
    value: "1024x1792",
    label: "1024x1792 (Portrait)",
  },
  {
    value: "1792x1024",
    label: "1792x1024 (Paysage)",
  },
];
