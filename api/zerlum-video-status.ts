import { handleZerlumVideoStatus } from "./_zerlum-server.js";

export const config = {
  maxDuration: 30,
};

export default async function handler(request: any, response: any) {
  await handleZerlumVideoStatus(request, response);
}
