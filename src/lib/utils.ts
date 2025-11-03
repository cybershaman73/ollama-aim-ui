import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const conneckitTheme = {
  "--ck-body-background": "oklch(0.129 0.042 264.695)",
  "--ck-body-color": "oklch(0.696 0.17 162.48)",
  "--ck-secondary-button-background": "oklch(0.129 0.042 264.695)",
  "--ck-secondary-button-color": "oklch(0.696 0.17 162.48)",
  "--ck-secondary-button-hover-background": "oklch(0.279 0.041 260.031)",
  "--ck-primary-button-background": "oklch(0.129 0.042 264.695)",
  "--ck-primary-button-color": "oklch(0.696 0.17 162.48)",
  "--ck-primary-button-hover-background": "oklch(0.279 0.041 260.031)",
  "--ck-terciary-button-background": "oklch(0.129 0.042 264.695)",
  "--ck-terciary-button-color": "oklch(0.696 0.17 162.48)",
  "--ck-terciary-button-hover-background": "oklch(0.279 0.041 260.031)",
  "--ck-tooltip-background": "oklch(0.129 0.042 264.695)",
};

export function parseQWQ2Response(rawResponse: string) {
  // Look for the thinking section which is enclosed in </think> tags
  const thinkPattern = /<think>([\s\S]*?)<\/think>/;
  // Or in this case the \n</think>\n pattern
  // const alternatePattern = /\n<\/think>\n/;

  // Check if the response has a thinking section
  const thinkMatch = rawResponse.match(thinkPattern);

  if (thinkMatch) {
    // Extract the thinking part
    const thinking = thinkMatch[1];

    // Remove the thinking section from the response
    const cleanResponse = rawResponse.replace(thinkPattern, "");

    return {
      thinking,
      response: cleanResponse.trim(),
    };
  } else if (rawResponse.includes("\n</think>\n")) {
    // Handle the case where the thinking section doesn't use proper tags
    const parts = rawResponse.split("\n</think>\n");
    const thinking = parts[0].replace(/^.*?think>/, ""); // Remove any opening think tag

    return {
      thinking,
      response: parts[1].trim(),
    };
  } else {
    // If no thinking section is found, return the raw response
    return {
      thinking: null,
      response: rawResponse.trim(),
    };
  }
}
export const addTrailingSlash = (str: string): string => {
  // Check if string already ends with a slash
  return str.endsWith("/") ? str : str + "/";
};
export function validURLChecker(str: string) {
  const pattern = new RegExp(
    "^https?:\\/\\/" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator
  return !!pattern.test(str);
}
