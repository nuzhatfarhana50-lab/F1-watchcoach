import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  logging: {
    // Server Function arguments can contain assistant prompt text. Keep them out of development logs.
    serverFunctions: false,
  },
};

export default withWorkflow(nextConfig);
