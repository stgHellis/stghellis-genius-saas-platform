"use client";

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

export const CrispChat = () => {
  useEffect(() => {
    Crisp.configure("e915a94a-6ab1-4059-a50b-53b76a285ba0"); // Obtenu sur le site de crisp.chat
  }, []);

  return null;
};
