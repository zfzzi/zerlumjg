import { handleZerlumAgent } from "./_zerlum-server.js";

export const config = {
  maxDuration: 300,
};

export default async function handler(request: any, response: any) {
  await handleZerlumAgent(request, response);
}
