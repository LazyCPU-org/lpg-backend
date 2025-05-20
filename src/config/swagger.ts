import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "LPG business backend",
      version: "1.0.0",
      description:
        "A simple Express API with documentation regarding the functional needs for a GLP delivery system",
    },
    servers: [
      {
        url: "http://localhost:5000/v1",
        description: "Development server V1",
      },
      {
        url: "/", // Relative URL for production
        description: "Production server",
      },
    ],
    // Security schemes if you're using authentication
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  // Path to the API docs
  // Look for JSDoc comments in these files
  apis: [
    "./src/routes/*.ts", // Include all TypeScript files in src directory
    "./src/db/schemas/**/*.ts", // Include all TypeScript files in src directory
    "./src/interfaces/**/*.ts",
    "./src/dtos/**/*.ts",
    "./app.ts", // Include the main app file], // Adjust this path based on your project structure
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
